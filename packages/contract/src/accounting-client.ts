import { z } from './zod';
import { request } from './client';
import { ChartOfAccountSchema } from './accounting-entities';

const GeneralLedgerRowSchema = z.object({
  date: z.string(),
  journalNumber: z.string(),
  docType: z.string(),
  docNumber: z.string(),
  description: z.string(),
  debit: z.number().int(),
  credit: z.number().int(),
  balance: z.number().int(),
});

const TrialBalanceRowSchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  debit: z.number().int(),
  credit: z.number().int(),
});

const TrialBalanceResponseSchema = z.object({
  rows: z.array(TrialBalanceRowSchema),
  totals: z.object({ debit: z.number().int(), credit: z.number().int() }),
});

const AgingBucketSchema = z.enum(['current', '1-30', '31-60', '61-90', '90+']);

const AgingRowSchema = z.object({
  id: z.string(),
  number: z.string(),
  partyName: z.string(),
  dueDate: z.string(),
  amount: z.number().int(),
  daysOverdue: z.number().int(),
  bucket: AgingBucketSchema,
});

const AgingSummarySchema = z.object({
  bucket: AgingBucketSchema,
  total: z.number().int(),
  count: z.number().int(),
});

const AgingResponseSchema = z.object({
  rows: z.array(AgingRowSchema),
  summary: z.array(AgingSummarySchema),
});

export function fetchChartOfAccounts() {
  return request('/accounting/chart-of-accounts', z.array(ChartOfAccountSchema));
}

export function fetchGeneralLedger(accountCode: string) {
  return request(
    `/accounting/general-ledger?accountCode=${encodeURIComponent(accountCode)}`,
    z.array(GeneralLedgerRowSchema),
  );
}

export function fetchTrialBalance() {
  return request('/accounting/trial-balance', TrialBalanceResponseSchema);
}

export function fetchArAging() {
  return request('/accounting/ar-aging', AgingResponseSchema);
}

export function fetchApAging() {
  return request('/accounting/ap-aging', AgingResponseSchema);
}
