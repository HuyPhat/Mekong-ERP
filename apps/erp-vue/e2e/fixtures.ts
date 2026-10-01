import { test as base, expect, type Page } from '@playwright/test';

// Every spec fails on an unexpected console error, uncaught page error or CSP
// violation: "no console errors" is part of the definition of done, so it is enforced.
export const test = base.extend<{ consoleGuard: boolean; allowedConsoleErrors: RegExp[] }>({
  // Specs that provoke errors on purpose (a refused decision is a 403) say so, by pattern.
  allowedConsoleErrors: [[], { option: true }],
  consoleGuard: [
    async ({ page, allowedConsoleErrors }, use) => {
      const problems: string[] = [];
      await page.exposeFunction('__reportCspViolation', (detail: string) => {
        problems.push(`CSP violation: ${detail}`);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (window as unknown as Record<string, (detail: string) => void>)[
            '__reportCspViolation'
          ];
          report?.(
            `${event.violatedDirective} blocked ${event.blockedURI || 'inline/eval'} ` +
              `(${event.sourceFile}:${event.lineNumber})`,
          );
        });
      });
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        if (allowedConsoleErrors.some((pattern) => pattern.test(message.text()))) return;
        problems.push(`console.error: ${message.text()}`);
      });
      page.on('pageerror', (error) => problems.push(`pageerror: ${String(error)}`));
      await use(true);
      expect(problems, 'unexpected console/page errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** The demo logins the inbox is for, by the name shown on the login screen. */
export const PERSONAS = {
  admin: 'Admin',
  manager: 'Phạm Văn Đức',
  finance: 'Ngô Thị Hoa',
  director: 'Hoàng Thị Em',
} as const;

/** Opens the app, waits for the mock backend to be seeded, and logs in as `name`. */
export async function loginAs(page: Page, name: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.getByTestId('signed-in-as')).toContainText(name);
}

/** The app starts in Vietnamese; most specs read English, so they say so before the page loads. */
export async function useEnglish(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('mekong-erp-vue:lang', 'en'));
}

const DAY_MS = 86_400_000;
// Fixed-date public holidays (month-day), kept in step with the contract's list.
const FIXED_HOLIDAYS = ['01-01', '04-30', '05-01', '09-02'];

/**
 * A working day (Monday to Friday, not a fixed holiday) about `daysAhead` days out. The
 * seeded leave history runs to about 75 days from the day it is seeded, so anything
 * further out than that is clear of it, on any day the suite runs.
 */
export function workingDay(daysAhead = 200): string {
  const day = new Date(Date.now() + daysAhead * DAY_MS);
  day.setHours(12, 0, 0, 0);
  for (;;) {
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6 && !FIXED_HOLIDAYS.includes(`${month}-${date}`)) {
      return `${day.getFullYear()}-${month}-${date}`;
    }
    day.setDate(day.getDate() + 1);
  }
}

/** A `yyyy-mm-dd` date moved by whole days. */
export function addDays(date: string, days: number): string {
  // Noon, so a daylight-saving change can't tip the result into the neighbouring day.
  const moved = new Date(`${date}T12:00:00`);
  moved.setDate(moved.getDate() + days);
  const month = String(moved.getMonth() + 1).padStart(2, '0');
  const day = String(moved.getDate()).padStart(2, '0');
  return `${moved.getFullYear()}-${month}-${day}`;
}
