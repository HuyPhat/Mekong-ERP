import {
  approvalRulesStore,
  approvalsStore,
  auditLogStore,
  chartOfAccountsStore,
  customerInvoicesStore,
  customersStore,
  deliveriesStore,
  goodsReceiptsStore,
  journalEntriesStore,
  productsStore,
  purchaseOrdersStore,
  quotationsStore,
  salesOrdersStore,
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
import { generateChartOfAccounts } from './chart-of-accounts';
import { generateCustomers } from './customers';
import { generateSalesOrderDrafts } from './sales-orders';
import { generateStandaloneQuotationDrafts } from './quotations';
import { generateCommerceData } from './commerce';

const PRODUCT_COUNT = 3000;
const MOVEMENT_COUNT = 100_000;
const SUPPLIER_COUNT = 150;
const PURCHASE_ORDER_COUNT = 1500;
const CUSTOMER_COUNT = 400;
const SALES_ORDER_COUNT = 2000;
const STANDALONE_QUOTATION_COUNT = 600;

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

  const chartOfAccounts = generateChartOfAccounts();
  const customers = generateCustomers(CUSTOMER_COUNT);
  const soDrafts = generateSalesOrderDrafts(SALES_ORDER_COUNT, products, customers, warehouses);
  const standaloneQuotationDrafts = generateStandaloneQuotationDrafts(
    STANDALONE_QUOTATION_COUNT,
    products,
    customers,
    warehouses,
  );
  const commerce = generateCommerceData(soDrafts, standaloneQuotationDrafts, products, customers);

  const movements = [...randomMovements, ...procurement.stockMovements, ...commerce.stockMovements];
  const levels = computeStockLevels(products, warehouses, movements);
  const journalEntries = [...procurement.journalEntries, ...commerce.journalEntries];
  const auditLogEntries = [...procurement.auditLogEntries, ...commerce.auditLogEntries];

  // Independent stores/transactions — writing them concurrently keeps total
  // wall-clock time to roughly the slowest one (stock movements, the
  // largest by far) instead of the sum of all eighteen.
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
    journalEntriesStore.seed(journalEntries),
    auditLogStore.seed(auditLogEntries),
    chartOfAccountsStore.seed(chartOfAccounts),
    customersStore.seed(customers),
    quotationsStore.seed(commerce.quotations),
    salesOrdersStore.seed(commerce.salesOrders),
    deliveriesStore.seed(commerce.deliveries),
    customerInvoicesStore.seed(commerce.customerInvoices),
  ]);
}

/** Hydrates from IndexedDB if seed data already exists, otherwise generates it fresh. */
export async function ensureSeeded(): Promise<void> {
  const hadProducts = await productsStore.hydrate();
  // A v1 (Phase 2) database has products but not purchase orders, and a v2
  // (Phase 3) database has purchase orders but not sales orders — treat any
  // partial hydrate as "not seeded" so upgrading users get the new stores
  // filled in, rather than silently leaving the new screens empty forever.
  const hadPurchaseOrders = hadProducts && (await purchaseOrdersStore.hydrate());
  const hadSalesOrders = hadPurchaseOrders && (await salesOrdersStore.hydrate());
  if (hadProducts && hadPurchaseOrders && hadSalesOrders) {
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
      chartOfAccountsStore.hydrate(),
      customersStore.hydrate(),
      quotationsStore.hydrate(),
      deliveriesStore.hydrate(),
      customerInvoicesStore.hydrate(),
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
    chartOfAccountsStore.clear(),
    customersStore.clear(),
    quotationsStore.clear(),
    salesOrdersStore.clear(),
    deliveriesStore.clear(),
    customerInvoicesStore.clear(),
  ]);
  await generateAndSeed();
}
