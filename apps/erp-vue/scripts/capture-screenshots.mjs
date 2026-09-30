// Captures the Vue approvals inbox screenshots from the real production build.
// Usage (from apps/erp-vue): pnpm build && pnpm exec vite preview --port 4174 &
//                            node scripts/capture-screenshots.mjs
// There is no saved state to restore: the light seed takes about a second.
/* global process, URL, console, localStorage */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:4174';
const OUT = fileURLToPath(new URL('../../../docs/screenshots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);

async function session(persona, lang) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addInitScript((lang) => localStorage.setItem('mekong-erp-vue:lang', lang), lang);
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: new RegExp(persona) }).click();
  await page.getByTestId('signed-in-as').waitFor();
  await page.locator('tbody tr').first().waitFor();
  return { context, page };
}

async function shot(page, name) {
  await page.mouse.move(1, 1);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log('captured', name);
}

{
  const { context, page } = await session('Phạm Văn Đức', 'en');
  await shot(page, '15-vue-inbox');
  // The detail panel opens beside the list from a row's document number.
  await page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /^(PO|LV)-/ })
    .click();
  const panel = page.locator('#detail-panel');
  await panel.getByRole('heading', { level: 2, name: /^(PO|LV)-/ }).waitFor();
  await shot(page, '16-vue-inbox-detail');
  await context.close();
}

{
  const { context, page } = await session('Phạm Văn Đức', 'vi');
  await shot(page, '17-vue-inbox-vietnamese');
  await context.close();
}

await browser.close();
