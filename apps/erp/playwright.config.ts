import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Specs run against the production build (`vite preview`), not the dev server:
// that is what ships, and the service worker / code-splitting behave
// differently under `vite dev`.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : 3,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    storageState: 'e2e/.auth/seeded.json',
    viewport: { width: 1400, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Sandboxed environments ship a pre-installed Chromium whose revision
      // may not match this Playwright version; CI downloads the matching one.
      ...(process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
        ? { executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] }
        : {}),
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 1000 } },
    },
  ],
  webServer: {
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
