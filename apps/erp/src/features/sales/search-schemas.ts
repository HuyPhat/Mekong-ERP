import { z } from 'zod';

export const CustomersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
});
export type CustomersSearch = z.infer<typeof CustomersSearchSchema>;

export const QuotationsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
});
export type QuotationsSearch = z.infer<typeof QuotationsSearchSchema>;

export const SalesOrdersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
});
export type SalesOrdersSearch = z.infer<typeof SalesOrdersSearchSchema>;

export const CustomerInvoicesSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(1).max(200).catch(50),
  sort: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
});
export type CustomerInvoicesSearch = z.infer<typeof CustomerInvoicesSearchSchema>;
