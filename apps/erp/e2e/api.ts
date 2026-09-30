import type { Page } from '@playwright/test';

/**
 * Calls the mock API from inside the page, the way the app does, so the real MSW
 * handlers, IndexedDB persistence and service worker are all in the loop. The
 * caller says what shape it expects back; the response isn't validated here.
 */
export async function api<T>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: T }> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, json: (await response.json()) as T };
    },
    { method, path, body },
  );
}
