/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
// The React app's headers are the single source of truth (ADR-0012), so this app is
// previewed, and its e2e suite run, under exactly the CSP that one ships with.
import { SECURITY_HEADERS } from '../erp/security-headers.ts';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  preview: { headers: SECURITY_HEADERS },
  // Playwright specs live in e2e/ and must not be collected by Vitest.
  test: { exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'] },
  build: { sourcemap: true },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
