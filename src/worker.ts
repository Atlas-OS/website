import puppeteer, { type Browser, type BrowserWorker, type Page } from '@cloudflare/puppeteer';

type AssetsBinding = {
  fetch(request: Request): Response | Promise<Response>;
};

type KVNamespaceBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type WorkerHandler<TEnv> = {
  fetch(request: Request, env: TEnv, ctx: WorkerExecutionContext): Response | Promise<Response>;
};

export interface Env {
  ASSETS: AssetsBinding;
  /** Cloudflare Browser Rendering binding (wrangler.jsonc: browser.binding) */
  BROWSER?: BrowserWorker;
  /** KV store for ISO links (global replication). Create with: wrangler kv namespace create "MS_ISO_LINKS" */
  MS_ISO_LINKS?: KVNamespaceBinding;
}

const MS_CONNECTOR_BASE = 'https://www.microsoft.com/software-download-connector/api';
const MS_PROFILE_ID = '606624d44113';
const MS_API_TIMEOUT_MS = 12_000;
const BROWSER_RETRY_ATTEMPTS = 3;
const BROWSER_KEEP_ALIVE_MS = 10_000;
const BROWSER_NAVIGATION_TIMEOUT_MS = 60_000;
const BROWSER_STEP_TIMEOUT_MS = 30_000;
const BROWSER_LINK_TIMEOUT_MS = 45_000;
const BROWSER_NETWORK_IDLE_MS = 750;
const BROWSER_RETRY_BACKOFF_MS = 400;

const MS_DOWNLOAD_PAGES = {
  x64: 'https://www.microsoft.com/en-us/software-download/windows11',
  arm64: 'https://www.microsoft.com/en-us/software-download/windows11arm64',
} as const;

type Arch = keyof typeof MS_DOWNLOAD_PAGES;

const PRODUCT_IDS: Record<Arch, number> = {
  x64: 3262, // Windows 11 25H2
  arm64: 3265, // Windows 11 25H2 ARM64
};

// Mimic a real browser request so Microsoft's API doesn't block us
const MS_FETCH_HEADERS_BASE: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

const ALLOWED_ORIGINS = new Set(['https://atlasos.net', 'https://www.atlasos.net']);

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin;
  return headers;
}

/** Reuse the same download link until near expiry. Microsoft ISO links expire 1 day after creation. */
const LINK_CACHE_MAX_AGE_SEC = 23 * 60 * 60;

type LogDetails = Record<string, string | number | boolean | null>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logWarning(message: string, details: LogDetails): void {
  console.warn(JSON.stringify({ level: 'warn', message, ...details }));
}

function jsonResponse(data: unknown, corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // These URLs are short-lived and should never be cached.
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

function errorResponse(
  message: string,
  corsHeaders: Record<string, string>,
  status = 400,
): Response {
  return jsonResponse({ error: message }, corsHeaders, status);
}

function asArch(value: string | null): Arch | null {
  if (value === 'x64' || value === 'arm64') return value;
  return null;
}

function getDownloadPageUrl(arch: Arch): string {
  return MS_DOWNLOAD_PAGES[arch]!;
}

function getMsFetchHeaders(referer: string): Record<string, string> {
  return {
    ...MS_FETCH_HEADERS_BASE,
    Referer: referer,
  };
}

async function proxyMsApi(
  url: URL,
  referer: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  let resp: Response;
  try {
    resp = await fetch(url.toString(), {
      cache: 'no-store',
      headers: getMsFetchHeaders(referer),
      signal: AbortSignal.timeout(MS_API_TIMEOUT_MS),
    });
  } catch (error) {
    const didTimeOut =
      error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError');
    return errorResponse(
      didTimeOut ? 'Microsoft download API timed out.' : 'Failed to reach Microsoft download API.',
      corsHeaders,
      502,
    );
  }

  if (!resp.ok) {
    return errorResponse(`Microsoft API returned HTTP ${resp.status}.`, corsHeaders, 502);
  }

  let data: unknown;
  try {
    data = await resp.json();
  } catch {
    return errorResponse('Microsoft API returned an unexpected response.', corsHeaders, 502);
  }

  return jsonResponse(data, corsHeaders);
}

async function handleSkus(
  arch: Arch,
  sessionId: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const productId = PRODUCT_IDS[arch];
  const pageUrl = getDownloadPageUrl(arch);

  const url = new URL(`${MS_CONNECTOR_BASE}/getskuinformationbyproductedition`);
  url.searchParams.set('profile', MS_PROFILE_ID);
  url.searchParams.set('ProductEditionId', String(productId));
  url.searchParams.set('SKU', 'undefined');
  url.searchParams.set('friendlyFileName', 'undefined');
  url.searchParams.set('Locale', 'en-US');
  url.searchParams.set('sessionID', sessionId);

  return proxyMsApi(url, pageUrl, corsHeaders);
}

type BrowserLinkResult = { ok: true; href: string; label: string } | { ok: false; error: string };

async function readCachedIsoLinks(
  kv: KVNamespaceBinding | undefined,
  key: string,
): Promise<string | null> {
  if (!kv) return null;

  try {
    const cached = await kv.get(key);
    if (!cached) return null;

    try {
      JSON.parse(cached);
      return cached;
    } catch (error) {
      logWarning('Ignoring invalid cached ISO links payload.', { key, error: errorMessage(error) });
      return null;
    }
  } catch (error) {
    logWarning('Could not read ISO links from KV.', { key, error: errorMessage(error) });
    return null;
  }
}

function cacheIsoLinks(
  ctx: WorkerExecutionContext,
  kv: KVNamespaceBinding | undefined,
  key: string,
  value: string,
): void {
  if (!kv) return;

  ctx.waitUntil(
    kv
      .put(key, value, { expirationTtl: LINK_CACHE_MAX_AGE_SEC })
      .catch(error =>
        logWarning('Could not write ISO links to KV.', { key, error: errorMessage(error) }),
      ),
  );
}

async function waitForNetworkIdle(page: Page): Promise<void> {
  try {
    await page.waitForNetworkIdle({
      idleTime: BROWSER_NETWORK_IDLE_MS,
      timeout: BROWSER_STEP_TIMEOUT_MS,
    });
  } catch {
    // Network idle is best-effort; the following DOM waits decide whether the flow succeeded.
  }
}

async function closePage(page: Page | undefined): Promise<void> {
  if (!page) return;

  try {
    await page.close();
  } catch (error) {
    logWarning('Could not close Browser Rendering page.', { error: errorMessage(error) });
  }
}

async function closeBrowser(browser: Browser | undefined): Promise<void> {
  if (!browser) return;

  try {
    await browser.close();
  } catch (error) {
    logWarning('Could not close Browser Rendering session.', { error: errorMessage(error) });
  }
}

async function getIsoLinkViaBrowserOnce(
  env: Env,
  arch: Arch,
  skuId: string,
): Promise<BrowserLinkResult> {
  const productId = PRODUCT_IDS[arch];
  const pageUrl = getDownloadPageUrl(arch);
  const browserEndpoint: BrowserWorker | undefined = env.BROWSER;
  if (!browserEndpoint) return { ok: false, error: 'Browser Rendering binding is not configured.' };

  // Cloudflare Browser Rendering runs a real headless Chromium session.
  // We use it only for the final signed URL generation (Sentinel fingerprinting).
  let browser: Browser | undefined;
  let page: Page | undefined;

  try {
    browser = await puppeteer.launch(browserEndpoint, { keep_alive: BROWSER_KEEP_ALIVE_MS });
    page = await browser.newPage();
    page.setDefaultTimeout(BROWSER_STEP_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(BROWSER_NAVIGATION_TIMEOUT_MS);

    await page.setUserAgent(MS_FETCH_HEADERS_BASE['User-Agent'] ?? '');
    await page.setViewport({ width: 1365, height: 900 });
    await page.goto(pageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: BROWSER_NAVIGATION_TIMEOUT_MS,
    });

    // Give Microsoft's anti-bot scripts a brief moment to initialize.
    await new Promise(resolve => setTimeout(resolve, 1500));

    const editionValue = String(productId);

    // Wait for product edition selector to be present.
    await page.waitForFunction(
      val => {
        const selects = Array.from(document.querySelectorAll('select'));
        return selects.some(s => Array.from(s.options).some(o => o.value === val));
      },
      { timeout: BROWSER_STEP_TIMEOUT_MS },
      editionValue,
    );

    // Select the product edition and click the first Confirm.
    await page.evaluate(val => {
      const selects = Array.from(document.querySelectorAll('select'));
      const sel = selects.find(s => Array.from(s.options).some(o => o.value === val)) as
        | HTMLSelectElement
        | undefined;
      if (!sel) return;
      sel.value = val;
      sel.dispatchEvent(new Event('change', { bubbles: true }));

      const btn = Array.from(document.querySelectorAll('button')).find(
        b => (b.textContent ?? '').trim() === 'Confirm',
      ) as HTMLButtonElement | undefined;
      btn?.click();
    }, editionValue);

    // After confirming the edition, the next dropdown is populated asynchronously.
    await waitForNetworkIdle(page);

    // Wait for language selector to populate. Its option values are JSON containing the SKU id.
    await page.waitForFunction(
      skuIdStr => {
        const needle = `"id":"${skuIdStr}"`;
        const selects = Array.from(document.querySelectorAll('select'));
        return selects.some(s =>
          Array.from(s.options).some(o => o.value === skuIdStr || o.value.includes(needle)),
        );
      },
      { timeout: BROWSER_STEP_TIMEOUT_MS },
      String(skuId),
    );

    // Select language by SKU id (matches Microsoft UI behavior) and click Confirm again.
    await page.evaluate(skuIdStr => {
      const needle = `"id":"${skuIdStr}"`;
      const selects = Array.from(document.querySelectorAll('select'));
      const langSel = selects.find(s =>
        Array.from(s.options).some(o => o.value === skuIdStr || o.value.includes(needle)),
      ) as HTMLSelectElement | undefined;
      if (!langSel) return;

      const opt = Array.from(langSel.options).find(
        o => o.value === skuIdStr || o.value.includes(needle),
      );
      if (!opt) return;
      langSel.value = opt.value;
      langSel.dispatchEvent(new Event('change', { bubbles: true }));

      const btns = Array.from(document.querySelectorAll('button')).filter(
        b => (b.textContent ?? '').trim() === 'Confirm',
      ) as HTMLButtonElement[];
      const btn = btns[btns.length - 1] ?? btns[0];
      btn?.click();
    }, String(skuId));

    await waitForNetworkIdle(page);

    const expectedLinkText = arch === 'arm64' ? 'ARM64 Download' : '64-bit Download';
    await page.waitForFunction(
      text => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.some(
          a => (a.textContent ?? '').includes(text) && !!(a as HTMLAnchorElement).href,
        );
      },
      { timeout: BROWSER_LINK_TIMEOUT_MS },
      expectedLinkText,
    );

    const href = await page.evaluate(text => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const a = anchors.find(el => (el.textContent ?? '').includes(text)) as
        | HTMLAnchorElement
        | undefined;
      return a?.href ?? null;
    }, expectedLinkText);

    if (!href) return { ok: false, error: 'Microsoft page did not expose a download link.' };

    return { ok: true, href: String(href), label: expectedLinkText };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Browser Rendering failed.' };
  } finally {
    await closePage(page);
    await closeBrowser(browser);
  }
}

async function getIsoLinkViaBrowser(
  env: Env,
  arch: Arch,
  skuId: string,
  attempts = BROWSER_RETRY_ATTEMPTS,
): Promise<BrowserLinkResult> {
  if (!env.BROWSER) return { ok: false, error: 'Browser Rendering binding is not configured.' };

  let lastError = 'Browser Rendering failed.';
  for (let i = 0; i < attempts; i++) {
    const res = await getIsoLinkViaBrowserOnce(env, arch, skuId);
    if (res.ok) return res;
    lastError = res.error;
    // Brief backoff; Microsoft pages can be flaky to render under load.
    if (i < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, BROWSER_RETRY_BACKOFF_MS + i * 350));
    }
  }
  return { ok: false, error: lastError };
}

export default {
  async fetch(request: Request, env: Env, ctx: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, OPTIONS', ...corsHeaders },
      });
    }

    if (url.pathname === '/api/ms-iso/skus') {
      const arch = asArch(url.searchParams.get('arch'));
      if (!arch) return errorResponse('Invalid architecture. Use x64 or arm64.', corsHeaders);
      const sessionId = url.searchParams.get('sessionId') ?? crypto.randomUUID();
      return handleSkus(arch, sessionId, corsHeaders);
    }

    if (url.pathname === '/api/ms-iso/links') {
      const archRaw = url.searchParams.get('arch');
      const arch = archRaw ? asArch(archRaw) : 'x64';
      if (!arch) return errorResponse('Invalid architecture. Use x64 or arm64.', corsHeaders);
      const skuId = url.searchParams.get('skuId') ?? '';
      if (!skuId) return errorResponse('Missing skuId parameter.', corsHeaders);

      // KV is globally replicated; Cache API is per-data center, so another region would spawn a new browser.
      const kv = env.MS_ISO_LINKS;
      const kvKey = `ms-iso:${arch}:${skuId}`;
      const cached = await readCachedIsoLinks(kv, kvKey);
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...corsHeaders,
          },
        });
      }

      const viaBrowser = await getIsoLinkViaBrowser(env, arch, skuId);
      if (!viaBrowser.ok) {
        return jsonResponse(
          {
            Errors: [
              { Key: 'ErrorSettings.BrowserRenderingFailed', Value: viaBrowser.error, Type: 9 },
            ],
          },
          corsHeaders,
        );
      }

      const payload = {
        ProductDownloadOptions: [
          {
            Uri: viaBrowser.href,
            ProductDisplayName: 'Windows 11 ISO',
            LocalizedLanguage: viaBrowser.label,
          },
        ],
      };
      const body = JSON.stringify(payload);
      cacheIsoLinks(ctx, kv, kvKey, body);

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          ...corsHeaders,
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies WorkerHandler<Env>;
