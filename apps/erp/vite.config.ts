/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath, URL } from 'node:url';
import { SECURITY_HEADERS } from './security-headers.ts';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  // Only `preview` (the production build) is served with the strict CSP: the
  // dev server needs inline scripts for React Refresh.
  preview: { headers: SECURITY_HEADERS },
  // Playwright specs live in e2e/ and must not be collected by Vitest.
  test: { exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'] },
  // The repository is public; readable stack traces beat obscurity for a portfolio.
  build: { sourcemap: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
