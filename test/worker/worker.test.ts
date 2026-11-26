import {
  createExecutionContext,
  createScheduledController,
  reset,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import worker from '../../src/worker';

const mocks = vi.hoisted(() => {
  const isoUrl = 'https://software.download.prss.microsoft.com/Win11_25H2_English_x64.iso?t=signed';

  const page = {
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    setUserAgent: vi.fn<(options: { userAgent: string }) => Promise<void>>(() => Promise.resolve()),
    setViewport: vi.fn(() => Promise.resolve()),
    goto: vi.fn<(url: string, options?: unknown) => Promise<unknown>>(() => Promise.resolve(null)),
    waitForFunction: vi.fn(() => Promise.resolve()),
    waitForNetworkIdle: vi.fn(() => Promise.resolve()),
    // The worker's last evaluate() call reads the download link; its argument is the architecture.
    evaluate: vi.fn((_fn: unknown, arg: unknown) =>
      Promise.resolve(arg === 'x64' || arg === 'arm64' ? isoUrl : undefined),
    ),
  };
  const context = {
    newPage: vi.fn(() => Promise.resolve(page)),
    close: vi.fn(() => Promise.resolve()),
  };
  const cdp = {
    send: vi.fn<(method: string) => Promise<{ browserContextIds: string[] }>>(() =>
      Promise.resolve({ browserContextIds: [] }),
    ),
    detach: vi.fn(() => Promise.resolve()),
  };
  const browser = {
    connected: true,
    createBrowserContext: vi.fn(() => Promise.resolve(context)),
    target: vi.fn(() => ({ createCDPSession: () => Promise.resolve(cdp) })),
    disconnect: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };

  return {
    isoUrl,
    page,
    context,
    cdp,
    browser,
    sessions: vi.fn<(endpoint: unknown) => Promise<{ sessionId: string }[]>>(() =>
      Promise.resolve([]),
    ),
    connect: vi.fn<(endpoint: unknown, sessionId: string) => Promise<typeof browser>>(() =>
      Promise.resolve(browser),
    ),
    launch: vi.fn<(endpoint: unknown, options?: unknown) => Promise<typeof browser>>(() =>
      Promise.resolve(browser),
    ),
  };
});

vi.mock('@cloudflare/puppeteer', () => ({
  default: { sessions: mocks.sessions, connect: mocks.connect, launch: mocks.launch },
}));

type LinkMetadata = { requestedAt: number; expiresAt: number };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ENGLISH = 'English (United States)';
const ORIGIN = 'https://atlasos.net';

let fetchSpy: MockInstance<typeof fetch>;

function requestedUrl(call: Parameters<typeof fetch> | undefined): URL {
  const input = call?.[0] ?? '';
  return new URL(input instanceof Request ? input.url : input);
}

function request(path: string, init?: RequestInit): Parameters<typeof worker.fetch>[0] {
  return new Request(`${ORIGIN}${path}`, init) as Parameters<typeof worker.fetch>[0];
}

async function callWorker(path: string, init?: RequestInit, testEnv: Env = env): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(request(path, init), testEnv, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

async function runCron(): Promise<void> {
  await worker.scheduled(createScheduledController({ cron: '0 * * * *' }), env);
}

function skuResponse(skus: { Id: string; LocalizedLanguage: string }[]): Response {
  return Response.json({ ValidationContainer: { Errors: [] }, Skus: skus });
}

async function seedSkus(arch: 'x64' | 'arm64', skus: { id: string; language: string }[]) {
  await env.MS_ISO_LINKS.put(
    `ms-iso-skus:${arch}:${arch === 'x64' ? 3813 : 3816}`,
    JSON.stringify(skus),
  );
}

function linksJson(uri: string, label = '64-bit Download'): string {
  return JSON.stringify({
    ProductDownloadOptions: [
      { Uri: uri, ProductDisplayName: 'Windows 11 ISO', LocalizedLanguage: label },
    ],
  });
}

async function putLink(
  key: string,
  metadata: LinkMetadata,
  value = linksJson('https://old.test/iso'),
) {
  await env.MS_ISO_LINKS.put(key, value, {
    expiration: Math.floor(metadata.expiresAt / 1000),
    metadata,
  });
}

function readLink(key: string) {
  return env.MS_ISO_LINKS.getWithMetadata<LinkMetadata>(key);
}

function resolvedSkuIds(): string[] {
  return mocks.page.evaluate.mock.calls
    .map(([, arg]) => (typeof arg === 'string' ? /^"id":"(\d+)"$/.exec(arg)?.[1] : undefined))
    .filter(id => id !== undefined);
}

beforeEach(async () => {
  await reset();
  vi.resetAllMocks();
  mocks.browser.connected = true;
  // Any Microsoft call a test doesn't expect fails loudly instead of reaching the network.
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected fetch'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('routing', () => {
  it('answers preflight requests from allowed origins only', async () => {
    const allowed = await callWorker('/api/ms-iso/links', {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN },
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(allowed.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(allowed.headers.get('Vary')).toBe('Origin');

    const foreign = await callWorker('/api/ms-iso/links', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com' },
    });
    expect(foreign.status).toBe(204);
    expect(foreign.headers.has('Access-Control-Allow-Origin')).toBe(false);
  });

  it('rejects methods other than GET', async () => {
    const response = await callWorker('/api/ms-iso/links', { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, OPTIONS');
    expect(await response.text()).toBe('Method Not Allowed');
  });

  it('hands unknown paths to the static assets', async () => {
    const assetsFetch = vi.fn<(request: Request) => Promise<Response>>(() =>
      Promise.resolve(new Response('asset')),
    );
    const testEnv = {
      MS_ISO_LINKS: env.MS_ISO_LINKS,
      BROWSER: env.BROWSER,
      ASSETS: { fetch: assetsFetch },
    } as unknown as Env;

    const response = await callWorker('/api/unknown', undefined, testEnv);
    expect(await response.text()).toBe('asset');
    expect(assetsFetch).toHaveBeenCalledTimes(1);
    expect(new URL(assetsFetch.mock.calls[0]![0].url).pathname).toBe('/api/unknown');
  });
});

describe('GET /api/ms-iso/skus', () => {
  it('rejects an invalid architecture', async () => {
    const response = await callWorker('/api/ms-iso/skus?arch=x86');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid architecture. Use x64 or arm64.' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('proxies the language list from Microsoft', async () => {
    const upstream = JSON.stringify({ Skus: [{ Id: '19700', LocalizedLanguage: ENGLISH }] });
    fetchSpy.mockResolvedValue(new Response(upstream));

    const response = await callWorker('/api/ms-iso/skus?arch=arm64&sessionId=abc', {
      headers: { Origin: ORIGIN },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(upstream);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const url = requestedUrl(fetchSpy.mock.calls[0]);
    expect(url.searchParams.get('ProductEditionId')).toBe('3816');
    expect(url.searchParams.get('sessionID')).toBe('abc');
  });

  it.each([
    [
      'an upstream error',
      () => Promise.resolve(new Response('busy', { status: 500 })),
      'Microsoft API returned HTTP 500.',
    ],
    [
      'a timeout',
      () => Promise.reject(new DOMException('timed out', 'TimeoutError')),
      'Microsoft download API timed out.',
    ],
    [
      'a network failure',
      () => Promise.reject(new TypeError('Network down')),
      'Failed to reach Microsoft download API.',
    ],
    [
      'a non-JSON body',
      () => Promise.resolve(new Response('<html>')),
      'Microsoft API returned an unexpected response.',
    ],
  ])('maps %s to a 502', async (_case, upstream, error) => {
    fetchSpy.mockImplementation(upstream);

    const response = await callWorker('/api/ms-iso/skus?arch=x64');
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error });
  });
});

describe('GET /api/ms-iso/links', () => {
  beforeEach(async () => {
    await seedSkus('x64', [{ id: '19675', language: ENGLISH }]);
    await seedSkus('arm64', [{ id: '19700', language: ENGLISH }]);
  });

  it.each([
    ['/api/ms-iso/links?arch=x86&skuId=19675', 'Invalid architecture. Use x64 or arm64.'],
    ['/api/ms-iso/links?arch=x64', 'Missing skuId parameter.'],
    ['/api/ms-iso/links?arch=x64&skuId=abc', 'Invalid skuId parameter.'],
    ['/api/ms-iso/links?arch=x64&skuId=12345678901', 'Invalid skuId parameter.'],
    ['/api/ms-iso/links?arch=x64&skuId=99999', 'Unknown skuId for this architecture.'],
    ['/api/ms-iso/links?arch=arm64&skuId=19675', 'Unknown skuId for this architecture.'],
  ])('rejects %s before using Browser Run', async (path, error) => {
    const response = await callWorker(path);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
    expect(mocks.sessions).not.toHaveBeenCalled();
    expect(mocks.launch).not.toHaveBeenCalled();
  });

  it('serves a cached link without a browser', async () => {
    const value = linksJson('https://cached.test/iso');
    await putLink(
      'ms-iso:x64:19675',
      { requestedAt: Date.now() - HOUR, expiresAt: Date.now() + 10 * HOUR },
      value,
    );

    const response = await callWorker('/api/ms-iso/links?arch=x64&skuId=19675');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(value);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('records a cache hit at most once a day and keeps the expiry', async () => {
    const expiresAt = Date.now() + 10 * HOUR;
    await putLink('ms-iso:x64:19675', { requestedAt: Date.now() - 2 * DAY, expiresAt });
    await putLink('ms-iso:arm64:19700', { requestedAt: Date.now() - HOUR, expiresAt });

    const before = Date.now();
    await (await callWorker('/api/ms-iso/links?arch=x64&skuId=19675')).text();
    await (await callWorker('/api/ms-iso/links?arch=arm64&skuId=19700')).text();

    const bumped = (await readLink('ms-iso:x64:19675')).metadata!;
    expect(bumped.requestedAt).toBeGreaterThanOrEqual(before);
    expect(bumped.expiresAt).toBe(expiresAt);
    expect((await readLink('ms-iso:arm64:19700')).metadata!.requestedAt).toBeLessThan(before);
  });

  it('resolves a missing link, caches it with request metadata and releases the browser', async () => {
    const before = Date.now();
    const response = await callWorker('/api/ms-iso/links?arch=x64&skuId=19675');

    const body = linksJson(mocks.isoUrl);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(body);

    expect(mocks.page.setUserAgent).toHaveBeenCalledWith({
      userAgent: expect.stringContaining('Chrome/152.0.0.0') as string,
    });
    expect(mocks.page.goto.mock.calls[0]![0]).toBe(
      'https://www.microsoft.com/en-us/software-download/windows11',
    );
    expect(resolvedSkuIds()).toEqual(['19675']);
    expect(mocks.context.close).toHaveBeenCalledTimes(1);
    expect(mocks.browser.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.browser.close).not.toHaveBeenCalled();

    const cached = await readLink('ms-iso:x64:19675');
    expect(cached.value).toBe(body);
    expect(cached.metadata!.requestedAt).toBeGreaterThanOrEqual(before);
    expect(cached.metadata!.expiresAt - cached.metadata!.requestedAt).toBeCloseTo(23 * HOUR, -4);
  });

  it('labels ARM64 links with the ARM64 download text', async () => {
    const response = await callWorker('/api/ms-iso/links?arch=arm64&skuId=19700');
    expect(await response.text()).toBe(linksJson(mocks.isoUrl, 'ARM64 Download'));
  });

  it('fetches and caches the SKU list when it is not cached yet', async () => {
    await env.MS_ISO_LINKS.delete('ms-iso-skus:x64:3813');
    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        skuResponse([
          { Id: '19675', LocalizedLanguage: ENGLISH },
          { Id: '19676', LocalizedLanguage: 'English International' },
        ]),
      ),
    );

    await (await callWorker('/api/ms-iso/links?arch=x64&skuId=19675')).text();
    await (await callWorker('/api/ms-iso/links?arch=x64&skuId=19676')).text();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(await env.MS_ISO_LINKS.get('ms-iso-skus:x64:3813', 'json')).toEqual([
      { id: '19675', language: ENGLISH },
      { id: '19676', language: 'English International' },
    ]);
    expect(mocks.launch).toHaveBeenCalledTimes(2);
  });

  it('fails without a browser when the SKU list is unavailable', async () => {
    await env.MS_ISO_LINKS.delete('ms-iso-skus:x64:3813');
    fetchSpy.mockResolvedValue(new Response('busy', { status: 503 }));

    const response = await callWorker('/api/ms-iso/links?arch=x64&skuId=19675');
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Microsoft API returned HTTP 503.' });
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(await env.MS_ISO_LINKS.get('ms-iso-skus:x64:3813')).toBeNull();
  });

  it('retries three times, returns the error envelope and remembers the failure', async () => {
    mocks.page.goto.mockRejectedValue(new Error('Navigation failed'));
    const envelope = {
      Errors: [
        { Key: 'ErrorSettings.BrowserRenderingFailed', Value: 'Navigation failed', Type: 9 },
      ],
    };

    const first = await callWorker('/api/ms-iso/links?arch=x64&skuId=19675');
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual(envelope);
    expect(mocks.launch).toHaveBeenCalledTimes(3);
    expect(mocks.context.close).toHaveBeenCalledTimes(3);
    expect(mocks.browser.disconnect).toHaveBeenCalledTimes(3);
    expect(await env.MS_ISO_LINKS.get('ms-iso:x64:19675')).toBeNull();
    expect(await env.MS_ISO_LINKS.get('ms-iso-failed:x64:19675')).toBe('Navigation failed');

    const second = await callWorker('/api/ms-iso/links?arch=x64&skuId=19675');
    expect(await second.json()).toEqual(envelope);
    expect(mocks.launch).toHaveBeenCalledTimes(3);
  });

  it('does not remember failures caused by Browser Run rate limits', async () => {
    const error = 'Unable to create new browser: code: 429: message: Too many requests';
    mocks.launch.mockRejectedValue(new Error(error));

    const response = await callWorker('/api/ms-iso/links?arch=x64&skuId=19675');
    expect(await response.json()).toEqual({
      Errors: [{ Key: 'ErrorSettings.BrowserRenderingFailed', Value: error, Type: 9 }],
    });
    expect(mocks.launch).toHaveBeenCalledTimes(3);
    expect(await env.MS_ISO_LINKS.get('ms-iso-failed:x64:19675')).toBeNull();
  });
});

describe('Browser Run session reuse', () => {
  beforeEach(async () => {
    await seedSkus('x64', [{ id: '19675', language: ENGLISH }]);
  });

  it('joins an existing session that has spare capacity', async () => {
    mocks.sessions.mockResolvedValue([{ sessionId: 'shared' }]);
    mocks.cdp.send.mockResolvedValue({ browserContextIds: ['other-request'] });

    await (await callWorker('/api/ms-iso/links?arch=x64&skuId=19675')).text();

    // Bindings are RPC stubs: compare by identity, never deeply.
    expect(mocks.sessions.mock.calls[0]![0] === env.BROWSER).toBe(true);
    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.connect.mock.calls[0]![0] === env.BROWSER).toBe(true);
    expect(mocks.connect.mock.calls[0]![1]).toBe('shared');
    expect(mocks.cdp.send).toHaveBeenCalledWith('Target.getBrowserContexts');
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.browser.createBrowserContext).toHaveBeenCalledTimes(1);
    expect(mocks.context.close).toHaveBeenCalledTimes(1);
    expect(mocks.browser.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.browser.close).not.toHaveBeenCalled();
  });

  it('launches a browser when every session is full', async () => {
    mocks.sessions.mockResolvedValue([{ sessionId: 'busy' }]);
    mocks.cdp.send.mockResolvedValue({ browserContextIds: ['a', 'b', 'c', 'd'] });

    await (await callWorker('/api/ms-iso/links?arch=x64&skuId=19675')).text();

    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.launch).toHaveBeenCalledTimes(1);
    expect(mocks.launch.mock.calls[0]![0] === env.BROWSER).toBe(true);
    expect(mocks.launch.mock.calls[0]![1]).toEqual({ keep_alive: 60_000 });
    // Once for the full session, once when the request is done.
    expect(mocks.browser.disconnect).toHaveBeenCalledTimes(2);
    expect(mocks.browser.close).not.toHaveBeenCalled();
  });

  it('launches a browser when a listed session has already gone', async () => {
    mocks.sessions.mockResolvedValue([{ sessionId: 'gone' }]);
    mocks.connect.mockRejectedValue(new Error('Unable to connect to existing session gone'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await callWorker('/api/ms-iso/links?arch=x64&skuId=19675');
    expect(await response.text()).toBe(linksJson(mocks.isoUrl));
    expect(mocks.launch).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/supporters', () => {
  const UPSTREAM = 'https://discordmetrics.atlasos.net/supporters';
  const cacheKey = () => new Request(`${ORIGIN}/api/supporters`);
  const EMPTY = { updatedAt: null, monthly: [], oneOff: [] };
  const wall = {
    updatedAt: '2026-11-26T12:00:00.000Z',
    monthly: [{ name: 'Sam Sample', tier: 'Gigabyte' }],
    oneOff: [{ name: 'Jo Example' }],
  };

  async function seedCache(body: unknown, fetchedAt: number) {
    await (
      await caches.open('supporter-wall')
    ).put(
      cacheKey(),
      new Response(JSON.stringify(body), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=604800',
          'X-Supporters-Fetched-At': String(fetchedAt),
        },
      }),
    );
  }

  beforeEach(async () => {
    await (await caches.open('supporter-wall')).delete(cacheKey());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it("fetches the bot's list, cleans it and caches it for ten minutes", async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        Response.json({
          updatedAt: '2026-11-26T12:00:00Z',
          monthly: [{ name: '  Sam   Sample ', tier: 'Gigabyte', amount: '5.00' }, { tier: 'Bit' }],
          oneOff: [{ name: 'Jo Example', email: 'jo@example.com' }, { name: '<b>Bold</b>' }],
        }),
      ),
    );

    const response = await callWorker('/api/supporters');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    const text = await response.text();
    expect(text).not.toMatch(/[<>]/);
    expect(text).not.toContain('example.com');
    expect(JSON.parse(text)).toEqual({
      updatedAt: '2026-11-26T12:00:00.000Z',
      monthly: [{ name: 'Sam Sample', tier: 'Gigabyte' }],
      oneOff: [{ name: 'Jo Example' }, { name: '<b>Bold</b>' }],
    });
    expect(requestedUrl(fetchSpy.mock.calls[0]).href).toBe(UPSTREAM);

    const again = await callWorker('/api/supporters');
    expect(JSON.parse(await again.text())).toEqual(JSON.parse(text));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('asks the bot again once the cached copy is ten minutes old', async () => {
    await seedCache(EMPTY, Date.now() - 11 * 60 * 1000);
    fetchSpy.mockImplementation(() => Promise.resolve(Response.json(wall)));

    const response = await callWorker('/api/supporters');
    expect(await response.json()).toEqual(wall);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an error status', () => Promise.resolve(new Response('Bad Gateway', { status: 502 }))],
    ['a network failure', () => Promise.reject(new TypeError('Network down'))],
    ['a body that is not JSON', () => Promise.resolve(new Response('<html>'))],
    ['the wrong shape', () => Promise.resolve(Response.json({ supporters: ['Jo Example'] }))],
  ])('serves the last good copy after %s', async (_case, upstream) => {
    await seedCache(wall, Date.now() - 60 * 60 * 1000);
    fetchSpy.mockImplementation(upstream);

    const response = await callWorker('/api/supporters');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(await response.json()).toEqual(wall);
  });

  it("serves an empty wall when the bot can't be reached and nothing is cached", async () => {
    fetchSpy.mockImplementation(() => Promise.resolve(new Response('Not Found', { status: 404 })));

    const response = await callWorker('/api/supporters');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(await response.json()).toEqual(EMPTY);
  });
});

describe('scheduled refresh', () => {
  it('refreshes recently requested links that expire soon and keeps English warm', async () => {
    const now = Date.now();
    await seedSkus('x64', [
      { id: '19675', language: ENGLISH },
      { id: '19676', language: 'English International' },
    ]);
    await seedSkus('arm64', [{ id: '19700', language: ENGLISH }]);
    await putLink('ms-iso:x64:19676', { requestedAt: now - HOUR, expiresAt: now + HOUR });
    await putLink('ms-iso:arm64:19701', { requestedAt: now - 4 * DAY, expiresAt: now + HOUR });
    await putLink('ms-iso:arm64:19702', { requestedAt: now - HOUR, expiresAt: now + 20 * HOUR });

    await runCron();

    expect(resolvedSkuIds().sort()).toEqual(['19675', '19676', '19700']);
    expect(fetchSpy).not.toHaveBeenCalled();
    // One browser for the whole run, a context per link.
    expect(mocks.launch).toHaveBeenCalledTimes(1);
    expect(mocks.browser.createBrowserContext).toHaveBeenCalledTimes(3);
    expect(mocks.context.close).toHaveBeenCalledTimes(3);
    expect(mocks.browser.disconnect).toHaveBeenCalledTimes(1);

    const refreshed = await readLink('ms-iso:x64:19676');
    expect(refreshed.value).toBe(linksJson(mocks.isoUrl));
    expect(refreshed.metadata!.requestedAt).toBe(now - HOUR);
    expect(refreshed.metadata!.expiresAt).toBeGreaterThan(now + 22 * HOUR);

    const englishArm = await readLink('ms-iso:arm64:19700');
    expect(englishArm.value).toBe(linksJson(mocks.isoUrl, 'ARM64 Download'));
    expect(englishArm.metadata!.requestedAt).toBe(0);
    expect((await readLink('ms-iso:x64:19675')).metadata!.requestedAt).toBe(0);

    expect((await readLink('ms-iso:arm64:19701')).metadata!.expiresAt).toBe(now + HOUR);
    expect((await readLink('ms-iso:arm64:19702')).metadata!.expiresAt).toBe(now + 20 * HOUR);
  });

  it('does nothing when every warm link is fresh', async () => {
    const now = Date.now();
    await seedSkus('x64', [{ id: '19675', language: ENGLISH }]);
    await seedSkus('arm64', [{ id: '19700', language: ENGLISH }]);
    await putLink('ms-iso:x64:19675', { requestedAt: 0, expiresAt: now + 20 * HOUR });
    await putLink('ms-iso:arm64:19700', { requestedAt: 0, expiresAt: now + 20 * HOUR });

    await runCron();

    expect(mocks.sessions).not.toHaveBeenCalled();
    expect(mocks.launch).not.toHaveBeenCalled();
  });

  it('logs each failure and throws so the run is marked as failed', async () => {
    await seedSkus('x64', [{ id: '19675', language: ENGLISH }]);
    fetchSpy.mockResolvedValue(new Response('busy', { status: 500 }));
    mocks.page.goto.mockRejectedValue(new Error('Navigation failed'));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runCron()).rejects.toThrow('Could not refresh 2 ISO link(s)');

    // Only arm64 needed Microsoft: the x64 list came from the KV cache.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(requestedUrl(fetchSpy.mock.calls[0]).searchParams.get('ProductEditionId')).toBe('3816');
    expect(errorLog.mock.calls.map(([line]) => JSON.parse(String(line)) as unknown)).toEqual([
      {
        level: 'error',
        message: 'Could not find the SKU to keep warm.',
        arch: 'arm64',
        language: ENGLISH,
        error: 'Microsoft API returned HTTP 500.',
      },
      {
        level: 'error',
        message: 'Could not refresh ISO link.',
        key: 'ms-iso:x64:19675',
        error: 'Navigation failed',
      },
    ]);
    expect(mocks.browser.disconnect).toHaveBeenCalled();
  });
});
