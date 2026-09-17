/**
 * Cloudflare Worker for atlasos.net.
 *
 * Static assets are served by the platform; this Worker only runs for `/api/*`
 * (see `run_worker_first` in wrangler.jsonc) and powers the Windows ISO downloader in the docs:
 *
 *   GET /api/ms-iso/skus?arch=x64|arm64&sessionId=…   → language list proxied from Microsoft
 *   GET /api/ms-iso/links?arch=x64|arm64&skuId=…      → signed ISO URL resolved with Browser Rendering
 *
 * Binding types (`Env`) are generated from wrangler.jsonc by `wrangler types`.
 */
import puppeteer, { type Browser, type Page } from '@cloudflare/puppeteer';

const MS_CONNECTOR_BASE = 'https://www.microsoft.com/software-download-connector/api';
const MS_PROFILE_ID = '606624d44113';
const MS_API_TIMEOUT_MS = 12_000;

const BROWSER_RETRY_ATTEMPTS = 3;
const BROWSER_RETRY_BACKOFF_MS = 400;
const BROWSER_KEEP_ALIVE_MS = 10_000;
const BROWSER_NAVIGATION_TIMEOUT_MS = 60_000;
const BROWSER_STEP_TIMEOUT_MS = 30_000;
const BROWSER_LINK_TIMEOUT_MS = 45_000;
const BROWSER_NETWORK_IDLE_MS = 750;
const BROWSER_ANTI_BOT_SETTLE_MS = 1500;

/** Microsoft ISO links expire 24 hours after creation; reuse them until just before then. */
const LINK_CACHE_TTL_SECONDS = 23 * 60 * 60;

const ARCHITECTURES = {
  x64: {
    productId: 3262, // Windows 11 25H2
    downloadPage: 'https://www.microsoft.com/en-us/software-download/windows11',
    linkText: '64-bit Download',
  },
  arm64: {
    productId: 3265, // Windows 11 25H2 ARM64
    downloadPage: 'https://www.microsoft.com/en-us/software-download/windows11arm64',
    linkText: 'ARM64 Download',
  },
} as const;

type Arch = keyof typeof ARCHITECTURES;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const ALLOWED_ORIGINS = new Set(['https://atlasos.net', 'https://www.atlasos.net']);

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logWarning(
  message: string,
  details: Record<string, string | number | boolean | null>,
): void {
  console.warn(JSON.stringify({ level: 'warn', message, ...details }));
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

function parseArch(value: string | null, fallback?: Arch): Arch | null {
  if (value === null && fallback) return fallback;
  return value === 'x64' || value === 'arm64' ? value : null;
}

/* ------------------------------------------------------------------------- */
/* Microsoft download connector                                              */
/* ------------------------------------------------------------------------- */

async function fetchSkus(arch: Arch, sessionId: string, request: Request): Promise<Response> {
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
    return jsonError(
      timedOut ? 'Microsoft download API timed out.' : 'Failed to reach Microsoft download API.',
      request,
      502,
    );
  }

  if (!upstream.ok) {
    return jsonError(`Microsoft API returned HTTP ${upstream.status}.`, request, 502);
  }

  const body = await upstream.text();
  try {
    JSON.parse(body);
  } catch {
    return jsonError('Microsoft API returned an unexpected response.', request, 502);
  }

  return json(body, request);
}

/* ------------------------------------------------------------------------- */
/* Browser Rendering: resolve the signed ISO link                            */
/* ------------------------------------------------------------------------- */

type LinkResult = { ok: true; href: string; label: string } | { ok: false; error: string };

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

async function resolveIsoLinkOnce(env: Env, arch: Arch, skuId: string): Promise<LinkResult> {
  const { productId, downloadPage, linkText } = ARCHITECTURES[arch];

  // Microsoft's Sentinel fingerprinting only hands out signed URLs to a real browser session.
  let browser: Browser | undefined;
  let page: Page | undefined;

  try {
    browser = await puppeteer.launch(env.BROWSER, { keep_alive: BROWSER_KEEP_ALIVE_MS });
    page = await browser.newPage();
    page.setDefaultTimeout(BROWSER_STEP_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(BROWSER_NAVIGATION_TIMEOUT_MS);

    await page.setUserAgent(USER_AGENT);
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
    await page
      ?.close()
      .catch(error =>
        logWarning('Could not close Browser Rendering page.', { error: errorMessage(error) }),
      );
    await browser
      ?.close()
      .catch(error =>
        logWarning('Could not close Browser Rendering session.', { error: errorMessage(error) }),
      );
  }
}

async function resolveIsoLink(env: Env, arch: Arch, skuId: string): Promise<LinkResult> {
  let lastError = 'Browser Rendering failed.';

  for (let attempt = 0; attempt < BROWSER_RETRY_ATTEMPTS; attempt += 1) {
    const result = await resolveIsoLinkOnce(env, arch, skuId);
    if (result.ok) return result;

    lastError = result.error;
    // Microsoft pages can be flaky to render under load; back off a little more each time.
    if (attempt < BROWSER_RETRY_ATTEMPTS - 1) await sleep(BROWSER_RETRY_BACKOFF_MS + attempt * 350);
  }

  return { ok: false, error: lastError };
}

/* ------------------------------------------------------------------------- */
/* KV cache: globally replicated, unlike the per-colo Cache API              */
/* ------------------------------------------------------------------------- */

async function readCachedLinks(env: Env, key: string): Promise<string | null> {
  try {
    const cached = await env.MS_ISO_LINKS.get(key);
    if (!cached) return null;
    JSON.parse(cached);
    return cached;
  } catch (error) {
    logWarning('Ignoring unreadable cached ISO links.', { key, error: errorMessage(error) });
    return null;
  }
}

function cacheLinks(env: Env, ctx: ExecutionContext, key: string, value: string): void {
  ctx.waitUntil(
    env.MS_ISO_LINKS.put(key, value, { expirationTtl: LINK_CACHE_TTL_SECONDS }).catch(error =>
      logWarning('Could not write ISO links to KV.', { key, error: errorMessage(error) }),
    ),
  );
}

async function handleLinks(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const arch = parseArch(url.searchParams.get('arch'), 'x64');
  if (!arch) return jsonError('Invalid architecture. Use x64 or arm64.', request);

  const skuId = url.searchParams.get('skuId');
  if (!skuId) return jsonError('Missing skuId parameter.', request);

  const cacheKey = `ms-iso:${arch}:${skuId}`;
  const cached = await readCachedLinks(env, cacheKey);
  if (cached) return json(cached, request);

  const result = await resolveIsoLink(env, arch, skuId);
  if (!result.ok) {
    // Mirrors Microsoft's own error envelope so the client handles both the same way.
    return json(
      JSON.stringify({
        Errors: [{ Key: 'ErrorSettings.BrowserRenderingFailed', Value: result.error, Type: 9 }],
      }),
      request,
    );
  }

  const body = JSON.stringify({
    ProductDownloadOptions: [
      { Uri: result.href, ProductDisplayName: 'Windows 11 ISO', LocalizedLanguage: result.label },
    ],
  });
  cacheLinks(env, ctx, cacheKey, body);

  return json(body, request);
}

async function handleSkus(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const arch = parseArch(url.searchParams.get('arch'));
  if (!arch) return jsonError('Invalid architecture. Use x64 or arm64.', request);

  const sessionId = url.searchParams.get('sessionId') ?? crypto.randomUUID();
  return fetchSkus(arch, sessionId, request);
}

/* ------------------------------------------------------------------------- */
/* Entry point                                                               */
/* ------------------------------------------------------------------------- */

export default {
  async fetch(request, env, ctx) {
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
} satisfies ExportedHandler<Env>;
