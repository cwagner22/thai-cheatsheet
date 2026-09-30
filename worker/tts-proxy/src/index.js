/**
 * Relay for Google Translate's Thai and English voices.
 *
 * translate_tts serves audio without CORS headers, so a page can play it but
 * never read its samples, and it refuses requests carrying a Referer from
 * outside google.com. Fetching from a Worker sends no Referer, and the
 * response goes back with the CORS header the Speaking tab needs to run the
 * voice through its analyser. Each phrase is cached at the edge for a month:
 * the voice for a given text never changes.
 *
 *   GET /?q=<text>[&tl=th|en]   →  audio/mpeg   (tl defaults to th)
 *
 * It also relays Azure's pronunciation assessment for the English page,
 * adding the Speech key (the AZURE_SPEECH_KEY and AZURE_SPEECH_REGION
 * secrets) so it never reaches the browser:
 *
 *   POST /pronunciation[?language=en-US|th-TH]   body: 16 kHz mono WAV,
 *        header Pronunciation-Assessment   →  Azure's JSON result
 */

const UPSTREAM = 'https://translate.google.com/translate_tts';
const MAX_CHARS = 200;
const CACHE_SECONDS = 60 * 60 * 24 * 30;
const LANGUAGES = ['th', 'en'];
/** Azure scores at most 30 s of audio per request; 30 s of 16-bit 16 kHz
 *  mono is 960 KB, so anything larger is not a take. */
const MAX_AUDIO_BYTES = 1_000_000;
const AZURE_PATH = '/speech/recognition/conversation/cognitiveservices/v1';
const ASSESS_LANGUAGES = ['en-US', 'th-TH'];

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (new URL(request.url).pathname === '/pronunciation') return pronunciation(request, env, cors);
    if (request.method !== 'GET') return new Response('GET only', { status: 405, headers: cors });

    const params = new URL(request.url).searchParams;
    const q = params.get('q') ?? '';
    const tl = params.get('tl') ?? 'th';
    if (!LANGUAGES.includes(tl)) {
      return new Response(`tl must be one of ${LANGUAGES.join(', ')}`, { status: 400, headers: cors });
    }
    if (!q.trim() || q.length > MAX_CHARS) {
      return new Response(`q must be 1–${MAX_CHARS} characters`, { status: 400, headers: cors });
    }

    const upstream = `${UPSTREAM}?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(q)}`;
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

async function pronunciation(request, env, cors) {
  if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
  // Only pages on the allowed list get CORS headers; refusing the rest here
  // as well keeps other sites from spending the Azure quota through this.
  if (!cors['Access-Control-Allow-Origin']) return new Response('origin not allowed', { status: 403, headers: cors });
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
    return new Response('pronunciation check not configured', { status: 503, headers: cors });
  }
  const language = new URL(request.url).searchParams.get('language') ?? 'en-US';
  if (!ASSESS_LANGUAGES.includes(language)) {
    return new Response(`language must be one of ${ASSESS_LANGUAGES.join(', ')}`, { status: 400, headers: cors });
  }
  const assessment = request.headers.get('Pronunciation-Assessment');
  if (!assessment) return new Response('Pronunciation-Assessment header required', { status: 400, headers: cors });
  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0 || audio.byteLength > MAX_AUDIO_BYTES) {
    return new Response(`audio must be 1–${MAX_AUDIO_BYTES} bytes`, { status: 413, headers: cors });
  }
  const upstream = await fetch(`https://${env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com${AZURE_PATH}?language=${language}&format=detailed`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      Accept: 'application/json',
      'Pronunciation-Assessment': assessment,
    },
    body: audio,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}

function corsHeaders(origin, allowed) {
  const list = (allowed ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const headers = { Vary: 'Origin' };
  if (origin && list.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, Pronunciation-Assessment';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}
