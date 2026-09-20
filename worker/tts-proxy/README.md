# TTS relay

A Cloudflare Worker that fetches Google Translate's Thai voice and returns
it with CORS headers, so the deployed Speaking tab can read the audio. The
dev server does the same job with Vite's `/tts` proxy; this is the
equivalent for GitHub Pages, which cannot proxy.

## Deploy (once)

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up
   (email + password; no card, no domain needed).
2. From this directory:

       pnpm dlx wrangler login     # opens the browser to authorise
       pnpm dlx wrangler deploy    # prints https://thai-tts.<subdomain>.workers.dev

3. Give the site that URL: GitHub → repository → Settings → Secrets and
   variables → Actions → Variables → `VITE_TTS_PROXY` = the printed URL.
   The next push (or a manual run of the Deploy workflow) picks it up.

For a local production build, put the same line in `.env.local`:

    VITE_TTS_PROXY=https://thai-tts.<subdomain>.workers.dev

## Allowed origins

`ALLOWED_ORIGINS` in `wrangler.toml` lists the pages that may read the audio.
Add an origin there and redeploy if the site moves.

## Try it

    curl -sI 'https://thai-tts.<subdomain>.workers.dev/?q=สวัสดี' | head

Expect `200`, `content-type: audio/mpeg`.
