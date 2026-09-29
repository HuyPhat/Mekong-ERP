import { faker } from '@faker-js/faker';
import type { StockMovement } from '../entities';
import type {
  GoodsReceipt,
  GoodsReceiptLine,
  PurchaseOrder,
  PurchaseOrderStatus,
  VendorBill,
  VendorBillLine,
  VendorBillStatus,
} from '../purchasing-entities';
import type { Approval, ApprovalRule } from '../approval-entities';
import type { AuditLogEntry } from '../audit-entities';
import type { JournalEntry } from '../accounting-entities';
import { createApprovalChain, resolveApprovalRoles } from '../approval-engine';
import { computeThreeWayMatch, hasMatchExceptions } from '../three-way-match';
import { computeDocumentTotals, roundVnd } from '../money';
import { generateDocumentNumber } from '../document-number';

type LifecycleOutcome =
  | 'draft'
  | 'pending_approval'
  | 'rejected'
  | 'changes_requested'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'billed'
  | 'closed';

const OUTCOME_WEIGHTS: { outcome: LifecycleOutcome; weight: number }[] = [
  { outcome: 'draft', weight: 15 },
  { outcome: 'pending_approval', weight: 10 },
  { outcome: 'rejected', weight: 5 },
  { outcome: 'changes_requested', weight: 5 },
  { outcome: 'approved', weight: 15 },
  { outcome: 'partially_received', weight: 15 },
  { outcome: 'received', weight: 15 },
  { outcome: 'billed', weight: 10 },
  { outcome: 'closed', weight: 10 },
];

export interface ProcurementSeedResult {
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  vendorBills: VendorBill[];
  approvals: Approval[];
  journalEntries: JournalEntry[];
  auditLogEntries: AuditLogEntry[];
  stockMovements: StockMovement[];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function auditEntry(
  entityType: string,
  entityId: string,
  entityNumber: string,
  action: string,
  actorId: string,
  before: string,
  after: string,
  at: string,
): AuditLogEntry {
  return {
    id: faker.string.uuid(),
    entityType,
    entityId,
    entityNumber,
    action,
    actorId,
    before: { status: before },
    after: { status: after },
    at,
  };
}

export function generateProcurementData(
  drafts: PurchaseOrder[],
  rules: ApprovalRule[],
): ProcurementSeedResult {
  faker.seed(20260107);

  const purchaseOrders: PurchaseOrder[] = [];
  const goodsReceipts: GoodsReceipt[] = [];
  const vendorBills: VendorBill[] = [];
  const approvals: Approval[] = [];
  const journalEntries: JournalEntry[] = [];
  const auditLogEntries: AuditLogEntry[] = [];
  const stockMovements: StockMovement[] = [];

  let grnSeq = 0;
  let billSeq = 0;
  let journalSeq = 0;

  for (const draft of drafts) {
    const outcome = faker.helpers.weightedArrayElement(
      OUTCOME_WEIGHTS.map((entry) => ({ weight: entry.weight, value: entry.outcome })),
    );
    const orderDate = new Date(draft.orderDate);
    const roles = resolveApprovalRoles(rules, 'purchase_order', draft.grandTotal);
    const year = orderDate.getFullYear();

    if (outcome === 'draft') {
      purchaseOrders.push(draft);
      continue;
    }

    // Every non-draft outcome starts by submitting for approval.
    const submittedAt = addDays(orderDate, 1).toISOString();
    let chain = createApprovalChain(
      'purchase_order',
      draft.id,
      draft.number,
      roles,
      () => faker.string.uuid(),
      submittedAt,
    );
    auditLogEntries.push(
      auditEntry(
        'purchase_order',
        draft.id,
        draft.number,
        'submitted',
        draft.createdBy,
        'draft',
        'pending_approval',
        submittedAt,
      ),
    );

    let status: PurchaseOrderStatus = 'pending_approval';
    let decisionAt = submittedAt;

    if (outcome === 'pending_approval') {
      const cut = chain.length > 1 ? faker.number.int({ min: 0, max: chain.length - 2 }) : 0;
      chain = chain.map((step, index) => {
        if (index >= cut) return step;
        decisionAt = addDays(new Date(decisionAt), 1).toISOString();
        return {
          ...step,
          status: 'approved' as const,
          decidedBy: step.approverRole,
          decidedAt: decisionAt,
        };
      });
    } else if (outcome === 'rejected' || outcome === 'changes_requested') {
      const stopAt = faker.number.int({ min: 0, max: chain.length - 1 });
      chain = chain.map((step, index) => {
        decisionAt = addDays(new Date(decisionAt), 1).toISOString();
        if (index < stopAt)
          return {
            ...step,
            status: 'approved' as const,
            decidedBy: step.approverRole,
            decidedAt: decisionAt,
          };
        if (index === stopAt)
          return {
            ...step,
            status: outcome,
            decidedBy: step.approverRole,
            decidedAt: decisionAt,
            comment:
              outcome === 'rejected' ? 'Giá vượt ngân sách quý.' : 'Cần bổ sung báo giá so sánh.',
          };
        return { ...step, status: 'skipped' as const };
      });
      status = outcome;
      auditLogEntries.push(
        auditEntry(
          'purchase_order',
          draft.id,
          draft.number,
          outcome,
          chain[stopAt]?.approverRole ?? 'system',
          'pending_approval',
          outcome,
          decisionAt,
        ),
      );
    } else {
      // approved, partially_received, received, billed, closed all pass through a fully-approved chain first.
      chain = chain.map((step) => {
        decisionAt = addDays(new Date(decisionAt), 1).toISOString();
        return {
          ...step,
          status: 'approved' as const,
          decidedBy: step.approverRole,
          decidedAt: decisionAt,
        };
      });
      status = 'approved';
      auditLogEntries.push(
        auditEntry(
          'purchase_order',
          draft.id,
          draft.number,
          'approved',
          chain.at(-1)?.approverRole ?? 'system',
          'pending_approval',
          'approved',
          decisionAt,
        ),
      );
    }

    approvals.push(...chain);

    let po: PurchaseOrder = { ...draft, status, submittedAt };

    if (
      outcome === 'approved' ||
      outcome === 'partially_received' ||
      outcome === 'received' ||
      outcome === 'billed' ||
      outcome === 'closed'
    ) {
      const isPartial = outcome === 'partially_received';
      let receivedAt = decisionAt;

      const grnLines: GoodsReceiptLine[] = po.lines.map((line) => ({
        id: faker.string.uuid(),
        poLineId: line.id,
        productId: line.productId,
        receivedQty: isPartial
          ? Math.max(1, Math.round(line.qty * faker.number.float({ min: 0.3, max: 0.8 })))
          : line.qty,
      }));

      if (outcome !== 'approved') {
        receivedAt = addDays(
          new Date(decisionAt),
          faker.number.int({ min: 1, max: 5 }),
        ).toISOString();
        grnSeq += 1;
        const grnNumber = generateDocumentNumber('GRN', year, grnSeq);
        const grn: GoodsReceipt = {
          id: faker.string.uuid(),
          number: grnNumber,
          poId: po.id,
          warehouseId: po.warehouseId,
          lines: grnLines,
          receivedAt,
          receivedBy: 'warehouse',
        };
        goodsReceipts.push(grn);

        for (const line of grnLines) {
          stockMovements.push({
            id: faker.string.uuid(),
            productId: line.productId,
            warehouseId: po.warehouseId,
            type: 'in',
            quantity: line.receivedQty,
            reference: grnNumber,
            occurredAt: receivedAt,
          });
        }

        const grnValue = grnLines.reduce((sum, line) => {
          const poLine = po.lines.find((candidate) => candidate.id === line.poLineId);
          if (!poLine) return sum;
          const effectiveUnitPrice = poLine.lineTotal / poLine.qty;
          return sum + roundVnd(line.receivedQty * effectiveUnitPrice);
        }, 0);
        journalSeq += 1;
        journalEntries.push({
          id: faker.string.uuid(),
          number: generateDocumentNumber('JE', year, journalSeq),
          date: receivedAt,
          docType: 'goods_receipt',
          docId: grn.id,
          docNumber: grn.number,
          description: `Nhập kho theo ${grn.number}`,
          lines: [
            { accountCode: '156', accountName: 'Hàng hóa', debit: grnValue, credit: 0 },
            { accountCode: '331', accountName: 'Phải trả người bán', debit: 0, credit: grnValue },
          ],
          createdAt: receivedAt,
        });

        status = isPartial ? 'partially_received' : 'received';
        auditLogEntries.push(
          auditEntry(
            'purchase_order',
            po.id,
            po.number,
            'received',
            'warehouse',
            'approved',
            status,
            receivedAt,
          ),
        );
      }

      po = { ...po, status };

      if (outcome === 'billed' || outcome === 'closed') {
        const introduceVariance = faker.number.int({ min: 1, max: 10 }) <= 3;
        const billLines: VendorBillLine[] = po.lines.map((line) => {
          const qtyVariance =
            introduceVariance && faker.datatype.boolean()
              ? faker.number.int({ min: 1, max: 3 })
              : 0;
          const priceVariance =
            introduceVariance && !qtyVariance ? faker.number.float({ min: 0.03, max: 0.08 }) : 0;
          const qty = Math.max(1, line.qty - qtyVariance);
          const unitPrice = roundVnd(line.unitPrice * (1 + priceVariance));
          return {
            id: faker.string.uuid(),
            poLineId: line.id,
            productId: line.productId,
            qty,
            unitPrice,
            vatRate: line.vatRate,
            lineTotal: roundVnd(qty * unitPrice),
          };
        });
        const billTotals = computeDocumentTotals(billLines);
        const billDate = addDays(
          new Date(receivedAt),
          faker.number.int({ min: 1, max: 4 }),
        ).toISOString();
        billSeq += 1;
        const billNumber = generateDocumentNumber('BILL', year, billSeq);

        const receivedByProduct = new Map(
          grnLines.map((line) => [line.productId, line.receivedQty]),
        );
        const matchLines = computeThreeWayMatch(po.lines, receivedByProduct, billLines);
        const exceptions = hasMatchExceptions(matchLines);

        let billStatus: VendorBillStatus = 'pending_match';
        let matchOverrideReason: string | undefined;
        let paidAt: string | undefined;

        if (outcome === 'closed') {
          matchOverrideReason = exceptions
            ? 'Chênh lệch trong ngưỡng chấp nhận được, đã xác nhận với nhà cung cấp.'
            : undefined;
          const matchedAt = addDays(new Date(billDate), 1).toISOString();
          paidAt = addDays(
            new Date(matchedAt),
            faker.number.int({ min: 1, max: 10 }),
          ).toISOString();
          billStatus = 'paid';
        }

        const bill: VendorBill = {
          id: faker.string.uuid(),
          number: billNumber,
          supplierId: po.supplierId,
          poId: po.id,
          lines: billLines,
          subtotal: billTotals.subtotal,
          vatTotal: billTotals.vatTotal,
          grandTotal: billTotals.grandTotal,
          status: billStatus,
          dueDate: addDays(new Date(billDate), 30).toISOString(),
          createdAt: billDate,
          ...(paidAt ? { paidAt } : {}),
          ...(matchOverrideReason ? { matchOverrideReason } : {}),
        };
        vendorBills.push(bill);

        journalSeq += 1;
        journalEntries.push({
          id: faker.string.uuid(),
          number: generateDocumentNumber('JE', year, journalSeq),
          date: billDate,
          docType: 'vendor_bill',
          docId: bill.id,
          docNumber: bill.number,
          description: `Ghi nhận thuế GTGT đầu vào ${bill.number}`,
          lines: [
            {
              accountCode: '1331',
              accountName: 'Thuế GTGT được khấu trừ',
              debit: bill.vatTotal,
              credit: 0,
            },
            {
              accountCode: '331',
              accountName: 'Phải trả người bán',
              debit: 0,
              credit: bill.vatTotal,
            },
          ],
          createdAt: billDate,
        });
        auditLogEntries.push(
          auditEntry(
            'purchase_order',
            po.id,
            po.number,
            'billed',
            'purchasing',
            status,
            'billed',
            billDate,
          ),
        );

        po = { ...po, status: 'billed' };

        if (outcome === 'closed' && paidAt) {
          journalSeq += 1;
          journalEntries.push({
            id: faker.string.uuid(),
            number: generateDocumentNumber('JE', year, journalSeq),
            date: paidAt,
            docType: 'payment',
            docId: bill.id,
            docNumber: bill.number,
            description: `Thanh toán ${bill.number}`,
            lines: [
              {
                accountCode: '331',
                accountName: 'Phải trả người bán',
                debit: bill.grandTotal,
                credit: 0,
              },
              {
                accountCode: '112',
                accountName: 'Tiền gửi ngân hàng',
                debit: 0,
                credit: bill.grandTotal,
              },
            ],
            createdAt: paidAt,
          });
          auditLogEntries.push(
            auditEntry(
              'vendor_bill',
              bill.id,
              bill.number,
              'paid',
              'purchasing',
              'approved_for_payment',
              'paid',
              paidAt,
            ),
          );
          po = { ...po, status: 'closed' };
        }
      }
    }

    purchaseOrders.push(po);
  }

  return {
    purchaseOrders,
    goodsReceipts,
    vendorBills,
    approvals,
    journalEntries,
    auditLogEntries,
    stockMovements,
  };
}
