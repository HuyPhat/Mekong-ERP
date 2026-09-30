import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // Playwright specs live in e2e/ and must not be collected by Vitest.
  test: { exclude: [...configDefaults.exclude, 'e2e/**'] },
});
