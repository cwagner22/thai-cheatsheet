/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deploys to https://cwagner22.github.io/thai-cheatsheet/
export default defineConfig(({ mode }) => {
  const secret = loadEnv(mode, process.cwd(), 'AZURE_');
  const azureKey = secret.AZURE_SPEECH_KEY;
  const azureRegion = secret.AZURE_SPEECH_REGION;
  return {
    plugins: [react()],
    // The Whisper worker imports transformers.js, which splits itself into
    // chunks; only ES-module workers can load chunks.
    worker: { format: 'es' },
    base: process.env.VITE_BASE ?? '/thai-cheatsheet/',
    server: {
      proxy: {
        // Google's translate_tts serves audio without Access-Control-Allow-Origin,
        // so a browser can play it but never read its samples. Proxying it makes
        // it same-origin, which is what lets the Speaking tab run the native
        // voice through the same analyser as the microphone. It also 404s any
        // request carrying a Referer from outside google.com, hence the strip.
        // Dev server only: the deployed site uses the relay in worker/tts-proxy.
        '/tts': {
          target: 'https://translate.google.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/tts/, '/translate_tts'),
          configure: proxy => {
            proxy.on('proxyReq', req => req.removeHeader('referer'));
          },
        },
        // Azure's pronunciation assessment, with the Speech key added here so
        // it never reaches the page. AZURE_SPEECH_KEY and AZURE_SPEECH_REGION
        // come from the local env file (no VITE_ prefix, so Vite keeps them
        // out of the bundle); without them /pron is not proxied, the request
        // 404s, and the page says the check is not set up. The deployed site
        // uses the relay Worker instead.
        ...(azureKey && azureRegion
          ? {
              '/pron': {
                target: `https://${azureRegion}.stt.speech.microsoft.com`,
                changeOrigin: true,
                rewrite: (path: string) =>
                  path.replace(/^\/pron/, '/speech/recognition/conversation/cognitiveservices/v1'),
                headers: { 'Ocp-Apim-Subscription-Key': azureKey },
              },
            }
          : {}),
      },
    },
  };
});
