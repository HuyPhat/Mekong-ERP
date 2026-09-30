import { test as base, expect, type Page } from '@playwright/test';

// Every spec fails on an unexpected console error or uncaught page error —
// "no console errors" is part of the definition of done, so it is enforced.
export const test = base.extend<{ consoleGuard: boolean; allowedConsoleErrors: RegExp[] }>({
  // Specs that deliberately provoke errors (e.g. injected 503s) must say so, by pattern.
  allowedConsoleErrors: [[], { option: true }],
  consoleGuard: [
    async ({ page, allowedConsoleErrors }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        if (allowedConsoleErrors.some((pattern) => pattern.test(msg.text()))) return;
        problems.push(`console.error: ${msg.text()}`);
      });
      page.on('pageerror', (error) => problems.push(`pageerror: ${String(error)}`));
      await use(true);
      expect(problems, 'unexpected console/page errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function startApp(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.locator('h1, [data-testid="user-menu-trigger"]').first().waitFor();
}

export async function loginAs(page: Page, name: string): Promise<void> {
  await startApp(page, '/login');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await page.getByTestId('user-menu-trigger').waitFor();
}

export async function switchUser(page: Page, name: string): Promise<void> {
  await page.getByTestId('user-menu-trigger').click();
  await page.getByRole('menuitem', { name: new RegExp(name) }).click();
  await expect(page.getByTestId('user-menu-trigger')).toBeVisible();
}

/** Full-URL navigation re-bootstraps the app (MSW worker + hydrate check). */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.getByTestId('user-menu-trigger').waitFor();
}

export const PERSONAS = {
  admin: 'Admin',
  purchasing: 'Nguyễn Văn An',
  warehouse: 'Trần Thị Bình',
  accountant: 'Lê Thị Cúc',
  sales: 'Đỗ Thị Giang',
  manager: 'Phạm Văn Đức',
} as const;

/**
 * Asserts a document status badge by its exact text. `toContainText` on the
 * whole body sees adjacent elements' text run together ("QUO-2026-001307Sent"),
 * so word-boundary patterns can't be trusted, and substring checks would let
 * "Received" pass on a "Partially received" document.
 */
export async function expectStatus(page: Page, label: string): Promise<void> {
  await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
}
