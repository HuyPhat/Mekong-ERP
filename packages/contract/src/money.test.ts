import { describe, expect, it } from 'vitest';
import {
  roundVnd,
  computeLineTotal,
  computeLineVat,
  computeDocumentTotals,
  isBalanced,
} from './money';

describe('roundVnd', () => {
  it('rounds to the nearest whole VND', () => {
    expect(roundVnd(100.4)).toBe(100);
    expect(roundVnd(100.5)).toBe(101);
    expect(roundVnd(100)).toBe(100);
  });
});

describe('computeLineTotal', () => {
  it('multiplies qty by unit price with no discount', () => {
    expect(computeLineTotal(10, 1000, 0)).toBe(10_000);
  });

  it('applies a percentage discount', () => {
    expect(computeLineTotal(10, 1000, 10)).toBe(9_000);
  });

  it('rounds a fractional result to the nearest VND', () => {
    expect(computeLineTotal(3, 1000, 12.5)).toBe(2_625);
  });
});

describe('computeLineVat', () => {
  it('applies the VAT rate to the line total', () => {
    expect(computeLineVat(100_000, 10)).toBe(10_000);
  });

  it('returns 0 for a 0% VAT rate', () => {
    expect(computeLineVat(100_000, 0)).toBe(0);
  });

  it('rounds a fractional VAT amount', () => {
    expect(computeLineVat(1_000, 8)).toBe(80);
  });
});

describe('computeDocumentTotals', () => {
  it('sums subtotal, VAT, and grand total across lines', () => {
    const totals = computeDocumentTotals([
      { lineTotal: 100_000, vatRate: 10 },
      { lineTotal: 50_000, vatRate: 5 },
    ]);
    expect(totals).toEqual({ subtotal: 150_000, vatTotal: 12_500, grandTotal: 162_500 });
  });

  it('returns all zeros for no lines', () => {
    expect(computeDocumentTotals([])).toEqual({ subtotal: 0, vatTotal: 0, grandTotal: 0 });
  });
});

describe('isBalanced', () => {
  it('returns true when total debits equal total credits', () => {
    expect(
      isBalanced([
        { debit: 100_000, credit: 0 },
        { debit: 0, credit: 100_000 },
      ]),
    ).toBe(true);
  });

  it('returns false when debits and credits differ', () => {
    expect(
      isBalanced([
        { debit: 100_000, credit: 0 },
        { debit: 0, credit: 90_000 },
      ]),
    ).toBe(false);
  });

  it('treats an empty journal as balanced', () => {
    expect(isBalanced([])).toBe(true);
  });
});
