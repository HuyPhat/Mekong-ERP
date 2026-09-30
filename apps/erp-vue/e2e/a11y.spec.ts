import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, loginAs, useEnglish, PERSONAS } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
  }));
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

test('login screen has no axe violations, in either language', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page, 'login (vi)');
  await page.getByTestId('language-toggle').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Choose an approver' })).toBeVisible();
  await expectNoViolations(page, 'login (en)');
});

test.describe('the inbox', () => {
  test.beforeEach(async ({ page }) => {
    await useEnglish(page);
    await loginAs(page, PERSONAS.manager);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('has no axe violations, with rows of both kinds of document', async ({ page }) => {
    await expectNoViolations(page, 'inbox');
    await page.getByLabel('Type', { exact: true }).selectOption('leave_request');
    await expect(
      page.locator('tbody tr').filter({ hasText: 'Leave request' }).first(),
    ).toBeVisible();
    await expectNoViolations(page, 'inbox (leave)');
  });

  test('has no axe violations with rows selected and a document open', async ({ page }) => {
    const first = page.locator('tbody tr').first();
    await first.getByRole('checkbox').check();
    await expect(page.getByRole('toolbar')).toBeVisible();
    await first.getByRole('button', { name: /^(PO|LV)-/ }).click();
    await expect(page.getByRole('heading', { name: 'Approval history' })).toBeVisible();
    await expectNoViolations(page, 'inbox with selection and detail panel');
  });

  test('has no axe violations in Vietnamese', async ({ page }) => {
    await page.getByTestId('language-toggle').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Hộp thư phê duyệt' })).toBeVisible();
    await expectNoViolations(page, 'inbox (vi)');
  });

  // The dialog is a native <dialog>: named by its title, and everything behind it inert.
  test('comment dialog is named and has no axe violations', async ({ page }) => {
    const first = page.locator('tbody tr').first();
    await first.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByRole('dialog', { name: /^Reject (PO|LV)-/ })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('A comment is required.')).toBeVisible();
    await expectNoViolations(page, 'comment dialog with its error');
  });
});
