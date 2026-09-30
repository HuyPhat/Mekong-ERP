import { describe, expect, it } from 'vitest';
import {
  bucketForDaysOverdue,
  computeAging,
  computeGeneralLedger,
  computeTrialBalance,
  summarizeAging,
  trialBalanceTotals,
  type AgingDoc,
} from './ledger';
import type { ChartOfAccount, JournalEntry } from './accounting-entities';

const accounts: ChartOfAccount[] = [
  { id: 'a-156', code: '156', name: 'Hàng hóa', type: 'asset', normalBalance: 'debit' },
  {
    id: 'a-331',
    code: '331',
    name: 'Phải trả người bán',
    type: 'liability',
    normalBalance: 'credit',
  },
];

function entry(
  date: string,
  lines: { accountCode: string; accountName: string; debit: number; credit: number }[],
): JournalEntry {
  return {
    id: `je-${date}`,
    number: `JE-${date}`,
    date,
    docType: 'test',
    docId: 'doc-1',
    docNumber: 'DOC-1',
    description: 'test entry',
    lines,
    createdAt: date,
  };
}

describe('computeGeneralLedger', () => {
  it('produces a running balance in chronological order for one account', () => {
    const entries = [
      entry('2026-01-03T00:00:00.000Z', [
        { accountCode: '156', accountName: 'Hàng hóa', debit: 0, credit: 50 },
      ]),
      entry('2026-01-01T00:00:00.000Z', [
        { accountCode: '156', accountName: 'Hàng hóa', debit: 100, credit: 0 },
      ]),
      entry('2026-01-02T00:00:00.000Z', [
        { accountCode: '331', accountName: 'Phải trả người bán', debit: 0, credit: 999 },
      ]),
    ];
    const rows = computeGeneralLedger(entries, '156', 'debit');
    expect(rows.map((row) => row.journalNumber)).toEqual([
      'JE-2026-01-01T00:00:00.000Z',
      'JE-2026-01-03T00:00:00.000Z',
    ]);
    expect(rows.map((row) => row.balance)).toEqual([100, 50]);
  });

  it('decreases balance on the opposite side for a credit-normal account', () => {
    const entries = [
      entry('2026-01-01T00:00:00.000Z', [
        { accountCode: '331', accountName: 'Phải trả người bán', debit: 0, credit: 200 },
      ]),
      entry('2026-01-02T00:00:00.000Z', [
        { accountCode: '331', accountName: 'Phải trả người bán', debit: 80, credit: 0 },
      ]),
    ];
    const rows = computeGeneralLedger(entries, '331', 'credit');
    expect(rows.map((row) => row.balance)).toEqual([200, 120]);
  });
});

describe('computeTrialBalance / trialBalanceTotals', () => {
  it('sums debit and credit per account and stays balanced overall', () => {
    const entries = [
      entry('2026-01-01T00:00:00.000Z', [
        { accountCode: '156', accountName: 'Hàng hóa', debit: 100, credit: 0 },
        { accountCode: '331', accountName: 'Phải trả người bán', debit: 0, credit: 100 },
      ]),
      entry('2026-01-02T00:00:00.000Z', [
        { accountCode: '156', accountName: 'Hàng hóa', debit: 50, credit: 0 },
        { accountCode: '331', accountName: 'Phải trả người bán', debit: 0, credit: 50 },
      ]),
    ];
    const rows = computeTrialBalance(entries, accounts);
    expect(rows).toEqual([
      { accountCode: '156', accountName: 'Hàng hóa', debit: 150, credit: 0 },
      { accountCode: '331', accountName: 'Phải trả người bán', debit: 0, credit: 150 },
    ]);
    const totals = trialBalanceTotals(rows);
    expect(totals.debit).toBe(totals.credit);
  });

  it('falls back to the account code when no chart-of-accounts name matches', () => {
    const entries = [
      entry('2026-01-01T00:00:00.000Z', [
        { accountCode: '999', accountName: 'Unknown', debit: 10, credit: 0 },
      ]),
    ];
    const rows = computeTrialBalance(entries, accounts);
    expect(rows[0]?.accountName).toBe('999');
  });
});

describe('bucketForDaysOverdue', () => {
  it.each([
    [-5, 'current'],
    [0, 'current'],
    [1, '1-30'],
    [30, '1-30'],
    [31, '31-60'],
    [60, '31-60'],
    [61, '61-90'],
    [90, '61-90'],
    [91, '90+'],
  ] as const)('%i days overdue -> %s', (days, bucket) => {
    expect(bucketForDaysOverdue(days)).toBe(bucket);
  });
});

describe('computeAging / summarizeAging', () => {
  const asOf = new Date('2026-03-01T00:00:00.000Z');
  const docs: AgingDoc[] = [
    { id: '1', number: 'INV-1', partyName: 'A', dueDate: '2026-03-05T00:00:00.000Z', amount: 100 },
    { id: '2', number: 'INV-2', partyName: 'B', dueDate: '2026-02-20T00:00:00.000Z', amount: 200 },
    { id: '3', number: 'INV-3', partyName: 'C', dueDate: '2025-11-01T00:00:00.000Z', amount: 300 },
  ];

  it('classifies each doc into the right bucket', () => {
    const rows = computeAging(docs, asOf);
    expect(rows.find((r) => r.number === 'INV-1')?.bucket).toBe('current');
    expect(rows.find((r) => r.number === 'INV-2')?.bucket).toBe('1-30');
    expect(rows.find((r) => r.number === 'INV-3')?.bucket).toBe('90+');
  });

  it('summarizes totals and counts per bucket across all five buckets', () => {
    const summary = summarizeAging(computeAging(docs, asOf));
    expect(summary.map((s) => s.bucket)).toEqual(['current', '1-30', '31-60', '61-90', '90+']);
    expect(summary.find((s) => s.bucket === 'current')).toEqual({
      bucket: 'current',
      total: 100,
      count: 1,
    });
    expect(summary.find((s) => s.bucket === '90+')).toEqual({
      bucket: '90+',
      total: 300,
      count: 1,
    });
    expect(summary.find((s) => s.bucket === '31-60')).toEqual({
      bucket: '31-60',
      total: 0,
      count: 0,
    });
  });
});
