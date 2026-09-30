import {
  approvalRulesStore,
  approvalsStore,
  auditLogStore,
  chartOfAccountsStore,
  customerInvoicesStore,
  customersStore,
  deliveriesStore,
  employeesStore,
  goodsReceiptsStore,
  journalEntriesStore,
  leaveRequestsStore,
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
import { computeStockLevels } from './stock-levels';
import { generateApprovalRules } from './approval-rules';
import { generateChartOfAccounts } from './chart-of-accounts';

async function generateAndSeed(): Promise<void> {
  // faker and every generator are a large chunk that a returning visitor
  // (whose IndexedDB already holds the data) never needs, so they load only
  // when there is actually something to generate.
  const { generateSeedData } = await import('./generate');
  const approvalRules = generateApprovalRules();
  const chartOfAccounts = generateChartOfAccounts();
  const {
    warehouses,
    products,
    randomMovements,
    suppliers,
    procurement,
    customers,
    commerce,
    hrm,
  } = generateSeedData(approvalRules);

  const movements = [...randomMovements, ...procurement.stockMovements, ...commerce.stockMovements];
  const levels = computeStockLevels(products, warehouses, movements);
  const journalEntries = [...procurement.journalEntries, ...commerce.journalEntries];
  const auditLogEntries = [
    ...procurement.auditLogEntries,
    ...commerce.auditLogEntries,
    ...hrm.auditLogEntries,
  ];
  // Purchase-order and leave approvals share one store, and one inbox.
  const approvals = [...procurement.approvals, ...hrm.approvals];

  // Independent stores/transactions — writing them concurrently keeps total
  // wall-clock time to roughly the slowest one (stock movements, the
  // largest by far) instead of the sum of all twenty.
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
    approvalsStore.seed(approvals),
    journalEntriesStore.seed(journalEntries),
    auditLogStore.seed(auditLogEntries),
    chartOfAccountsStore.seed(chartOfAccounts),
    customersStore.seed(customers),
    quotationsStore.seed(commerce.quotations),
    salesOrdersStore.seed(commerce.salesOrders),
    deliveriesStore.seed(commerce.deliveries),
    customerInvoicesStore.seed(commerce.customerInvoices),
    employeesStore.seed(hrm.employees),
    leaveRequestsStore.seed(hrm.leaveRequests),
  ]);
}

/**
 * Adds the HR data to a database seeded before it existed, without touching (or
 * regenerating) the 110,000 records already there.
 */
async function seedHrm(): Promise<void> {
  const { generateHrmData } = await import('./hrm');
  const rules = generateApprovalRules();
  // An older database only holds the purchase-order rules.
  const knownRuleIds = new Set(approvalRulesStore.list().map((rule) => rule.id));
  const hrm = generateHrmData(rules);
  await Promise.all([
    approvalRulesStore.putMany(rules.filter((rule) => !knownRuleIds.has(rule.id))),
    employeesStore.seed(hrm.employees),
    leaveRequestsStore.seed(hrm.leaveRequests),
    approvalsStore.putMany(hrm.approvals),
    auditLogStore.putMany(hrm.auditLogEntries),
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
    const [hadStaff] = await Promise.all([
      employeesStore.hydrate(),
      leaveRequestsStore.hydrate(),
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
    // A Phase 5 database: keep its data and add just the HR records.
    if (!hadStaff) await seedHrm();
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
    employeesStore.clear(),
    leaveRequestsStore.clear(),
  ]);
  await generateAndSeed();
}
