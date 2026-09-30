import { z } from '@mekong-erp/contract';
import { VatRateSchema } from '@mekong-erp/contract';

export const QuotationFormLineSchema = z.object({
  // productLabel is client-side only, for the combobox's cached display
  // label — not sent to the server. useFieldArray supplies its own `id` on
  // each field item for React keying; this schema deliberately doesn't
  // declare one to avoid colliding with it.
  productId: z.string().min(1),
  productLabel: z.string().optional(),
  qty: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().int().nonnegative(),
  discountPct: z.coerce.number().min(0).max(100),
  vatRate: VatRateSchema,
});

export const QuotationFormSchema = z.object({
  customerId: z.string().min(1),
  customerLabel: z.string().optional(),
  warehouseId: z.string().min(1),
  validUntil: z.string().min(1),
  terms: z.string().min(1),
  lines: z.array(QuotationFormLineSchema).min(1),
});
export type QuotationFormInput = z.input<typeof QuotationFormSchema>;
export type QuotationFormValues = z.output<typeof QuotationFormSchema>;

export function createBlankQuotationLine(): QuotationFormInput['lines'][number] {
  return {
    productId: '',
    productLabel: undefined,
    qty: 1,
    unitPrice: 0,
    discountPct: 0,
    vatRate: 10,
  };
}
