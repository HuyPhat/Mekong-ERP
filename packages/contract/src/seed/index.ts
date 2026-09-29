import {
  approvalRulesStore,
  approvalsStore,
  auditLogStore,
  goodsReceiptsStore,
  journalEntriesStore,
  productsStore,
  purchaseOrdersStore,
  stockLevelsStore,
  stockMovementsStore,
  suppliersStore,
  vendorBillsStore,
  warehousesStore,
} from '../db/store';
import { generateWarehouses } from './warehouses';
import { generateProducts } from './products';
import { generateStockMovements } from './stock-movements';
import { computeStockLevels } from './stock-levels';
import { generateSuppliers } from './suppliers';
import { generateApprovalRules } from './approval-rules';
import { generatePurchaseOrderDrafts } from './purchase-orders';
import { generateProcurementData } from './procurement';

const PRODUCT_COUNT = 3000;
const MOVEMENT_COUNT = 100_000;
const SUPPLIER_COUNT = 150;
const PURCHASE_ORDER_COUNT = 1500;

async function generateAndSeed(): Promise<void> {
  const warehouses = generateWarehouses();
  const products = generateProducts(PRODUCT_COUNT);
  const randomMovements = generateStockMovements(products, warehouses, MOVEMENT_COUNT);

  const suppliers = generateSuppliers(SUPPLIER_COUNT);
  const approvalRules = generateApprovalRules();
  const poDrafts = generatePurchaseOrderDrafts(
    PURCHASE_ORDER_COUNT,
    products,
    suppliers,
    warehouses,
  );
  const procurement = generateProcurementData(poDrafts, approvalRules);

  const movements = [...randomMovements, ...procurement.stockMovements];
  const levels = computeStockLevels(products, warehouses, movements);

  // Independent stores/transactions — writing them concurrently keeps total
  // wall-clock time to roughly the slowest one (stock movements, the
  // largest by far) instead of the sum of all twelve.
  await Promise.all([
    warehousesStore.seed(warehouses),
    productsStore.seed(products),
    stockMovementsStore.seed(movements),
    stockLevelsStore.seed(levels),
    suppliersStore.seed(suppliers),
    approvalRulesStore.seed(approvalRules),
    purchaseOrdersStore.seed(procurement.purchaseOrders),
    goodsReceiptsStore.seed(procurement.goodsReceipts),
    vendorBillsStore.seed(procurement.vendorBills),
    approvalsStore.seed(procurement.approvals),
    journalEntriesStore.seed(procurement.journalEntries),
    auditLogStore.seed(procurement.auditLogEntries),
  ]);
}

/** Hydrates from IndexedDB if seed data already exists, otherwise generates it fresh. */
export async function ensureSeeded(): Promise<void> {
  const hadProducts = await productsStore.hydrate();
  // A v1 (Phase 2) database has products but not purchase orders — treat a
  // partial hydrate as "not seeded" so upgrading users get the new stores
  // filled in, rather than silently keeping the P2P screens empty forever.
  const hadPurchaseOrders = hadProducts && (await purchaseOrdersStore.hydrate());
  if (hadProducts && hadPurchaseOrders) {
    await Promise.all([
      warehousesStore.hydrate(),
      stockLevelsStore.hydrate(),
      stockMovementsStore.hydrate(),
      suppliersStore.hydrate(),
      approvalRulesStore.hydrate(),
      goodsReceiptsStore.hydrate(),
      vendorBillsStore.hydrate(),
      approvalsStore.hydrate(),
      journalEntriesStore.hydrate(),
      auditLogStore.hydrate(),
    ]);
    return;
  }
  await generateAndSeed();
}

/** Wipes persisted data and regenerates it from scratch (the "Reset demo data" action). */
export async function resetSeed(): Promise<void> {
  await Promise.all([
    warehousesStore.clear(),
    productsStore.clear(),
    stockLevelsStore.clear(),
    stockMovementsStore.clear(),
    suppliersStore.clear(),
    approvalRulesStore.clear(),
    purchaseOrdersStore.clear(),
    goodsReceiptsStore.clear(),
    vendorBillsStore.clear(),
    approvalsStore.clear(),
    journalEntriesStore.clear(),
    auditLogStore.clear(),
  ]);
  await generateAndSeed();
}
