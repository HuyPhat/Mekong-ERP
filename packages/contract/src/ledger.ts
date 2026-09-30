// General Ledger, Trial Balance, and AR/AP Aging — all computed on demand
// from JournalEntry/ChartOfAccount at read time rather than a maintained
// running-balance store (ADR-0010). Pure and framework-agnostic like
// money.ts/approval-engine.ts/three-way-match.ts.
import type { ChartOfAccount, JournalEntry } from './accounting-entities';

export interface GeneralLedgerRow {
  date: string;
  journalNumber: string;
  docType: string;
  docNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

/** One account's postings in chronological order with a running balance (increases on the account's own normal-balance side). */
export function computeGeneralLedger(
  entries: JournalEntry[],
  accountCode: string,
  normalBalance: 'debit' | 'credit',
): GeneralLedgerRow[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let balance = 0;
  const rows: GeneralLedgerRow[] = [];
  for (const entry of sorted) {
    for (const line of entry.lines) {
      if (line.accountCode !== accountCode) continue;
      const delta = normalBalance === 'debit' ? line.debit - line.credit : line.credit - line.debit;
      balance += delta;
      rows.push({
        date: entry.date,
        journalNumber: entry.number,
        docType: entry.docType,
        docNumber: entry.docNumber,
        description: entry.description,
        debit: line.debit,
        credit: line.credit,
        balance,
      });
    }
  }
  return rows;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

/** Debit/credit totals per account across every posted journal entry, sorted by account code. */
export function computeTrialBalance(
  entries: JournalEntry[],
  accounts: ChartOfAccount[],
): TrialBalanceRow[] {
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      const current = totals.get(line.accountCode) ?? { debit: 0, credit: 0 };
      current.debit += line.debit;
      current.credit += line.credit;
      totals.set(line.accountCode, current);
    }
  }
  const accountNames = new Map(accounts.map((account) => [account.code, account.name]));
  return Array.from(totals.entries())
    .map(([accountCode, sums]) => ({
      accountCode,
      accountName: accountNames.get(accountCode) ?? accountCode,
      debit: sums.debit,
      credit: sums.credit,
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

export function trialBalanceTotals(rows: TrialBalanceRow[]): { debit: number; credit: number } {
  return rows.reduce(
    (acc, row) => ({ debit: acc.debit + row.debit, credit: acc.credit + row.credit }),
    { debit: 0, credit: 0 },
  );
}

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export interface AgingDoc {
  id: string;
  number: string;
  partyName: string;
  dueDate: string;
  amount: number;
}

export interface AgingRow extends AgingDoc {
  daysOverdue: number;
  bucket: AgingBucket;
}

export function bucketForDaysOverdue(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

/** Buckets a set of still-open documents (unpaid invoices/bills) by days overdue as of a given instant. */
export function computeAging(docs: AgingDoc[], asOf: Date): AgingRow[] {
  return docs.map((doc) => {
    const due = new Date(doc.dueDate);
    const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return { ...doc, daysOverdue, bucket: bucketForDaysOverdue(daysOverdue) };
  });
}

export interface AgingSummary {
  bucket: AgingBucket;
  total: number;
  count: number;
}

const AGING_BUCKETS: AgingBucket[] = ['current', '1-30', '31-60', '61-90', '90+'];

export function summarizeAging(rows: AgingRow[]): AgingSummary[] {
  return AGING_BUCKETS.map((bucket) => {
    const matching = rows.filter((row) => row.bucket === bucket);
    return {
      bucket,
      total: matching.reduce((sum, row) => sum + row.amount, 0),
      count: matching.length,
    };
  });
}
