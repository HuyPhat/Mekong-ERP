// Shared integer-VND arithmetic (ADR-0003) — every computation that produces
// a money value must round through here rather than reimplementing rounding
// per feature.

export function roundVnd(amount: number): number {
  return Math.round(amount);
}

export function computeLineTotal(qty: number, unitPrice: number, discountPct: number): number {
  const gross = qty * unitPrice;
  const discount = gross * (discountPct / 100);
  return roundVnd(gross - discount);
}

export function computeLineVat(lineTotal: number, vatRate: number): number {
  return roundVnd(lineTotal * (vatRate / 100));
}

export interface DocumentTotals {
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
}

export function computeDocumentTotals(
  lines: { lineTotal: number; vatRate: number }[],
): DocumentTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const vatTotal = lines.reduce(
    (sum, line) => sum + computeLineVat(line.lineTotal, line.vatRate),
    0,
  );
  return { subtotal, vatTotal, grandTotal: subtotal + vatTotal };
}

export function isBalanced(lines: { debit: number; credit: number }[]): boolean {
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  return totalDebit === totalCredit;
}
