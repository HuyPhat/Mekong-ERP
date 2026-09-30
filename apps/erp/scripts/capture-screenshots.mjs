// Captures the README/site screenshots from the real production build.
// Usage (from apps/erp): pnpm build && pnpm exec vite preview --port 4173 &
//                        node scripts/capture-screenshots.mjs
// Reuses e2e/.auth/seeded.json (created by the e2e global setup) so it does
// not pay for a fresh seed.
/* global process, URL, console, localStorage, document */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const OUT = fileURLToPath(new URL('../../../docs/screenshots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);

async function session(persona, { lang = 'en', theme = 'light' } = {}) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/seeded.json',
    viewport: { width: 1360, height: 860 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(
    ({ lang, theme }) => {
      localStorage.setItem('mekong-erp:lang', lang);
      if (theme === 'dark') document.documentElement.classList.add('dark');
    },
    { lang, theme },
  );
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: new RegExp(persona) }).click();
  await page.getByTestId('user-menu-trigger').waitFor();
  if (theme === 'dark') await page.getByTestId('theme-toggle').click();
  return { context, page };
}

async function shot(page, name, { fullPage = false } = {}) {
  // Park the pointer (a hover tooltip would otherwise be captured) and let
  // Recharts' ~1.5 s entrance animation finish so lines are fully drawn.
  await page.mouse.move(1, 1);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage });
  console.log('captured', name);
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`);
  await page.getByTestId('user-menu-trigger').waitFor();
}

{
  const context = await browser.newContext({
    storageState: 'e2e/.auth/seeded.json',
    viewport: { width: 1100, height: 640 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: /Nguyễn Văn An/ }).waitFor();
  await shot(page, '01-login');
  await context.close();
}

{
  const { context, page } = await session('Lê Thị Cúc');
  await page.getByText('Revenue (this month)').first().waitFor();
  await shot(page, '02-dashboard', { fullPage: true });
  await goto(page, '/accounting/trial-balance');
  await page.getByText('Balanced', { exact: true }).waitFor();
  await shot(page, '09-trial-balance');
  await context.close();
}

{
  const { context, page } = await session('Trần Thị Bình');
  await goto(page, '/inventory/products');
  await page.getByRole('grid').waitFor();
  await shot(page, '03-products-grid');
  await goto(page, '/inventory/stock-movements');
  await page.getByRole('grid').waitFor();
  await shot(page, '04-stock-movements-100k');
  await context.close();
}

{
  const { context, page } = await session('Nguyễn Văn An');
  await goto(page, '/purchasing/orders?page=1&pageSize=50&status=pending_approval');
  await page.locator('table tbody tr').first().locator('a').first().click();
  await page
    .getByText(/Pending approval/)
    .first()
    .waitFor();
  await shot(page, '05-po-approval-timeline', { fullPage: true });
  await goto(page, '/purchasing/bills');
  await page.locator('table tbody tr').first().locator('a').first().click();
  await page
    .getByText(/tolerance|exception|match/i)
    .first()
    .waitFor();
  await shot(page, '06-three-way-match', { fullPage: true });
  await context.close();
}

{
  const { context, page } = await session('Phạm Văn Đức');
  await goto(page, '/approvals');
  await page.getByRole('grid').waitFor();
  await shot(page, '07-approvals-inbox');
  await context.close();
}

{
  const { context, page } = await session('Đỗ Thị Giang');
  await goto(page, '/sales/invoices');
  await page.locator('table tbody tr').first().locator('a').first().click();
  await page.getByRole('link', { name: /Preview \/ print/i }).click();
  await page
    .getByText(/VAT Invoice/i)
    .first()
    .waitFor();
  await shot(page, '08-e-invoice-preview', { fullPage: true });
  await context.close();
}

{
  const { context, page } = await session('Lê Thị Cúc', { lang: 'vi', theme: 'dark' });
  await page.getByText('Doanh thu (tháng này)').first().waitFor();
  await shot(page, '10-dashboard-dark-vietnamese', { fullPage: true });
  await context.close();
}

{
  const { context, page } = await session('Admin');
  // Show the defaults a first-time visitor sees; the seeded test state turns latency off.
  await page.evaluate(() => localStorage.removeItem('mekong.devpanel'));
  await page.reload();
  await page.getByTestId('user-menu-trigger').waitFor();
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('demo-tools-item').click();
  await page.getByRole('dialog').waitFor();
  await shot(page, '11-demo-tools');
  await context.close();
}

await browser.close();
