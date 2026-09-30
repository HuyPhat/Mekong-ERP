import { http, HttpResponse } from 'msw';
import { z } from '../../zod';
import {
  approvalRulesStore,
  approvalsStore,
  goodsReceiptsStore,
  journalEntriesStore,
  purchaseOrdersStore,
  stockLevelsStore,
  stockMovementsStore,
  suppliersStore,
  vendorBillsStore,
} from '../../db/store';
import { ensureSeeded } from '../../seed';
import { applySort, matchesSearch, paginate, parseListParams } from '../../list-query';
import type { StockMovement } from '../../entities';
import {
  VatRateSchema,
  type GoodsReceiptLine,
  type PurchaseOrder,
  type PurchaseOrderLine,
  type VendorBill,
  type VendorBillLine,
} from '../../purchasing-entities';
import {
  createApprovalChain,
  currentApprovalStep,
  decideApproval,
  resolveApprovalRoles,
} from '../../approval-engine';
import { computeThreeWayMatch, hasMatchExceptions } from '../../three-way-match';
import { computeDocumentTotals, computeLineTotal, roundVnd } from '../../money';
import { generateDocumentNumber } from '../../document-number';
import { writeAudit } from './audit';
import { broadcastEvent } from '../ws';

function currentYear(): number {
  return new Date().getFullYear();
}

function nextNumber(prefix: string, existingNumbers: string[]): string {
  const sequence = existingNumbers.length + 1;
  return generateDocumentNumber(prefix, currentYear(), sequence);
}

function supplierName(supplierId: string): string {
  return suppliersStore.get(supplierId)?.name ?? '';
}

function poView(po: PurchaseOrder) {
  return { ...po, supplierName: supplierName(po.supplierId) };
}

const CreatePurchaseOrderLineSchema = z.object({
  productId: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  discountPct: z.number().min(0).max(100),
  vatRate: VatRateSchema,
});

const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string(),
  warehouseId: z.string(),
  deliveryDate: z.string(),
  terms: z.string(),
  lines: z.array(CreatePurchaseOrderLineSchema).min(1),
});

function buildLines(input: z.infer<typeof CreatePurchaseOrderLineSchema>[]): PurchaseOrderLine[] {
  return input.map((line) => ({
    id: crypto.randomUUID(),
    productId: line.productId,
    qty: line.qty,
    unitPrice: line.unitPrice,
    discountPct: line.discountPct,
    vatRate: line.vatRate,
    lineTotal: computeLineTotal(line.qty, line.unitPrice, line.discountPct),
  }));
}

const ReceiveLineSchema = z.object({
  poLineId: z.string(),
  productId: z.string(),
  receivedQty: z.number().int().positive(),
});
const ReceiveSchema = z.object({ lines: z.array(ReceiveLineSchema).min(1) });

const CreateBillLineSchema = z.object({
  poLineId: z.string(),
  productId: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  vatRate: VatRateSchema,
});
const CreateBillSchema = z.object({
  poId: z.string(),
  lines: z.array(CreateBillLineSchema).min(1),
});

const DecideApprovalSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'changes_requested']),
  comment: z.string().optional(),
  actorId: z.string(),
});

function cumulativeReceivedByProduct(poId: string): Map<string, number> {
  const byProduct = new Map<string, number>();
  for (const grn of goodsReceiptsStore.list()) {
    if (grn.poId !== poId) continue;
    for (const line of grn.lines) {
      byProduct.set(line.productId, (byProduct.get(line.productId) ?? 0) + line.receivedQty);
    }
  }
  return byProduct;
}

function isFullyReceived(po: PurchaseOrder, receivedByProduct: Map<string, number>): boolean {
  return po.lines.every((line) => (receivedByProduct.get(line.productId) ?? 0) >= line.qty);
}

export const purchasingHandlers = [
  http.get('/api/suppliers', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [{ field: 'name', direction: 'asc' }]);
    let items = suppliersStore.list();
    items = items.filter((supplier) => matchesSearch(supplier, q, ['name', 'code', 'taxCode']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/suppliers/:id', async ({ params }) => {
    await ensureSeeded();
    const supplier = suppliersStore.get(String(params.id));
    if (!supplier) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Supplier not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(supplier);
  }),

  http.get('/api/purchase-orders', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'orderDate', direction: 'desc' },
    ]);
    const statuses = url.searchParams.get('filter[status]')?.split(',').filter(Boolean) ?? [];
    const supplierId = url.searchParams.get('filter[supplierId]');
    const orderFrom = url.searchParams.get('filter[orderFrom]');
    const orderTo = url.searchParams.get('filter[orderTo]');

    let items = purchaseOrdersStore.list().map(poView);
    if (statuses.length > 0) items = items.filter((po) => statuses.includes(po.status));
    if (supplierId) items = items.filter((po) => po.supplierId === supplierId);
    if (orderFrom) items = items.filter((po) => po.orderDate >= orderFrom);
    if (orderTo) items = items.filter((po) => po.orderDate <= `${orderTo}T23:59:59.999Z`);
    items = items.filter((po) => matchesSearch(po, q, ['number', 'supplierName']));
    items = applySort(items, sort);

    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/purchase-orders/:id', async ({ params }) => {
    await ensureSeeded();
    const po = purchaseOrdersStore.get(String(params.id));
    if (!po) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Purchase order not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(poView(po));
  }),

  http.post('/api/purchase-orders', async ({ request }) => {
    await ensureSeeded();
    const body: unknown = await request.json();
    const parsed = CreatePurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid purchase order',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    const now = new Date().toISOString();
    const lines = buildLines(parsed.data.lines);
    const totals = computeDocumentTotals(lines);
    const po: PurchaseOrder = {
      id: crypto.randomUUID(),
      number: nextNumber(
        'PO',
        purchaseOrdersStore.list().map((existing) => existing.number),
      ),
      supplierId: parsed.data.supplierId,
      warehouseId: parsed.data.warehouseId,
      status: 'draft',
      orderDate: now,
      deliveryDate: parsed.data.deliveryDate,
      terms: parsed.data.terms,
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      createdBy: 'purchasing',
      createdAt: now,
    };
    await purchaseOrdersStore.put(po);
    await writeAudit(
      'purchase_order',
      po.id,
      po.number,
      'created',
      po.createdBy,
      undefined,
      'draft',
      now,
    );
    return HttpResponse.json(poView(po), { status: 201 });
  }),

  http.patch('/api/purchase-orders/:id', async ({ params, request }) => {
    await ensureSeeded();
    const existing = purchaseOrdersStore.get(String(params.id));
    if (!existing) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Purchase order not found' },
        { status: 404 },
      );
    }
    if (existing.status !== 'draft' && existing.status !== 'changes_requested') {
      return HttpResponse.json(
        {
          code: 'INVALID_STATUS',
          message: 'Only draft or changes-requested purchase orders can be edited',
        },
        { status: 409 },
      );
    }
    const body: unknown = await request.json();
    const parsed = CreatePurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid purchase order',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    const lines = buildLines(parsed.data.lines);
    const totals = computeDocumentTotals(lines);
    const updated: PurchaseOrder = {
      ...existing,
      supplierId: parsed.data.supplierId,
      warehouseId: parsed.data.warehouseId,
      deliveryDate: parsed.data.deliveryDate,
      terms: parsed.data.terms,
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
    };
    await purchaseOrdersStore.put(updated);
    return HttpResponse.json(poView(updated));
  }),

  http.post('/api/purchase-orders/:id/submit', async ({ params }) => {
    await ensureSeeded();
    const po = purchaseOrdersStore.get(String(params.id));
    if (!po) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Purchase order not found' },
        { status: 404 },
      );
    }
    if (po.status !== 'draft' && po.status !== 'changes_requested') {
      return HttpResponse.json(
        {
          code: 'INVALID_STATUS',
          message: 'Only draft or changes-requested purchase orders can be submitted',
        },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const rules = approvalRulesStore.list();
    const roles = resolveApprovalRoles(rules, 'purchase_order', po.grandTotal);
    if (roles.length === 0) {
      return HttpResponse.json(
        { code: 'NO_APPROVAL_RULE', message: 'No approval rule matches this amount' },
        { status: 422 },
      );
    }
    // Replace any prior chain from a previous submit-then-changes-requested cycle.
    const remaining = approvalsStore.list().filter((approval) => approval.docId !== po.id);
    const chain = createApprovalChain(
      'purchase_order',
      po.id,
      po.number,
      roles,
      () => crypto.randomUUID(),
      now,
    );
    await Promise.all([...remaining, ...chain].map((approval) => approvalsStore.put(approval)));

    const updated: PurchaseOrder = { ...po, status: 'pending_approval', submittedAt: now };
    await purchaseOrdersStore.put(updated);
    await writeAudit(
      'purchase_order',
      po.id,
      po.number,
      'submitted',
      'purchasing',
      po.status,
      'pending_approval',
      now,
    );
    const firstStep = currentApprovalStep(chain);
    if (firstStep) {
      broadcastEvent({
        type: 'approval.requested',
        docType: 'purchase_order',
        docId: po.id,
        docNumber: po.number,
        approverRole: firstStep.approverRole,
      });
    }
    return HttpResponse.json(poView(updated));
  }),

  http.post('/api/purchase-orders/:id/cancel', async ({ params }) => {
    await ensureSeeded();
    const po = purchaseOrdersStore.get(String(params.id));
    if (!po) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Purchase order not found' },
        { status: 404 },
      );
    }
    if (!['draft', 'rejected', 'changes_requested'].includes(po.status)) {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'This purchase order cannot be cancelled' },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updated: PurchaseOrder = { ...po, status: 'cancelled' };
    await purchaseOrdersStore.put(updated);
    await writeAudit(
      'purchase_order',
      po.id,
      po.number,
      'cancelled',
      'purchasing',
      po.status,
      'cancelled',
      now,
    );
    return HttpResponse.json(poView(updated));
  }),

  http.post('/api/purchase-orders/:id/receive', async ({ params, request }) => {
    await ensureSeeded();
    const po = purchaseOrdersStore.get(String(params.id));
    if (!po) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Purchase order not found' },
        { status: 404 },
      );
    }
    if (po.status !== 'approved' && po.status !== 'partially_received') {
      return HttpResponse.json(
        { code: 'INVALID_STATUS', message: 'Only approved purchase orders can be received' },
        { status: 409 },
      );
    }
    const body: unknown = await request.json();
    const parsed = ReceiveSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid receipt',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }

    const now = new Date().toISOString();
    const grnLines: GoodsReceiptLine[] = parsed.data.lines.map((line) => ({
      id: crypto.randomUUID(),
      poLineId: line.poLineId,
      productId: line.productId,
      receivedQty: line.receivedQty,
    }));
    const grnNumber = nextNumber(
      'GRN',
      goodsReceiptsStore.list().map((existing) => existing.number),
    );
    const grn = {
      id: crypto.randomUUID(),
      number: grnNumber,
      poId: po.id,
      warehouseId: po.warehouseId,
      lines: grnLines,
      receivedAt: now,
      receivedBy: 'warehouse',
    };
    await goodsReceiptsStore.put(grn);

    for (const line of grnLines) {
      const movement: StockMovement = {
        id: crypto.randomUUID(),
        productId: line.productId,
        warehouseId: po.warehouseId,
        type: 'in',
        quantity: line.receivedQty,
        reference: grnNumber,
        occurredAt: now,
      };
      await stockMovementsStore.put(movement);

      const levelId = `${line.productId}:${po.warehouseId}`;
      const existingLevel = stockLevelsStore.get(levelId);
      const quantityOnHand = (existingLevel?.quantityOnHand ?? 0) + line.receivedQty;
      await stockLevelsStore.put({
        id: levelId,
        productId: line.productId,
        warehouseId: po.warehouseId,
        quantityOnHand,
      });
      broadcastEvent({
        type: 'stock.changed',
        productId: line.productId,
        warehouseId: po.warehouseId,
        quantityOnHand,
      });
    }

    const grnValue = grnLines.reduce((sum, line) => {
      const poLine = po.lines.find((candidate) => candidate.id === line.poLineId);
      if (!poLine) return sum;
      return sum + roundVnd(line.receivedQty * (poLine.lineTotal / poLine.qty));
    }, 0);
    const journalNumber = nextNumber(
      'JE',
      journalEntriesStore.list().map((existing) => existing.number),
    );
    await journalEntriesStore.put({
      id: crypto.randomUUID(),
      number: journalNumber,
      date: now,
      docType: 'goods_receipt',
      docId: grn.id,
      docNumber: grn.number,
      description: `Nhập kho theo ${grn.number}`,
      lines: [
        { accountCode: '156', accountName: 'Hàng hóa', debit: grnValue, credit: 0 },
        { accountCode: '331', accountName: 'Phải trả người bán', debit: 0, credit: grnValue },
      ],
      createdAt: now,
    });
    broadcastEvent({
      type: 'document.posted',
      docType: 'goods_receipt',
      docId: grn.id,
      docNumber: grn.number,
    });

    const receivedByProduct = cumulativeReceivedByProduct(po.id);
    const fullyReceived = isFullyReceived(po, receivedByProduct);
    const newStatus = fullyReceived ? 'received' : 'partially_received';
    const updated: PurchaseOrder = { ...po, status: newStatus };
    await purchaseOrdersStore.put(updated);
    await writeAudit(
      'purchase_order',
      po.id,
      po.number,
      'received',
      'warehouse',
      po.status,
      newStatus,
      now,
    );

    return HttpResponse.json(
      { goodsReceipt: grn, purchaseOrder: poView(updated) },
      { status: 201 },
    );
  }),

  http.get('/api/goods-receipts', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'receivedAt', direction: 'desc' },
    ]);
    const poId = url.searchParams.get('filter[poId]');
    const purchaseOrders = new Map(purchaseOrdersStore.list().map((po) => [po.id, po]));
    let items = goodsReceiptsStore.list().map((grn) => {
      const po = purchaseOrders.get(grn.poId);
      return {
        ...grn,
        poNumber: po?.number ?? '',
        supplierName: po ? supplierName(po.supplierId) : '',
      };
    });
    if (poId) items = items.filter((grn) => grn.poId === poId);
    items = items.filter((grn) => matchesSearch(grn, q, ['number', 'poNumber', 'supplierName']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/goods-receipts/:id', async ({ params }) => {
    await ensureSeeded();
    const grn = goodsReceiptsStore.get(String(params.id));
    if (!grn) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Goods receipt not found' },
        { status: 404 },
      );
    }
    const po = purchaseOrdersStore.get(grn.poId);
    return HttpResponse.json({
      ...grn,
      poNumber: po?.number ?? '',
      supplierName: po ? supplierName(po.supplierId) : '',
    });
  }),

  http.get('/api/vendor-bills', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'createdAt', direction: 'desc' },
    ]);
    const statuses = url.searchParams.get('filter[status]')?.split(',').filter(Boolean) ?? [];
    const poId = url.searchParams.get('filter[poId]');
    const purchaseOrders = new Map(purchaseOrdersStore.list().map((po) => [po.id, po]));
    let items = vendorBillsStore.list().map((bill) => {
      const po = purchaseOrders.get(bill.poId);
      return { ...bill, poNumber: po?.number ?? '', supplierName: supplierName(bill.supplierId) };
    });
    if (statuses.length > 0) items = items.filter((bill) => statuses.includes(bill.status));
    if (poId) items = items.filter((bill) => bill.poId === poId);
    items = items.filter((bill) => matchesSearch(bill, q, ['number', 'poNumber', 'supplierName']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get('/api/vendor-bills/:id', async ({ params }) => {
    await ensureSeeded();
    const bill = vendorBillsStore.get(String(params.id));
    if (!bill) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Vendor bill not found' },
        { status: 404 },
      );
    }
    const po = purchaseOrdersStore.get(bill.poId);
    return HttpResponse.json({
      ...bill,
      poNumber: po?.number ?? '',
      supplierName: supplierName(bill.supplierId),
    });
  }),

  http.post('/api/vendor-bills', async ({ request }) => {
    await ensureSeeded();
    const body: unknown = await request.json();
    const parsed = CreateBillSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid vendor bill',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    const po = purchaseOrdersStore.get(parsed.data.poId);
    if (!po) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Purchase order not found' },
        { status: 404 },
      );
    }
    if (po.status !== 'received' && po.status !== 'partially_received') {
      return HttpResponse.json(
        {
          code: 'INVALID_STATUS',
          message: 'The purchase order must have received quantity before billing',
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const lines: VendorBillLine[] = parsed.data.lines.map((line) => ({
      id: crypto.randomUUID(),
      poLineId: line.poLineId,
      productId: line.productId,
      qty: line.qty,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
      lineTotal: computeLineTotal(line.qty, line.unitPrice, 0),
    }));
    const totals = computeDocumentTotals(lines);
    const billNumber = nextNumber(
      'BILL',
      vendorBillsStore.list().map((existing) => existing.number),
    );
    const bill: VendorBill = {
      id: crypto.randomUUID(),
      number: billNumber,
      supplierId: po.supplierId,
      poId: po.id,
      lines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      status: 'pending_match',
      dueDate: now,
      createdAt: now,
    };
    await vendorBillsStore.put(bill);

    const journalNumber = nextNumber(
      'JE',
      journalEntriesStore.list().map((existing) => existing.number),
    );
    await journalEntriesStore.put({
      id: crypto.randomUUID(),
      number: journalNumber,
      date: now,
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
        { accountCode: '331', accountName: 'Phải trả người bán', debit: 0, credit: bill.vatTotal },
      ],
      createdAt: now,
    });
    broadcastEvent({
      type: 'document.posted',
      docType: 'vendor_bill',
      docId: bill.id,
      docNumber: bill.number,
    });

    const updatedPo: PurchaseOrder = { ...po, status: 'billed' };
    await purchaseOrdersStore.put(updatedPo);
    await writeAudit(
      'vendor_bill',
      bill.id,
      bill.number,
      'created',
      'purchasing',
      undefined,
      'pending_match',
      now,
    );

    return HttpResponse.json(
      { ...bill, poNumber: po.number, supplierName: supplierName(po.supplierId) },
      { status: 201 },
    );
  }),

  http.get('/api/vendor-bills/:id/match', async ({ params }) => {
    await ensureSeeded();
    const bill = vendorBillsStore.get(String(params.id));
    if (!bill) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Vendor bill not found' },
        { status: 404 },
      );
    }
    const po = purchaseOrdersStore.get(bill.poId);
    if (!po) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Purchase order not found' },
        { status: 404 },
      );
    }
    const receivedByProduct = cumulativeReceivedByProduct(po.id);
    const lines = computeThreeWayMatch(po.lines, receivedByProduct, bill.lines);
    return HttpResponse.json({ lines, hasExceptions: hasMatchExceptions(lines) });
  }),

  http.post('/api/vendor-bills/:id/confirm-match', async ({ params }) => {
    await ensureSeeded();
    const bill = vendorBillsStore.get(String(params.id));
    if (!bill) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Vendor bill not found' },
        { status: 404 },
      );
    }
    const po = purchaseOrdersStore.get(bill.poId);
    const receivedByProduct = cumulativeReceivedByProduct(bill.poId);
    const lines = po ? computeThreeWayMatch(po.lines, receivedByProduct, bill.lines) : [];
    if (hasMatchExceptions(lines)) {
      return HttpResponse.json(
        { code: 'MATCH_EXCEPTIONS', message: 'This bill has unresolved match exceptions' },
        { status: 422 },
      );
    }
    const now = new Date().toISOString();
    const updated: VendorBill = { ...bill, status: 'matched' };
    await vendorBillsStore.put(updated);
    await writeAudit(
      'vendor_bill',
      bill.id,
      bill.number,
      'matched',
      'accountant',
      bill.status,
      'matched',
      now,
    );
    return HttpResponse.json(updated);
  }),

  http.post('/api/vendor-bills/:id/override-match', async ({ params, request }) => {
    await ensureSeeded();
    const bill = vendorBillsStore.get(String(params.id));
    if (!bill) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Vendor bill not found' },
        { status: 404 },
      );
    }
    const body: unknown = await request.json();
    const parsed = z.object({ reason: z.string().min(1) }).safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'A reason is required to override the match' },
        { status: 422 },
      );
    }
    const now = new Date().toISOString();
    const updated: VendorBill = {
      ...bill,
      status: 'match_override',
      matchOverrideReason: parsed.data.reason,
    };
    await vendorBillsStore.put(updated);
    await writeAudit(
      'vendor_bill',
      bill.id,
      bill.number,
      'match_overridden',
      'accountant',
      bill.status,
      'match_override',
      now,
    );
    return HttpResponse.json(updated);
  }),

  http.post('/api/vendor-bills/:id/pay', async ({ params }) => {
    await ensureSeeded();
    const bill = vendorBillsStore.get(String(params.id));
    if (!bill) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Vendor bill not found' },
        { status: 404 },
      );
    }
    if (bill.status !== 'matched' && bill.status !== 'match_override') {
      return HttpResponse.json(
        {
          code: 'INVALID_STATUS',
          message: 'The bill must be matched (or overridden) before payment',
        },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updated: VendorBill = { ...bill, status: 'paid', paidAt: now };
    await vendorBillsStore.put(updated);

    const journalNumber = nextNumber(
      'JE',
      journalEntriesStore.list().map((existing) => existing.number),
    );
    await journalEntriesStore.put({
      id: crypto.randomUUID(),
      number: journalNumber,
      date: now,
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
      createdAt: now,
    });
    broadcastEvent({
      type: 'document.posted',
      docType: 'payment',
      docId: bill.id,
      docNumber: bill.number,
    });

    const po = purchaseOrdersStore.get(bill.poId);
    if (po) {
      await purchaseOrdersStore.put({ ...po, status: 'closed' });
    }
    await writeAudit(
      'vendor_bill',
      bill.id,
      bill.number,
      'paid',
      'purchasing',
      bill.status,
      'paid',
      now,
    );
    return HttpResponse.json(updated);
  }),

  http.get('/api/approvals', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'createdAt', direction: 'asc' },
    ]);
    const approverRole = url.searchParams.get('filter[approverRole]');
    const statuses = url.searchParams.get('filter[status]')?.split(',').filter(Boolean) ?? [];
    const docId = url.searchParams.get('filter[docId]');
    const purchaseOrders = new Map(purchaseOrdersStore.list().map((po) => [po.id, po]));

    let items = approvalsStore.list().map((approval) => {
      const po =
        approval.docType === 'purchase_order' ? purchaseOrders.get(approval.docId) : undefined;
      return {
        ...approval,
        amount: po?.grandTotal ?? 0,
        supplierName: po ? supplierName(po.supplierId) : '',
      };
    });
    if (approverRole) items = items.filter((approval) => approval.approverRole === approverRole);
    if (statuses.length > 0) items = items.filter((approval) => statuses.includes(approval.status));
    if (docId) items = items.filter((approval) => approval.docId === docId);
    items = items.filter((approval) => matchesSearch(approval, q, ['docNumber', 'supplierName']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.post('/api/approvals/:id/decide', async ({ params, request }) => {
    await ensureSeeded();
    const approval = approvalsStore.get(String(params.id));
    if (!approval) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Approval step not found' },
        { status: 404 },
      );
    }
    const body: unknown = await request.json();
    const parsed = DecideApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid decision',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    const chain = approvalsStore.list().filter((candidate) => candidate.docId === approval.docId);
    const now = new Date().toISOString();
    let result;
    try {
      result = decideApproval(
        chain,
        approval.id,
        parsed.data.decision,
        parsed.data.actorId,
        now,
        parsed.data.comment,
      );
    } catch (error) {
      return HttpResponse.json(
        { code: 'INVALID_STEP', message: (error as Error).message },
        { status: 409 },
      );
    }
    await Promise.all(result.chain.map((step) => approvalsStore.put(step)));
    broadcastEvent({
      type: 'approval.decided',
      docType: approval.docType,
      docId: approval.docId,
      docNumber: approval.docNumber,
      decision: parsed.data.decision,
      approverRole: approval.approverRole,
    });
    if (result.outcome === 'pending') {
      const nextStep = currentApprovalStep(result.chain);
      if (nextStep) {
        broadcastEvent({
          type: 'approval.requested',
          docType: nextStep.docType,
          docId: nextStep.docId,
          docNumber: nextStep.docNumber,
          approverRole: nextStep.approverRole,
        });
      }
    }

    if (approval.docType === 'purchase_order') {
      const po = purchaseOrdersStore.get(approval.docId);
      if (po) {
        const nextStatus =
          result.outcome === 'approved'
            ? 'approved'
            : result.outcome === 'rejected'
              ? 'rejected'
              : result.outcome === 'changes_requested'
                ? 'changes_requested'
                : 'pending_approval';
        await purchaseOrdersStore.put({ ...po, status: nextStatus });
        await writeAudit(
          'purchase_order',
          po.id,
          po.number,
          `approval_${parsed.data.decision}`,
          parsed.data.actorId,
          po.status,
          nextStatus,
          now,
        );
      }
    }

    return HttpResponse.json({ chain: result.chain, outcome: result.outcome });
  }),
];
