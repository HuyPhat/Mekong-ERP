import { describe, expect, it } from 'vitest';
import { computeThreeWayMatch, hasMatchExceptions } from './three-way-match';
import type { PurchaseOrderLine, VendorBillLine } from './purchasing-entities';

function poLine(overrides: Partial<PurchaseOrderLine>): PurchaseOrderLine {
  return {
    id: 'pol-1',
    productId: 'prod-1',
    qty: 10,
    unitPrice: 100_000,
    discountPct: 0,
    vatRate: 10,
    lineTotal: 1_000_000,
    ...overrides,
  };
}

function billLine(overrides: Partial<VendorBillLine>): VendorBillLine {
  return {
    id: 'bl-1',
    poLineId: 'pol-1',
    productId: 'prod-1',
    qty: 10,
    unitPrice: 100_000,
    vatRate: 10,
    lineTotal: 1_000_000,
    ...overrides,
  };
}

describe('computeThreeWayMatch', () => {
  it('flags a line as not_received when nothing has arrived yet', () => {
    const [result] = computeThreeWayMatch([poLine({})], new Map(), [billLine({})]);
    expect(result).toMatchObject({ status: 'not_received', receivedQty: 0, billedQty: 10 });
  });

  it('flags a line as not_received when it has arrived but has no bill line yet', () => {
    const received = new Map([['prod-1', 10]]);
    const [result] = computeThreeWayMatch([poLine({})], received, []);
    expect(result).toMatchObject({
      status: 'not_received',
      receivedQty: 10,
      billedQty: null,
      billedUnitPrice: null,
    });
  });

  it('matches when billed qty and price agree exactly with what was received', () => {
    const received = new Map([['prod-1', 10]]);
    const [result] = computeThreeWayMatch([poLine({})], received, [billLine({})]);
    expect(result?.status).toBe('matched');
  });

  it('flags qty_variance when billed qty differs from received qty beyond tolerance', () => {
    const received = new Map([['prod-1', 10]]);
    const [result] = computeThreeWayMatch([poLine({})], received, [billLine({ qty: 8 })]);
    expect(result?.status).toBe('qty_variance');
  });

  it('flags price_variance when qty matches but price exceeds the tolerance', () => {
    const received = new Map([['prod-1', 10]]);
    // PO price 100,000, billed 110,000 -> 10% over, beyond the default 2% tolerance.
    const [result] = computeThreeWayMatch([poLine({})], received, [
      billLine({ unitPrice: 110_000 }),
    ]);
    expect(result?.status).toBe('price_variance');
  });

  it('treats a price difference within the default 2% tolerance as matched', () => {
    const received = new Map([['prod-1', 10]]);
    // 1% over PO price.
    const [result] = computeThreeWayMatch([poLine({})], received, [
      billLine({ unitPrice: 101_000 }),
    ]);
    expect(result?.status).toBe('matched');
  });

  it('prioritizes qty_variance over price_variance when both are off', () => {
    const received = new Map([['prod-1', 10]]);
    const [result] = computeThreeWayMatch([poLine({})], received, [
      billLine({ qty: 7, unitPrice: 200_000 }),
    ]);
    expect(result?.status).toBe('qty_variance');
  });

  it('honors a custom tolerance', () => {
    const received = new Map([['prod-1', 10]]);
    const [result] = computeThreeWayMatch([poLine({})], received, [billLine({ qty: 11 })], {
      pricePct: 0.02,
      qtyAbs: 1,
    });
    expect(result?.status).toBe('matched');
  });

  it('evaluates each PO line independently', () => {
    const received = new Map([
      ['prod-1', 10],
      ['prod-2', 5],
    ]);
    const results = computeThreeWayMatch(
      [
        poLine({ productId: 'prod-1' }),
        poLine({ id: 'pol-2', productId: 'prod-2', qty: 5, lineTotal: 500_000 }),
      ],
      received,
      [
        billLine({ productId: 'prod-1' }),
        billLine({ id: 'bl-2', poLineId: 'pol-2', productId: 'prod-2', qty: 5 }),
      ],
    );
    expect(results).toHaveLength(2);
    expect(results.every((line) => line.status === 'matched')).toBe(true);
  });
});

describe('hasMatchExceptions', () => {
  it('is false when every line matched', () => {
    const received = new Map([['prod-1', 10]]);
    const lines = computeThreeWayMatch([poLine({})], received, [billLine({})]);
    expect(hasMatchExceptions(lines)).toBe(false);
  });

  it('is true when any line has an exception', () => {
    const received = new Map([['prod-1', 10]]);
    const lines = computeThreeWayMatch([poLine({})], received, [billLine({ qty: 3 })]);
    expect(hasMatchExceptions(lines)).toBe(true);
  });
});
