# Demo script

A guided walk-through for a reviewer (or a screen recording). About 8 minutes; the
two-minute version is steps 1–7.

**Before you start:** the first visit seeds ~110,000 records into your browser — expect a
"Preparing demo data…" splash for up to a minute, once. The UI opens in Vietnamese;
the **EN** button in the top bar switches to English. Use **User menu → Demo tools** to reset
the data at any time.

## The two-minute path: procure-to-pay

1. **Log in as Nguyễn Văn An (Purchasing Officer).** No password — demo personas only.
2. **Purchasing → Purchase Orders → New purchase order.** Walk the four steps: pick a
   supplier and warehouse, add a line (search products, set quantity and unit price), set a
   delivery date and terms, review the totals, then **Create & submit for approval**. Reload
   mid-wizard first if you like: the draft is restored.
3. Note the PO's status is _Pending approval_ and the timeline shows the approval chain.
4. **User menu → switch to Phạm Văn Đức (Purchasing Manager)**, open **Approvals**, search the
   PO number and click **Approve**.
5. **Switch back to Nguyễn Văn An.** Open the PO, **Receive goods**, receive _part_ of the
   quantity, then receive the remainder in a second receipt.
6. **Create vendor bill.** The three-way match shows PO vs received vs billed per line.
   **Confirm match**, then **Record payment**.
7. Back on the PO: status _Closed_, with both receipts, the bill and the audit timeline.

## Order-to-cash

8. **Switch to Đỗ Thị Giang (Sales).** **Sales → Quotations → New**: customer, warehouse, a
   line, valid-until. Send → Mark accepted → **Convert to sales order**.
9. Deliver in two partial deliveries, **Create invoice**, open **Preview / print**: a
   Vietnamese VAT-invoice layout with the amount in words (a demo layout — not legal
   e-invoicing). Record payment; the order closes.

## Accounting and dashboard

10. **Switch to Lê Thị Cúc (Accountant).** **Accounting → Trial balance** reads _Balanced_;
    open the General ledger for a 131 or 511 account, and AR/AP aging.
11. **Dashboard:** KPI tiles and the revenue-vs-COGS, AR aging and AP aging charts, served by
    a mocked GraphQL endpoint.

## HR: a leave request on the same approval engine

12. **Switch to Nguyễn Văn An.** **HR** opens on _My requests_: allowance, used, pending and
    remaining days, then the list. **New request**: pick dates in a future week. The form
    previews the **working days** (weekends and fixed public holidays don't count) and the balance
    _after_ the request, before anything is sent. Try a range that overlaps an existing request,
    or one longer than the balance: the server refuses with a field-level message.
13. Submit three or more working days. The request's page shows the chain it needs: **Purchasing
    Manager, then Director**. (One or two days need the manager only.) The days are held against
    your balance while it waits.
14. **Switch to Phạm Văn Đức (Manager)**, open **Approvals**, filter **Type → Leave request** and
    approve; **switch to Hoàng Thị Em (Director)** and approve the second step. Back as An, the
    request is _Approved_ and the balance has moved. Instead of approving, **Request changes**
    to see the send-back path: An edits the request and resubmits it under the same number, and
    the timeline keeps the earlier round as history.
15. As the manager, request leave and open your own request in **Approvals**: deciding it is
    refused (`SELF_DECISION`), and the admin login, which sees every step, is who decides it.

## The same inbox in Vue

16. In a second terminal: `pnpm --filter @mekong-erp/erp-vue dev` (http://localhost:5174). This is a **standalone** Vue 3 app that shares only the contract package, the
    design tokens and the security headers with the React app — its own origin, its own light
    demo dataset (about 2,400 records), its own login. Sign in as Phạm Văn Đức: the same rules,
    filters, URL-held view, decision comments and history as the React inbox, decided through the
    same handlers. Say honestly that it is not a composed micro frontend
    ([ADR-0016](adr/0016-vue-approvals-inbox-on-the-shared-contract.md)).

## Excel export and the component library

17. **Inventory → Products → Export Excel** (also on Stock movements). Open it: money
    is a real number formatted `#,##0 "₫"` so it sums, dates are real dates, headers are frozen
    and filterable. Written by an in-house OOXML writer, because the library considered hung
    silently under this app's CSP ([ADR-0013](adr/0013-xlsx-export-without-a-library.md)).
18. `pnpm --filter @mekong-erp/ui storybook` (port 6006): 52 stories of the design system, with a
    light/dark toolbar toggle; every story is checked in CI for console errors and axe A/AA
    violations in both themes ([ADR-0014](adr/0014-storybook-and-shared-design-tokens.md)).

## Things worth showing off

- **Realtime:** as Admin, submit a draft PO from a second tab-less flow — an "Approval
  requested" toast appears; on **Inventory → Stock levels** a changed row flashes and a _Live_
  badge shows.
- **Grid:** Inventory → Products: search, filter, sort — then copy the URL into a new tab and
  get the same view. Select rows for a bulk action; export CSV; import a CSV with row-level
  validation. **Stock movements** is a 100,000-row virtualized grid.
- **RBAC:** log in as Trần Thị Bình (Warehouse) and try to open `/accounting` — access denied
  (a UX layer only; see SECURITY.md).
- **Error states:** User menu → Demo tools → set the random failure rate to 100% and reload a
  list to see the error and retry state; set it back to 0.
- **Theme and language:** the moon icon toggles dark mode; **EN/VI** switches language.
