import { z } from 'zod';
import { VatRateSchema } from '@mekong-erp/contract';

export const PoWizardLineSchema = z.object({
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

export const PoWizardSchema = z.object({
  supplierId: z.string().min(1),
  supplierLabel: z.string().optional(),
  warehouseId: z.string().min(1),
  deliveryDate: z.string().min(1),
  terms: z.string().min(1),
  lines: z.array(PoWizardLineSchema).min(1),
});
export type PoWizardInput = z.input<typeof PoWizardSchema>;
export type PoWizardValues = z.output<typeof PoWizardSchema>;

export function createBlankWizardLine(): PoWizardInput['lines'][number] {
  return {
    productId: '',
    productLabel: undefined,
    qty: 1,
    unitPrice: 0,
    discountPct: 0,
    vatRate: 10,
  };
}
