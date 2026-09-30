import { graphql, HttpResponse } from 'msw';
import {
  approvalsStore,
  chartOfAccountsStore,
  customerInvoicesStore,
  customersStore,
  journalEntriesStore,
  productsStore,
  purchaseOrdersStore,
  salesOrdersStore,
  stockLevelsStore,
  suppliersStore,
  vendorBillsStore,
} from '../../db/store';
import { ensureSeeded } from '../../seed';
import { computeAging, computeGeneralLedger, summarizeAging, type AgingDoc } from '../../ledger';

const dashboardApi = graphql.link('/api/graphql');

function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function lastNMonths(count: number, from: Date): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

const OPEN_SO_STATUSES = new Set(['confirmed', 'partially_delivered', 'delivered', 'invoiced']);
const OPEN_PO_STATUSES = new Set(['approved', 'partially_received', 'received', 'billed']);

export const dashboardHandlers = [
  dashboardApi.query('DashboardAggregates', async () => {
    await ensureSeeded();
    const now = new Date();
    const entries = journalEntriesStore.list();
    const accounts = chartOfAccountsStore.list();

    const revenueByMonth = new Map<string, number>();
    const cogsByMonth = new Map<string, number>();
    for (const entry of entries) {
      const key = monthKey(entry.date);
      for (const line of entry.lines) {
        if (line.accountCode === '511') {
          revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + line.credit);
        }
        if (line.accountCode === '632') {
          cogsByMonth.set(key, (cogsByMonth.get(key) ?? 0) + line.debit);
        }
      }
    }
    const revenueTrend = lastNMonths(12, now).map((month) => {
      const revenue = revenueByMonth.get(month) ?? 0;
      const cogs = cogsByMonth.get(month) ?? 0;
      return { month, revenue, cogs, grossMargin: revenue - cogs };
    });

    const cashPosition = accounts
      .filter((account) => account.code === '111' || account.code === '112')
      .reduce((sum, account) => {
        const rows = computeGeneralLedger(entries, account.code, account.normalBalance);
        return sum + (rows.at(-1)?.balance ?? 0);
      }, 0);

    const customerNames = new Map(
      customersStore.list().map((customer) => [customer.id, customer.name]),
    );
    const supplierNames = new Map(
      suppliersStore.list().map((supplier) => [supplier.id, supplier.name]),
    );

    const openInvoices: AgingDoc[] = customerInvoicesStore
      .list()
      .filter((invoice) => invoice.status === 'unpaid')
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        partyName: customerNames.get(invoice.customerId) ?? '',
        dueDate: invoice.dueDate,
        amount: invoice.grandTotal,
      }));
    const openBills: AgingDoc[] = vendorBillsStore
      .list()
      .filter((bill) => bill.status !== 'paid')
      .map((bill) => ({
        id: bill.id,
        number: bill.number,
        partyName: supplierNames.get(bill.supplierId) ?? '',
        dueDate: bill.dueDate,
        amount: bill.grandTotal,
      }));

    const arAgingSummary = summarizeAging(computeAging(openInvoices, now));
    const apAgingSummary = summarizeAging(computeAging(openBills, now));

    const reorderPointByProduct = new Map(
      productsStore.list().map((product) => [product.id, product.reorderPoint]),
    );
    const lowStockCount = stockLevelsStore
      .list()
      .filter(
        (level) => level.quantityOnHand < (reorderPointByProduct.get(level.productId) ?? 0),
      ).length;

    const openSalesOrders = salesOrdersStore
      .list()
      .filter((so) => OPEN_SO_STATUSES.has(so.status)).length;
    const openPurchaseOrders = purchaseOrdersStore
      .list()
      .filter((po) => OPEN_PO_STATUSES.has(po.status)).length;
    const pendingApprovals = approvalsStore
      .list()
      .filter((approval) => approval.status === 'pending').length;

    return HttpResponse.json({
      data: {
        revenueTrend,
        cashPosition,
        arTotal: openInvoices.reduce((sum, doc) => sum + doc.amount, 0),
        apTotal: openBills.reduce((sum, doc) => sum + doc.amount, 0),
        arAgingSummary,
        apAgingSummary,
        lowStockCount,
        openSalesOrders,
        openPurchaseOrders,
        pendingApprovals,
      },
    });
  }),
];
