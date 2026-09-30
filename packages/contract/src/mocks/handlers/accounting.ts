import { http, HttpResponse } from 'msw';
import {
  chartOfAccountsStore,
  customerInvoicesStore,
  customersStore,
  journalEntriesStore,
  suppliersStore,
  vendorBillsStore,
} from '../../db/store';
import { ensureSeeded } from '../../seed';
import {
  computeAging,
  computeGeneralLedger,
  computeTrialBalance,
  summarizeAging,
  trialBalanceTotals,
  type AgingDoc,
} from '../../ledger';

export const accountingHandlers = [
  http.get('/api/accounting/chart-of-accounts', async () => {
    await ensureSeeded();
    return HttpResponse.json(chartOfAccountsStore.list());
  }),

  http.get('/api/accounting/general-ledger', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const accountCode = url.searchParams.get('accountCode');
    if (!accountCode) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'accountCode is required' },
        { status: 422 },
      );
    }
    const account = chartOfAccountsStore.list().find((candidate) => candidate.code === accountCode);
    if (!account) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Account not found' },
        { status: 404 },
      );
    }
    const rows = computeGeneralLedger(
      journalEntriesStore.list(),
      accountCode,
      account.normalBalance,
    );
    return HttpResponse.json(rows);
  }),

  http.get('/api/accounting/trial-balance', async () => {
    await ensureSeeded();
    const rows = computeTrialBalance(journalEntriesStore.list(), chartOfAccountsStore.list());
    return HttpResponse.json({ rows, totals: trialBalanceTotals(rows) });
  }),

  http.get('/api/accounting/ar-aging', async () => {
    await ensureSeeded();
    const customerNames = new Map(
      customersStore.list().map((customer) => [customer.id, customer.name]),
    );
    const docs: AgingDoc[] = customerInvoicesStore
      .list()
      .filter((invoice) => invoice.status === 'unpaid')
      .map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        partyName: customerNames.get(invoice.customerId) ?? '',
        dueDate: invoice.dueDate,
        amount: invoice.grandTotal,
      }));
    const rows = computeAging(docs, new Date());
    return HttpResponse.json({ rows, summary: summarizeAging(rows) });
  }),

  http.get('/api/accounting/ap-aging', async () => {
    await ensureSeeded();
    const supplierNames = new Map(
      suppliersStore.list().map((supplier) => [supplier.id, supplier.name]),
    );
    const docs: AgingDoc[] = vendorBillsStore
      .list()
      .filter((bill) => bill.status !== 'paid')
      .map((bill) => ({
        id: bill.id,
        number: bill.number,
        partyName: supplierNames.get(bill.supplierId) ?? '',
        dueDate: bill.dueDate,
        amount: bill.grandTotal,
      }));
    const rows = computeAging(docs, new Date());
    return HttpResponse.json({ rows, summary: summarizeAging(rows) });
  }),
];
