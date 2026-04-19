/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deploys to https://cwagner22.github.io/thai-cheatsheet/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/thai-cheatsheet/',
});
