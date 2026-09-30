import { defineConfig } from 'vitest/config';

// Coverage is scoped to the pure domain-logic modules — the code where a bug
// silently corrupts money, approvals or the ledger. Handlers, generated seed
// data and thin fetch clients are exercised by the Playwright suite instead,
// so counting them here would dilute the number without measuring anything.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/approval-engine.ts',
        'src/demo-users.ts',
        'src/dev-config.ts',
        'src/document-number.ts',
        'src/leave.ts',
        'src/ledger.ts',
        'src/list-query.ts',
        'src/money.ts',
        'src/three-way-match.ts',
        'src/vnd-words.ts',
        'src/seed/stock-levels.ts',
      ],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
    },
  },
});
