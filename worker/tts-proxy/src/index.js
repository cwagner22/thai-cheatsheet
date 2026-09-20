/**
 * Relay for Google Translate's Thai voice.
 *
 * translate_tts serves audio without CORS headers, so a page can play it but
 * never read its samples, and it refuses requests carrying a Referer from
 * outside google.com. Fetching from a Worker sends no Referer, and the
 * response goes back with the CORS header the Speaking tab needs to run the
 * voice through its analyser. Each phrase is cached at the edge for a month:
 * the voice for a given text never changes.
 *
 *   GET /?q=<Thai text>   →  audio/mpeg
 */

const UPSTREAM = 'https://translate.google.com/translate_tts';
const MAX_CHARS = 200;
const CACHE_SECONDS = 60 * 60 * 24 * 30;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return new Response('GET only', { status: 405, headers: cors });

    const q = new URL(request.url).searchParams.get('q') ?? '';
    if (!q.trim() || q.length > MAX_CHARS) {
      return new Response(`q must be 1–${MAX_CHARS} characters`, { status: 400, headers: cors });
    }

    const upstream = `${UPSTREAM}?ie=UTF-8&client=tw-ob&tl=th&q=${encodeURIComponent(q)}`;
    const cacheKey = new Request(upstream);
    const cache = caches.default;
    let response = await cache.match(cacheKey);
    if (!response) {
      const fetched = await fetch(upstream, {
        headers: { 'User-Agent': 'Mozilla/5.0 (thai-cheatsheet tts relay)' },
      });
      if (!fetched.ok) {
        return new Response(`upstream ${fetched.status}`, { status: 502, headers: cors });
      }
      response = new Response(fetched.body, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': `public, max-age=${CACHE_SECONDS}, immutable`,
        },
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  },
};

function corsHeaders(origin, allowed) {
  const list = (allowed ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const headers = { Vary: 'Origin' };
  if (origin && list.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}
