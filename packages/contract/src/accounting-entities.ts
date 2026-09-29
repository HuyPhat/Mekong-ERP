import { z } from 'zod';

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
