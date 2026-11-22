/**
 * Cloudflare Worker for atlasos.net.
 *
 * Static assets are served by the platform. The Worker negotiates Markdown for docs
 * and serves Windows ISO links to clients such as
 * Atlas Manager:
 *
 *   GET /api/ms-iso/skus?arch=x64|arm64&sessionId=…   → language list proxied from Microsoft
 *   GET /api/ms-iso/links?arch=x64|arm64&skuId=…      → signed ISO URL resolved with Browser Run
 *
 * An hourly Cron Trigger (`scheduled`) re-resolves cached links shortly before they expire: for
 * languages requested in the last few days, and always for English (United States).
 *
 * Binding types (`Env`) are generated from wrangler.jsonc by `wrangler types`.
 */
import Negotiator from 'negotiator';
import puppeteer, { type Browser, type BrowserContext, type Page } from '@cloudflare/puppeteer';

const MS_CONNECTOR_BASE = 'https://www.microsoft.com/software-download-connector/api';
const MS_PROFILE_ID = '606624d44113';
const MS_API_TIMEOUT_MS = 12_000;

const BROWSER_RETRY_ATTEMPTS = 3;
const BROWSER_RETRY_BACKOFF_MS = 400;
/** Browser launches are rate limited per account (3 per second on Workers Paid). */
const BROWSER_RATE_LIMIT_BACKOFF_MS = 1_000;
/** How long a shared browser outlives its last client, waiting to be reused. */
const BROWSER_KEEP_ALIVE_MS = 60_000;
/** Resolutions sharing one browser at a time; each holds its own browser context. */
const BROWSER_MAX_CONTEXTS = 4;
const BROWSER_NAVIGATION_TIMEOUT_MS = 60_000;
const BROWSER_STEP_TIMEOUT_MS = 30_000;
const BROWSER_LINK_TIMEOUT_MS = 45_000;
const BROWSER_NETWORK_IDLE_MS = 750;
const BROWSER_ANTI_BOT_SETTLE_MS = 1500;

/** Microsoft ISO links expire 24 hours after creation; reuse them until just before then. */
const LINK_CACHE_TTL_SECONDS = 23 * 60 * 60;
const LINK_CACHE_PREFIX = 'ms-iso:';
/** A resolution that failed every retry is not attempted again for this long. */
const FAILURE_CACHE_TTL_SECONDS = 5 * 60;
const SKU_CACHE_TTL_SECONDS = 6 * 60 * 60;
/** KV rejects expirations less than 60 seconds away. */
const KV_MIN_REMAINING_MS = 2 * 60 * 1000;
const SKU_ID_PATTERN = /^\d{1,10}$/;

/** Hourly runs refresh links expiring within this window, so each link gets two tries. */
const REFRESH_WINDOW_MS = 2 * 60 * 60 * 1000;
/** Only languages requested within this period are refreshed, so one-off requests age out. */
const REFRESH_REQUESTED_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;
/** Cache hits record a request at most this often, to keep KV writes down. */
const REQUESTED_AT_GRANULARITY_MS = 24 * 60 * 60 * 1000;
/**
 * No new resolution starts after this point of a cron run. One attempt that hits every browser
 * timeout takes about 4 minutes, which still ends inside the 15-minute wall-clock limit.
 */
const REFRESH_TIME_BUDGET_MS = 10 * 60 * 1000;
/** Kept warm for both architectures; matched against `LocalizedLanguage` in Microsoft's SKU list. */
const WARM_LANGUAGE = 'English (United States)';

const ARCHITECTURES = {
  x64: {
    productId: 3813, // Windows 11 26H2
    downloadPage: 'https://www.microsoft.com/en-us/software-download/windows11',
    linkText: '64-bit Download',
  },
  arm64: {
    productId: 3816, // Windows 11 26H2 ARM64
    downloadPage: 'https://www.microsoft.com/en-us/software-download/windows11arm64',
    linkText: 'ARM64 Download',
  },
} as const;

type Arch = keyof typeof ARCHITECTURES;

/**
 * Desktop Chrome UA, matching the Chrome release Browser Run ships (152 with @cloudflare/puppeteer 2),
 * so the header agrees with the engine's own client hints. Bump it when Browser Run moves Chrome.
 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

const ALLOWED_ORIGINS = new Set(['https://atlasos.net', 'https://www.atlasos.net']);

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

type LogDetails = Record<string, string | number | boolean | null>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logWarning(message: string, details: LogDetails): void {
  console.warn(JSON.stringify({ level: 'warn', message, ...details }));
}

function logError(message: string, details: LogDetails): void {
  console.error(JSON.stringify({ level: 'error', message, ...details }));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
}

/** JSON response for short-lived data: never cached by browsers or the edge. */
function json(body: BodyInit, request: Request, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

function jsonError(message: string, request: Request, status = 400): Response {
  return json(JSON.stringify({ error: message }), request, status);
}

/** Mirrors Microsoft's own error envelope so clients handle both the same way. */
function linkErrorBody(error: string): string {
  return JSON.stringify({
    Errors: [{ Key: 'ErrorSettings.BrowserRenderingFailed', Value: error, Type: 9 }],
  });
}

function linksBody(href: string, label: string): string {
  return JSON.stringify({
    ProductDownloadOptions: [
      { Uri: href, ProductDisplayName: 'Windows 11 ISO', LocalizedLanguage: label },
    ],
  });
}

function parseArch(value: string | null, fallback?: Arch): Arch | null {
  if (value === null && fallback) return fallback;
  return value === 'x64' || value === 'arm64' ? value : null;
}

/* ------------------------------------------------------------------------- */
/* Microsoft download connector                                              */
/* ------------------------------------------------------------------------- */

type SkuResponse = { ok: true; body: string } | { ok: false; error: string };
type Sku = { id: string; language: string };
type SkuList = { ok: true; skus: Sku[] } | { ok: false; error: string };

async function requestSkus(arch: Arch, sessionId: string): Promise<SkuResponse> {
  const { productId, downloadPage } = ARCHITECTURES[arch];

  const url = new URL(`${MS_CONNECTOR_BASE}/getskuinformationbyproductedition`);
  url.searchParams.set('profile', MS_PROFILE_ID);
  url.searchParams.set('ProductEditionId', String(productId));
  url.searchParams.set('SKU', 'undefined');
  url.searchParams.set('friendlyFileName', 'undefined');
  url.searchParams.set('Locale', 'en-US');
  url.searchParams.set('sessionID', sessionId);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(MS_API_TIMEOUT_MS),
      headers: {
        // Mimic a real browser request so Microsoft's API doesn't block us.
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: downloadPage,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return {
      ok: false,
      error: timedOut
        ? 'Microsoft download API timed out.'
        : 'Failed to reach Microsoft download API.',
    };
  }

  if (!upstream.ok) {
    return { ok: false, error: `Microsoft API returned HTTP ${upstream.status}.` };
  }

  const body = await upstream.text();
  try {
    JSON.parse(body);
  } catch {
    return { ok: false, error: 'Microsoft API returned an unexpected response.' };
  }

  return { ok: true, body };
}

/**
 * The SKU list for `arch`, cached in KV so validating a request usually costs one read.
 * The connector only needs some session id, like the random one clients send to `/skus`.
 */
async function getSkus(env: Env, arch: Arch): Promise<SkuList> {
  const key = `ms-iso-skus:${arch}:${ARCHITECTURES[arch].productId}`;
  try {
    const cached = await env.MS_ISO_LINKS.get<Sku[]>(key, 'json');
    if (cached?.length) return { ok: true, skus: cached };
  } catch (error) {
    logWarning('Ignoring unreadable cached SKU list.', { key, error: errorMessage(error) });
  }

  const response = await requestSkus(arch, crypto.randomUUID());
  if (!response.ok) return response;

  const { Skus } = JSON.parse(response.body) as {
    Skus?: { Id?: string | number; LocalizedLanguage?: string }[];
  };
  const skus = (Array.isArray(Skus) ? Skus : [])
    .map(sku => ({ id: String(sku.Id), language: sku.LocalizedLanguage ?? '' }))
    .filter(sku => SKU_ID_PATTERN.test(sku.id));
  // Microsoft reports some failures inside a 200 response; an empty list must not be cached.
  if (skus.length === 0) return { ok: false, error: 'Microsoft API returned no languages.' };

  await env.MS_ISO_LINKS.put(key, JSON.stringify(skus), {
    expirationTtl: SKU_CACHE_TTL_SECONDS,
  }).catch((error: unknown) =>
    logWarning('Could not write SKU list to KV.', { key, error: errorMessage(error) }),
  );
  return { ok: true, skus };
}

/* ------------------------------------------------------------------------- */
/* Browser Run: resolve the signed ISO link                                  */
/* ------------------------------------------------------------------------- */

type LinkResult = { ok: true; href: string; label: string } | { ok: false; error: string };

/** One browser for a series of resolutions, reconnected if Browser Run drops the session. */
type BrowserLease = { get(): Promise<Browser>; release(): Promise<void> };

/** `@cloudflare/puppeteer` reports Browser Run's HTTP status only inside the error message. */
function isRateLimited(message: string): boolean {
  return /\bcode: 429\b/.test(message);
}

async function hasSpareCapacity(browser: Browser): Promise<boolean> {
  const client = await browser.target().createCDPSession();
  try {
    const { browserContextIds } = await client.send('Target.getBrowserContexts');
    return browserContextIds.length < BROWSER_MAX_CONTEXTS;
  } finally {
    await client.detach().catch(() => {});
  }
}

async function listSessionIds(env: Env): Promise<string[]> {
  try {
    const sessions = await puppeteer.sessions(env.BROWSER);
    // A random starting point spreads concurrent requests across sessions.
    const start = Math.floor(Math.random() * sessions.length);
    return [...sessions.slice(start), ...sessions.slice(0, start)].map(
      session => session.sessionId,
    );
  } catch (error) {
    logWarning('Could not list Browser Run sessions.', { error: errorMessage(error) });
    return [];
  }
}

/** Joins a running browser with spare capacity, launching one only when none has room. */
async function connectBrowser(env: Env): Promise<Browser> {
  for (const sessionId of await listSessionIds(env)) {
    let candidate: Browser | undefined;
    try {
      candidate = await puppeteer.connect(env.BROWSER, sessionId);
      if (await hasSpareCapacity(candidate)) return candidate;
    } catch (error) {
      // A listed session can close before we reach it.
      logWarning('Skipping Browser Run session.', { sessionId, error: errorMessage(error) });
    }
    await candidate?.disconnect().catch(() => {});
  }
  return puppeteer.launch(env.BROWSER, { keep_alive: BROWSER_KEEP_ALIVE_MS });
}

function leaseBrowser(env: Env): BrowserLease {
  let browser: Browser | undefined;
  return {
    async get() {
      if (!browser?.connected) browser = await connectBrowser(env);
      return browser;
    },
    async release() {
      const current = browser;
      browser = undefined;
      // Never close(): other requests may share this browser, and close() ends it for all of them.
      await current
        ?.disconnect()
        .catch((error: unknown) =>
          logWarning('Could not disconnect from Browser Run.', { error: errorMessage(error) }),
        );
    },
  };
}

async function settleNetwork(page: Page): Promise<void> {
  // Best effort: the DOM waits that follow decide whether the flow actually succeeded.
  await page
    .waitForNetworkIdle({ idleTime: BROWSER_NETWORK_IDLE_MS, timeout: BROWSER_STEP_TIMEOUT_MS })
    .catch(() => {});
}

/** Select the `<select>` option whose value equals or contains `needle`, then press the last "Confirm" button. */
async function chooseOptionAndConfirm(page: Page, needle: string): Promise<void> {
  const hasOption = (value: string) =>
    [...document.querySelectorAll('select')].some(select =>
      [...select.options].some(option => option.value === value || option.value.includes(value)),
    );

  await page.waitForFunction(hasOption, { timeout: BROWSER_STEP_TIMEOUT_MS }, needle);

  await page.evaluate(value => {
    const select = [...document.querySelectorAll('select')].find(candidate =>
      [...candidate.options].some(option => option.value === value || option.value.includes(value)),
    );
    const option =
      select && [...select.options].find(o => o.value === value || o.value.includes(value));
    if (!select || !option) return;

    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));

    const confirmButtons = [...document.querySelectorAll('button')].filter(
      button => button.textContent?.trim() === 'Confirm',
    );
    confirmButtons.at(-1)?.click();
  }, needle);

  await settleNetwork(page);
}

async function resolveIsoLinkOnce(
  lease: BrowserLease,
  arch: Arch,
  skuId: string,
): Promise<LinkResult> {
  const { productId, downloadPage, linkText } = ARCHITECTURES[arch];

  // Microsoft's Sentinel fingerprinting only hands out signed URLs to a real browser session.
  let context: BrowserContext | undefined;

  try {
    const browser = await lease.get();
    // A fresh incognito context per resolution keeps Microsoft's cookies apart in a shared browser.
    context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultTimeout(BROWSER_STEP_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(BROWSER_NAVIGATION_TIMEOUT_MS);

    await page.setUserAgent({ userAgent: USER_AGENT });
    await page.setViewport({ width: 1365, height: 900 });
    await page.goto(downloadPage, { waitUntil: 'domcontentloaded' });
    await sleep(BROWSER_ANTI_BOT_SETTLE_MS);

    await chooseOptionAndConfirm(page, String(productId));
    // Language option values are JSON blobs containing the SKU id.
    await chooseOptionAndConfirm(page, `"id":"${skuId}"`);

    const findLink = (text: string) =>
      [...document.querySelectorAll('a')].find(
        anchor => anchor.textContent?.includes(text) && anchor.href,
      )?.href ?? null;

    await page.waitForFunction(findLink, { timeout: BROWSER_LINK_TIMEOUT_MS }, linkText);
    const href = await page.evaluate(findLink, linkText);

    if (!href) return { ok: false, error: 'Microsoft page did not expose a download link.' };
    return { ok: true, href, label: linkText };
  } catch (error) {
    return { ok: false, error: errorMessage(error) || 'Browser Rendering failed.' };
  } finally {
    // Closing the context closes its pages; a leftover one would hold capacity in the shared browser.
    await context
      ?.close()
      .catch((error: unknown) =>
        logWarning('Could not close Browser Run context.', { error: errorMessage(error) }),
      );
  }
}

/** Retries with backoff. Callers release the lease; `deadline` stops retries late in a cron run. */
async function resolveIsoLink(
  lease: BrowserLease,
  arch: Arch,
  skuId: string,
  deadline = Number.POSITIVE_INFINITY,
): Promise<LinkResult> {
  let lastError = 'Browser Rendering failed.';

  for (let attempt = 0; attempt < BROWSER_RETRY_ATTEMPTS; attempt += 1) {
    const result = await resolveIsoLinkOnce(lease, arch, skuId);
    if (result.ok) return result;

    lastError = result.error;
    // The next attempt picks a session afresh instead of reusing the browser that just failed.
    await lease.release();
    if (attempt === BROWSER_RETRY_ATTEMPTS - 1 || Date.now() >= deadline) break;

    // Microsoft pages can be flaky to render under load; back off a little more each time.
    const backoff = BROWSER_RETRY_BACKOFF_MS + attempt * 350;
    await sleep(
      isRateLimited(lastError) ? Math.max(backoff, BROWSER_RATE_LIMIT_BACKOFF_MS) : backoff,
    );
  }

  return { ok: false, error: lastError };
}

/* ------------------------------------------------------------------------- */
/* KV cache: globally replicated, unlike the per-colo Cache API              */
/* ------------------------------------------------------------------------- */

/**
 * Stored with each cached link. `getWithMetadata` doesn't return the expiration, so it lives here
 * too. `requestedAt` is 0 when the cron seeded the entry without a user request.
 */
type LinkMetadata = { requestedAt: number; expiresAt: number };
type CachedLinks = { value: string; metadata: LinkMetadata | null };
type CachedEntry = KVNamespaceListKey<LinkMetadata>;

function linkCacheKey(arch: Arch, skuId: string): string {
  return `ms-iso:${arch}:${skuId}`;
}

function failureCacheKey(arch: Arch, skuId: string): string {
  return `ms-iso-failed:${arch}:${skuId}`;
}

function parseLinkCacheKey(key: string): { arch: Arch; skuId: string } | null {
  const [, arch = null, skuId = ''] = /^ms-iso:([^:]+):(.+)$/.exec(key) ?? [];
  const parsedArch = parseArch(arch);
  return parsedArch && SKU_ID_PATTERN.test(skuId) ? { arch: parsedArch, skuId } : null;
}

function newLinkMetadata(requestedAt: number): LinkMetadata {
  return { requestedAt, expiresAt: Date.now() + LINK_CACHE_TTL_SECONDS * 1000 };
}

async function readCachedLinks(env: Env, key: string): Promise<CachedLinks | null> {
  try {
    const { value, metadata } = await env.MS_ISO_LINKS.getWithMetadata<LinkMetadata>(key);
    if (!value) return null;
    JSON.parse(value);
    return { value, metadata };
  } catch (error) {
    logWarning('Ignoring unreadable cached ISO links.', { key, error: errorMessage(error) });
    return null;
  }
}

async function putLinks(
  env: Env,
  key: string,
  value: string,
  metadata: LinkMetadata,
): Promise<void> {
  // An absolute expiration lets a metadata update keep the entry's remaining lifetime.
  await env.MS_ISO_LINKS.put(key, value, {
    expiration: Math.floor(metadata.expiresAt / 1000),
    metadata,
  });
}

function cacheLinks(
  env: Env,
  ctx: ExecutionContext,
  key: string,
  value: string,
  metadata: LinkMetadata,
): void {
  ctx.waitUntil(
    putLinks(env, key, value, metadata).catch((error: unknown) =>
      logWarning('Could not write ISO links to KV.', { key, error: errorMessage(error) }),
    ),
  );
}

/** Counts a cache hit as a request, at most daily, without extending the entry's lifetime. */
function markRequested(env: Env, ctx: ExecutionContext, key: string, cached: CachedLinks): void {
  const { metadata } = cached;
  const now = Date.now();
  // Entries written before request tracking have no metadata; they expire and are rewritten.
  if (!metadata || now - metadata.requestedAt < REQUESTED_AT_GRANULARITY_MS) return;
  if (metadata.expiresAt - now < KV_MIN_REMAINING_MS) return;
  cacheLinks(env, ctx, key, cached.value, { ...metadata, requestedAt: now });
}

async function readCachedFailure(env: Env, key: string): Promise<string | null> {
  return env.MS_ISO_LINKS.get(key).catch((error: unknown) => {
    logWarning('Could not read cached ISO link failure.', { key, error: errorMessage(error) });
    return null;
  });
}

function cacheFailure(env: Env, ctx: ExecutionContext, key: string, error: string): void {
  ctx.waitUntil(
    env.MS_ISO_LINKS.put(key, error, { expirationTtl: FAILURE_CACHE_TTL_SECONDS }).catch(
      (writeError: unknown) =>
        logWarning('Could not write ISO link failure to KV.', {
          key,
          error: errorMessage(writeError),
        }),
    ),
  );
}

async function handleLinks(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const arch = parseArch(url.searchParams.get('arch'), 'x64');
  if (!arch) return jsonError('Invalid architecture. Use x64 or arm64.', request);

  const skuId = url.searchParams.get('skuId');
  if (!skuId) return jsonError('Missing skuId parameter.', request);
  if (!SKU_ID_PATTERN.test(skuId)) return jsonError('Invalid skuId parameter.', request);

  const cacheKey = linkCacheKey(arch, skuId);
  const cached = await readCachedLinks(env, cacheKey);
  if (cached) {
    markRequested(env, ctx, cacheKey, cached);
    return json(cached.value, request);
  }

  const failureKey = failureCacheKey(arch, skuId);
  const cachedFailure = await readCachedFailure(env, failureKey);
  if (cachedFailure !== null) return json(linkErrorBody(cachedFailure), request);

  // Validate before spending any Browser Run time on the request.
  const skus = await getSkus(env, arch);
  if (!skus.ok) return jsonError(skus.error, request, 502);
  if (!skus.skus.some(sku => sku.id === skuId)) {
    return jsonError('Unknown skuId for this architecture.', request);
  }

  const lease = leaseBrowser(env);
  let result: LinkResult;
  try {
    result = await resolveIsoLink(lease, arch, skuId);
  } finally {
    await lease.release();
  }

  if (!result.ok) {
    // A rate limit is about account capacity, not this SKU, so it isn't remembered.
    if (!isRateLimited(result.error)) cacheFailure(env, ctx, failureKey, result.error);
    return json(linkErrorBody(result.error), request);
  }

  const body = linksBody(result.href, result.label);
  cacheLinks(env, ctx, cacheKey, body, newLinkMetadata(Date.now()));

  return json(body, request);
}

async function handleSkus(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const arch = parseArch(url.searchParams.get('arch'));
  if (!arch) return jsonError('Invalid architecture. Use x64 or arm64.', request);

  const sessionId = url.searchParams.get('sessionId') ?? crypto.randomUUID();
  const response = await requestSkus(arch, sessionId);
  return response.ok ? json(response.body, request) : jsonError(response.error, request, 502);
}

/* ------------------------------------------------------------------------- */
/* Cron: refresh cached links before they expire                             */
/* ------------------------------------------------------------------------- */

type RefreshTarget = { arch: Arch; skuId: string; requestedAt: number };

async function listCachedLinks(env: Env): Promise<CachedEntry[]> {
  const entries: CachedEntry[] = [];
  let cursor: string | undefined;
  do {
    const batch = await env.MS_ISO_LINKS.list<LinkMetadata>({ prefix: LINK_CACHE_PREFIX, cursor });
    entries.push(...batch.keys);
    cursor = batch.list_complete ? undefined : batch.cursor;
  } while (cursor);
  return entries;
}

function isDue(entry: CachedEntry | undefined, now: number): boolean {
  const expiresAt = entry?.expiration ? entry.expiration * 1000 : entry?.metadata?.expiresAt;
  return expiresAt === undefined || expiresAt - now <= REFRESH_WINDOW_MS;
}

async function findRefreshTargets(
  env: Env,
  failures: string[],
): Promise<Map<string, RefreshTarget>> {
  const now = Date.now();
  const cached = new Map((await listCachedLinks(env)).map(entry => [entry.name, entry]));
  const targets = new Map<string, RefreshTarget>();

  // English goes first so it is never what the deadline cuts off.
  for (const arch of Object.keys(ARCHITECTURES) as Arch[]) {
    const skus = await getSkus(env, arch);
    const skuId = skus.ok ? skus.skus.find(sku => sku.language === WARM_LANGUAGE)?.id : undefined;
    if (!skuId) {
      failures.push(`${arch}:${WARM_LANGUAGE}`);
      logError('Could not find the SKU to keep warm.', {
        arch,
        language: WARM_LANGUAGE,
        error: skus.ok ? 'Language not listed.' : skus.error,
      });
      continue;
    }

    const key = linkCacheKey(arch, skuId);
    const entry = cached.get(key);
    if (isDue(entry, now)) {
      targets.set(key, { arch, skuId, requestedAt: entry?.metadata?.requestedAt ?? 0 });
    }
  }

  for (const [key, entry] of cached) {
    const parsed = parseLinkCacheKey(key);
    const requestedAt = entry.metadata?.requestedAt;
    if (!parsed || requestedAt === undefined || targets.has(key)) continue;
    if (now - requestedAt <= REFRESH_REQUESTED_WITHIN_MS && isDue(entry, now)) {
      targets.set(key, { ...parsed, requestedAt });
    }
  }

  return targets;
}

/** Resolves due links one at a time in one shared browser, each in its own context. */
async function refreshCachedLinks(env: Env): Promise<void> {
  const deadline = Date.now() + REFRESH_TIME_BUDGET_MS;
  const failures: string[] = [];
  const targets = [...(await findRefreshTargets(env, failures))];
  const lease = leaseBrowser(env);

  try {
    for (const [index, [key, { arch, skuId, requestedAt }]] of targets.entries()) {
      if (Date.now() >= deadline) {
        logWarning('ISO link refresh ran out of time.', { skipped: targets.length - index });
        break;
      }

      const result = await resolveIsoLink(lease, arch, skuId, deadline);
      try {
        if (!result.ok) throw new Error(result.error);
        await putLinks(
          env,
          key,
          linksBody(result.href, result.label),
          newLinkMetadata(requestedAt),
        );
      } catch (error) {
        failures.push(key);
        logError('Could not refresh ISO link.', { key, error: errorMessage(error) });
      }
    }
  } finally {
    await lease.release();
  }

  // Throwing marks the run as failed in Cron Events and Workers Logs.
  if (failures.length > 0) {
    throw new Error(`Could not refresh ${failures.length} ISO link(s): ${failures.join(', ')}`);
  }
}

/** Canonical article URLs can serve either representation. Asset URLs keep their normal cache keys. */
async function serveDocs(request: Request, assets: Env['ASSETS']): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/') || !['GET', 'HEAD'].includes(request.method)) {
    return assets.fetch(request);
  }

  const accept = request.headers.get('Accept') ?? '*/*';
  const preferred = new Negotiator({ headers: { accept } }).mediaType([
    'text/html',
    'text/markdown',
  ]);
  let asset;
  if (preferred === 'text/markdown') {
    const markdownUrl = new URL(url);
    markdownUrl.pathname =
      url.pathname === '/docs/' ? '/docs/index.md' : url.pathname.slice(0, -1) + '.md';
    const markdown = await assets.fetch(new Request(markdownUrl, request));
    // Old guide URLs still need their redirects, and missing pages retain their HTTP status.
    if (markdown.ok || markdown.status === 304) asset = markdown;
  }
  asset ??= await assets.fetch(request);
  const response = new Response(asset.body, asset);
  response.headers.append('Vary', 'Accept');
  return response;
}

/* ------------------------------------------------------------------------- */
/* Entry point                                                               */
/* ------------------------------------------------------------------------- */

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith('/docs/')) return serveDocs(request, env.ASSETS);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, OPTIONS', ...corsHeaders(request) },
      });
    }

    switch (new URL(request.url).pathname) {
      case '/api/ms-iso/skus':
        return handleSkus(request);
      case '/api/ms-iso/links':
        return handleLinks(request, env, ctx);
      default:
        return env.ASSETS.fetch(request);
    }
  },

  async scheduled(_controller, env) {
    await refreshCachedLinks(env);
  },
} satisfies ExportedHandler<Env>;
