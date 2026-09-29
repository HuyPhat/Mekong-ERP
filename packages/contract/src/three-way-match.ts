import type { PurchaseOrderLine, VendorBillLine } from './purchasing-entities';

export type MatchLineStatus = 'matched' | 'qty_variance' | 'price_variance' | 'not_received';

export interface MatchLine {
  productId: string;
  poQty: number;
  poUnitPrice: number;
  receivedQty: number;
  billedQty: number | null;
  billedUnitPrice: number | null;
  status: MatchLineStatus;
}

export interface MatchTolerance {
  pricePct: number;
  qtyAbs: number;
}

export const DEFAULT_MATCH_TOLERANCE: MatchTolerance = { pricePct: 0.02, qtyAbs: 0 };

/**
 * Compares each PO line against what was actually received and what the
 * vendor billed, per ADR-0005. `receivedQtyByProduct` is the cumulative
 * quantity across every Goods Receipt posted against this PO.
 */
export function computeThreeWayMatch(
  poLines: PurchaseOrderLine[],
  receivedQtyByProduct: Map<string, number>,
  billLines: VendorBillLine[],
  tolerance: MatchTolerance = DEFAULT_MATCH_TOLERANCE,
): MatchLine[] {
  return poLines.map((poLine) => {
    const receivedQty = receivedQtyByProduct.get(poLine.productId) ?? 0;
    const billLine = billLines.find((candidate) => candidate.productId === poLine.productId);

    if (receivedQty === 0 || !billLine) {
      return {
        productId: poLine.productId,
        poQty: poLine.qty,
        poUnitPrice: poLine.unitPrice,
        receivedQty,
        billedQty: billLine?.qty ?? null,
        billedUnitPrice: billLine?.unitPrice ?? null,
        status: 'not_received',
      };
    }

    const qtyDiff = Math.abs(billLine.qty - receivedQty);
    const priceDiff = Math.abs(billLine.unitPrice - poLine.unitPrice) / poLine.unitPrice;

    const status: MatchLineStatus =
      qtyDiff > tolerance.qtyAbs
        ? 'qty_variance'
        : priceDiff > tolerance.pricePct
          ? 'price_variance'
          : 'matched';

    return {
      productId: poLine.productId,
      poQty: poLine.qty,
      poUnitPrice: poLine.unitPrice,
      receivedQty,
      billedQty: billLine.qty,
      billedUnitPrice: billLine.unitPrice,
      status,
    };
  });
}

export function hasMatchExceptions(lines: MatchLine[]): boolean {
  return lines.some((line) => line.status !== 'matched');
}
