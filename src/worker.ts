export interface Env {
  ASSETS: Fetcher;
}

const MS_CONNECTOR_BASE = 'https://www.microsoft.com/software-download-connector/api';
const PROFILE = '606624d44113';

const PRODUCT_IDS: Record<string, number> = {
  x64: 3262,   // Windows 11 25H2
  arm64: 3265, // Windows 11 25H2 ARM64
};

// Mimic a real browser request so Microsoft's API doesn't block us
const MS_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.microsoft.com/en-us/software-download/windows11',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

async function proxyMsApi(url: URL): Promise<Response> {
  let resp: Response;
  try {
    resp = await fetch(url.toString(), { headers: MS_FETCH_HEADERS });
  } catch {
    return errorResponse('Failed to reach Microsoft download API.', 502);
  }

  if (!resp.ok) {
    return errorResponse(`Microsoft API returned HTTP ${resp.status}.`, 502);
  }

  let data: unknown;
  try {
    data = await resp.json();
  } catch {
    return errorResponse('Microsoft API returned an unexpected response.', 502);
  }

  return jsonResponse(data);
}

async function handleSkus(arch: string): Promise<Response> {
  const productId = PRODUCT_IDS[arch];
  if (!productId) return errorResponse('Invalid architecture. Use x64 or arm64.');

  const url = new URL(`${MS_CONNECTOR_BASE}/getskuinformationbyproductedition`);
  url.searchParams.set('profile', PROFILE);
  url.searchParams.set('ProductEditionId', String(productId));
  url.searchParams.set('SKU', 'undefined');
  url.searchParams.set('friendlyFileName', 'undefined');
  url.searchParams.set('Locale', 'en-US');
  url.searchParams.set('sessionID', crypto.randomUUID());

  return proxyMsApi(url);
}

async function handleLinks(skuId: string): Promise<Response> {
  if (!skuId) return errorResponse('Missing skuId parameter.');

  const url = new URL(`${MS_CONNECTOR_BASE}/GetProductDownloadLinksBySku`);
  url.searchParams.set('profile', PROFILE);
  url.searchParams.set('ProductEditionId', 'undefined');
  url.searchParams.set('SKU', skuId);
  url.searchParams.set('friendlyFileName', 'undefined');
  url.searchParams.set('Locale', 'en-US');
  url.searchParams.set('sessionID', crypto.randomUUID());

  return proxyMsApi(url);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (url.pathname === '/api/ms-iso/skus') {
      const arch = url.searchParams.get('arch') ?? '';
      return handleSkus(arch);
    }

    if (url.pathname === '/api/ms-iso/links') {
      const skuId = url.searchParams.get('skuId') ?? '';
      return handleLinks(skuId);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
