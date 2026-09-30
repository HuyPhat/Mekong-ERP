import { chromium, type FullConfig } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';

const STATE_PATH = 'e2e/.auth/seeded.json';

// Seeding 110k+ records into IndexedDB is a 20–30 s one-time cost. Do it once
// here and hand every test a pre-seeded storage state (IndexedDB included), so
// each test still starts from pristine data without paying for a reseed.
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error('baseURL is required for e2e global setup');
  mkdirSync('e2e/.auth', { recursive: true });
  // Local iteration shortcut: reuse the last seeded state instead of reseeding (~1 min).
  if (process.env['E2E_REUSE_SEED'] && existsSync(STATE_PATH)) return;

  const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(baseURL);
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 120_000 });
    await page.evaluate(() => {
      localStorage.setItem('mekong-erp:lang', 'en');
      // Fast mocked network for specs; the demo-tools spec re-enables latency/failures.
      localStorage.setItem(
        'mekong.devpanel',
        JSON.stringify({
          latencyEnabled: false,
          latencyMinMs: 150,
          latencyMaxMs: 600,
          failureRatePct: 0,
        }),
      );
    });
    await context.storageState({ path: STATE_PATH, indexedDB: true });
  } finally {
    await browser.close();
  }
}
