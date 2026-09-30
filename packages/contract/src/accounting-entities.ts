import { z } from 'zod';

export const AccountTypeSchema = z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const NormalBalanceSchema = z.enum(['debit', 'credit']);
export type NormalBalance = z.infer<typeof NormalBalanceSchema>;

// Editable VAS-style chart of accounts (PLAN.md §9 risk 6: codes shown are
// illustrative, not asserted against a specific current circular number).
export const ChartOfAccountSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: AccountTypeSchema,
  normalBalance: NormalBalanceSchema,
});
export type ChartOfAccount = z.infer<typeof ChartOfAccountSchema>;

export const JournalLineSchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  debit: z.number().int().nonnegative(),
  credit: z.number().int().nonnegative(),
});
export type JournalLine = z.infer<typeof JournalLineSchema>;

export const JournalEntrySchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  docType: z.string(),
  docId: z.string(),
  docNumber: z.string(),
  description: z.string(),
  lines: z.array(JournalLineSchema),
  createdAt: z.string(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;
