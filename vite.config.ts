/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deploys to https://cwagner22.github.io/thai-cheatsheet/
export default defineConfig({
  plugins: [react()],
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
    },
  },
});
