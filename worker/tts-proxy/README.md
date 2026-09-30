# TTS relay

A Cloudflare Worker that fetches Google Translate's Thai (or, with
`&tl=en`, English) voice and returns
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

    curl -sI 'https://thai-tts.<subdomain>.workers.dev/?q=hello&tl=en' | head

Expect `200`, `content-type: audio/mpeg`.

## Pronunciation check (English page, test)

`POST /pronunciation` relays a take to Azure's pronunciation assessment and
adds the Speech key, which never reaches the browser.

1. In the Azure portal create a **Speech** resource on the **Free (F0)**
   tier. It includes a few hours of assessment a month, and past that it
   refuses requests rather than billing.
2. Copy one of its keys and its region (e.g. `westeurope`).
3. From this directory:

       pnpm dlx wrangler secret put AZURE_SPEECH_KEY
       pnpm dlx wrangler secret put AZURE_SPEECH_REGION
       pnpm dlx wrangler deploy

For the dev server, put the same two values in `.env.local` at the repository
root (Vite reads them server-side and adds the key in its `/pron` proxy):

    AZURE_SPEECH_KEY=...
    AZURE_SPEECH_REGION=westeurope

Then tick **Pronunciation check** in the English page's speech recognition
settings.
