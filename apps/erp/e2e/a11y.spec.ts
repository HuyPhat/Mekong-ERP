import AxeBuilder from '@axe-core/playwright';
import { test, expect, loginAs, gotoApp, startApp, PERSONAS } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page: import('@playwright/test').Page, label: string) {
  // The pointer is left wherever the last click was; over a chart it opens a
  // tooltip that is mid-fade-in when axe samples its colours.
  await page.mouse.move(0, 0);
  await expect(page.locator('.recharts-tooltip-item')).toHaveCount(0);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }));
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

test('login page has no axe violations', async ({ page }) => {
  await startApp(page, '/login');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await expectNoViolations(page, 'login');
});

const PAGES: {
  label: string;
  persona: keyof typeof PERSONAS;
  path: string;
  ready: RegExp | string;
}[] = [
  { label: 'dashboard', persona: 'accountant', path: '/', ready: 'Revenue (this month)' },
  { label: 'products grid', persona: 'warehouse', path: '/inventory/products', ready: 'grid' },
  { label: 'purchase orders', persona: 'purchasing', path: '/purchasing/orders', ready: 'grid' },
  { label: 'approvals inbox', persona: 'manager', path: '/approvals', ready: 'grid' },
  {
    label: 'trial balance',
    persona: 'accountant',
    path: '/accounting/trial-balance',
    ready: 'Balanced',
  },
];

for (const entry of PAGES) {
  test(`${entry.label} has no axe violations`, async ({ page }) => {
    await loginAs(page, PERSONAS[entry.persona]);
    await gotoApp(page, entry.path);
    if (entry.ready === 'grid') {
      await expect(page.getByRole('grid').or(page.getByRole('table')).first()).toBeVisible();
    } else {
      await expect(page.getByText(entry.ready, { exact: false }).first()).toBeVisible();
    }
    await expectNoViolations(page, entry.label);
  });
}

test('dark theme dashboard has no axe violations', async ({ page }) => {
  await loginAs(page, PERSONAS.accountant);
  await page.getByTestId('theme-toggle').click();
  await expect(page.getByText('Revenue (this month)').first()).toBeVisible();
  await expectNoViolations(page, 'dashboard (dark)');
});

// Radix doesn't warn about a dialog without a title, so an unnamed one passes
// lint, types and the console; only asking for it by name, or axe's
// aria-dialog-name rule, notices. These open the two dialogs the page-level
// scans above never reach.
test('command palette dialog is named and has no axe violations', async ({ page }) => {
  await loginAs(page, PERSONAS.accountant);
  await page.getByRole('button', { name: /Ctrl K/ }).click();
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await expectNoViolations(page, 'command palette');
});

test('searchable picker dialog is named and has no axe violations', async ({ page }) => {
  await loginAs(page, PERSONAS.purchasing);
  await gotoApp(page, '/purchasing/orders/new');
  await page.getByLabel('Supplier', { exact: true }).click();
  await expect(page.getByRole('dialog', { name: /Search suppliers/i })).toBeVisible();
  await expectNoViolations(page, 'supplier picker');
});
