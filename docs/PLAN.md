# Mekong ERP — Project Plan

Status: **Phase 0 — Planning. Awaiting approval before any app code is written.**
Last updated: 2026-09-28

This document is the durable source of truth for scope, architecture, phasing,
risks, and open decisions. It exists so any future session (including this one
after context is compacted) can resume work without re-reading the original
request in full. `CLAUDE.md` holds the day-to-day conventions and commands;
this file holds the *why* and the *what*.

---

## 1. Purpose & success criteria

Portfolio project for a "Frontend Developer (ERP Focus, ReactJS, VueJS)" role
at GON TECH (Ho Chi Minh City). Fictional company: **Công ty TNHH Thương mại
Mekong** — FMCG trading/distribution SME, 2 warehouses (HCM-01 Thủ Đức,
HCM-02 Bình Tân).

The project is "done enough to submit" when:
- A live demo is deployed, loads fast, and its mock backend (MSW) persists
  seed data across reloads with a visible "reset demo data" action.
- Every row in the JD-mapping table (§10) points at a feature that actually
  works, not an aspirational bullet.
- `lint` / `typecheck` / `test` / `build` / `e2e` are all genuinely green in
  CI — nothing is claimed that hasn't been run.
- A reviewer can go from the README to completing the PO → approve → receive
  → bill → match loop in under ~2 minutes.

## 2. Sequencing philosophy

This is a multi-week build even done efficiently. To avoid an all-or-nothing
outcome, every phase boundary is a *demoable, deployed* state:

| After phase | State |
|---|---|
| 0 | Not demoable — tooling/CI only. Internal milestone. |
| 1 | Not demoable — shell + mock auth only. Internal milestone. |
| 2 | **First demoable milestone.** Inventory + DataGrid alone is already portfolio-worthy. |
| 3 | P2P loop complete. Phases 2+3 together are a credible minimum submission. |
| 4 | Full JD coverage: O2C, GL, dashboards, realtime. |
| 5 | Polish-or-bust: this is where every quality-bar claim in the README has to actually be true. |
| 6 | Stretch (Vue inbox, HRM). Explicitly OK to skip if the application deadline arrives first. |

I'll checkpoint explicitly at the end of Phase 3 on whether Phases 4–5 fit the
remaining time, rather than assuming.

## 3. Tech stack

Monorepo: pnpm workspaces + Turborepo, Node LTS, TypeScript strict everywhere.

**apps/erp** — React 19 + Vite, TanStack Router (file-based, typed/Zod search
params, loaders prefetching via Query, pending/error components), TanStack
Query (key factories, optimistic updates, invalidation, infinite queries
where useful, devtools), TanStack Table + TanStack Virtual (DataGrid), React
Hook Form + Zod for forms (confirmed — ADR-0007), Tailwind CSS v4 +
shadcn/ui (Radix) + lucide-react, Recharts, i18next/react-i18next (vi
default, en) + Intl formatters, date-fns, papaparse (CSV; XLSX export
deferred to Phase 6 stretch — see §12), MSW v2 (http + graphql + ws) running in-browser in **all**
environments as the demo "backend," data persisted to IndexedDB/localStorage,
seed data via `@faker-js/faker` with a fixed seed.

**packages/ui** — design tokens, shadcn-based components, DataGrid, FormKit,
Storybook.

**packages/contract** — Zod schemas + inferred types for every entity/endpoint,
typed fetch client with typed errors, MSW handlers, seed generators, in-memory
DB. Framework-agnostic — no React imports (this is what lets `apps/erp-vue`
reuse it).

**apps/site** — Next.js (App Router, static export/SSG): landing + case study
+ architecture write-up + screenshots, full SEO metadata, sitemap, OG image.
*(Will pin the actual current stable Next.js version at scaffold time rather
than assume one — see §9 risks.)*

**apps/erp-vue** (stretch) — Vue 3 + Vite + TanStack Vue Query + Vue Router on
`packages/contract`; single "Approvals Inbox" screen.

**Quality tooling** — ESLint (typescript-eslint strict, react-hooks,
jsx-a11y), Prettier, Vitest + RTL + user-event, Playwright + @axe-core/playwright,
Storybook, husky + lint-staged, commitlint (Conventional Commits).

**CI/CD** — GitHub Actions (install/lint/typecheck/test/build, e2e on
preview). Deploy `apps/erp` and `apps/site` to Vercel (confirmed — ADR-0009).
Docker: multi-stage Dockerfile serving the `apps/erp` build via nginx with
security headers + docker-compose for local preview.

## 4. Architecture rules

- Feature-sliced structure inside `apps/erp`: each feature owns its route
  glue, components, hooks, queries, tests. Shared UI lives in `packages/ui`.
- All server state via TanStack Query only — never in a global client store.
  Small client UI state (prefs, column layouts, saved views) in zustand
  (confirmed — ADR-0008); Context remains fine for state genuinely local to
  one subtree.
- Query keys via per-entity factories, e.g. `purchaseOrderKeys.list(filters)`.
- **URL is the source of truth** for every list view: page, pageSize, sort,
  filters, visible-columns preset, search — validated with Zod in
  `validateSearch`. Every list must be shareable/bookmarkable and survive a
  refresh.
- API layer lives in `packages/contract`: every response parsed with Zod at
  the boundary; normalized error shape `{ code, message, fieldErrors? }`.
- Server-side pagination/sort/filter contract for lists:
  `GET /api/{resource}?page=1&pageSize=50&sort=field:asc,field2:desc&filter[status]=approved&q=...`
  → `{ data: T[], meta: { page, pageSize, total, totalPages } }`.
- GraphQL (MSW graphql handlers) is used **only** for dashboard/report
  aggregates — kept intentionally small in surface area.
- WebSocket (MSW `ws.link('wss://mekong.mock/events')`) pushes
  `stock.changed`, `approval.requested`, `approval.decided`,
  `document.posted`. One realtime hook updates the Query cache
  (`setQueryData`/invalidate).
- RBAC: permissions like `purchase_order:approve`, `journal:post`, checked via
  a `<Can permission>` component, `useCan()` hook, and route `beforeLoad`
  guards. `SECURITY.md` will state plainly that client-side RBAC is UX only —
  a real server would have to enforce authorization.
- Money stored as **integer VND** — never floats. Quantities as decimals via
  a small shared helper or integer base units.
- Document numbering: `PO-2026-000123`, `GRN-`, `BILL-`, `SO-`, `INV-`, `JE-`.
- Every document has a status machine (`draft → submitted → approved → ...`),
  an activity timeline ("chatter"), and audit entries (who/what/when/before/after).
- Odoo-inspired UX: list↔form with breadcrumbs, a status bar on documents, a
  search panel with saved filters/"favorites", keyboard shortcuts (`/`,
  `g i` for inventory, `Ctrl+S` to save, `j`/`k` row nav).

## 5. Folder structure

```
mekong-erp/
  apps/
    erp/
      public/mockServiceWorker.js
      src/
        app/            (providers, router, queryClient, i18n, theme)
        routes/         (TanStack Router file routes: _auth/, _app/, ...)
        features/
          auth/
          inventory/    (products, warehouses, stock, movements)
          purchasing/   (requests, purchase-orders, goods-receipts, vendor-bills, matching)
          sales/        (quotations, sales-orders, deliveries, invoices)
          accounting/   (chart-of-accounts, journal, ledger, trial-balance, aging)
          approvals/    (engine config, inbox, timeline)
          dashboard/
          admin/        (users, roles, audit-log)
          hrm/          (stretch: leave requests on approval engine)
        shared/         (hooks, lib/format, lib/permissions, realtime, components)
        locales/        (vi/*.json, en/*.json)
        test/           (setup, test-utils with providers)
      e2e/              (Playwright specs)
    erp-vue/            (stretch)
    site/               (Next.js SSG)
  packages/
    ui/                 (tokens, components, DataGrid, FormKit, stories)
    contract/           (schemas, types, client, msw handlers, db, seed)
    config/             (eslint, tsconfig, tailwind presets)
  docs/
    PLAN.md
    adr/
    workflows/          (user stories + Mermaid diagrams: P2P, O2C, approvals)
    screenshots/
  .github/workflows/ci.yml
  Dockerfile, docker-compose.yml, nginx.conf
  CLAUDE.md, README.md, SECURITY.md, CONTRIBUTING.md
```

No changes proposed to this structure.

## 6. Centerpiece components — condensed spec

**DataGrid** (`packages/ui`, on TanStack Table): server-side mode
(manualPagination/Sorting/Filtering) wired to the URL; multi-column sort;
per-column filters (text/number-range/date-range/enum-multiselect); debounced
global search; column show/hide/reorder/resize/pin, density toggle, persisted
per user+view in localStorage with "Reset layout"; saved views/filters
("favorites") per user; row selection + bulk-action bar with confirmation and
partial-failure reporting; virtualized client mode proven on a 100,000-row
Stock Movements view with sticky header; right-aligned numeric/money columns
with tabular numerals and a totals footer; empty/loading-skeleton/error-retry
states; keyboard nav; ARIA grid semantics; CSV export of the current filtered
result; CSV import with column mapping, Zod row-level validation report,
preview, commit.

**FormKit** (`packages/ui`, on React Hook Form + Zod): labeled field
components with descriptions/errors/`aria-describedby`; multi-step Wizard
with per-step schema validation, step guard, progress, debounced
autosave-draft + resume; editable line-items table (`useFieldArray`): async
product-lookup combobox, qty, unit price (VND), discount %, VAT rate
(0/5/8/10%), computed line total, document totals (subtotal/VAT/grand total)
with correct rounding; cross-field rules (delivery date ≥ order date, qty >
0, supplier credit-limit warning) plus server-side validation errors mapped
to fields; unsaved-changes navigation guard.

**Approval engine**: rules keyed by doc type + amount threshold → ordered
approver roles (e.g. PO < 50,000,000 VND: Purchasing Manager; ≥ 50M: +
Finance Manager; ≥ 500M: + Director). Inbox with filters, bulk approve,
reject with mandatory reason, request-changes; timeline on the document;
realtime toast notification.

**Three-way match**: side-by-side PO line vs. received qty vs. billed
qty/price, per-line status (matched / qty variance / price variance / not
received), configurable tolerance (e.g. 2% price, 0 qty); blocks "Approve
for payment" on exceptions unless the user holds
`vendor_bill:override_match`, with a required reason.

**Mock e-invoice preview** (clearly labeled **DEMO, not legal compliance**):
Vietnamese-language layout — seller/buyer, tax code (MST), items, unit, qty,
unit price, VAT rate, VAT amount, total in words (Vietnamese), invoice
symbol/number; print stylesheet (SCSS module); "Download XML (mock)".

## 7. Seed & mock data

Deterministic faker seed; generators in `packages/contract/seed`. Volumes: 3,000
products (Vietnamese FMCG-style names/SKUs/units: thùng, hộp, chai, kg), 2
warehouses, 150 suppliers, 400 customers, 1,500 POs, 2,000 sales orders,
100,000 stock movements (for the virtualization demo), 12 months of history
ending "today" so dashboards look alive. Vietnamese realism: company names
(Công ty TNHH/CP ...), fake 10-digit MST tax codes, HCMC/Hà Nội/Đà Nẵng
addresses, VN phone formats, VND amounts, `dd/MM/yyyy` display, vi-VN number
formatting.

Chart of accounts seeded with familiar VAS codes (111 Cash, 112 Bank, 131
Receivables, 1331 Input VAT, 156 Merchandise, 331 Payables, 3331 Output VAT,
511 Revenue, 632 COGS, 641/642 Selling/Admin expenses) and left editable —
see §9 risk on the specific circular citation before this ships in copy.

Journal posting rules (simplified, tested): GRN → Dr 156 / Cr 331; Vendor
Bill → Dr 1331 VAT; Customer Invoice → Dr 131 / Cr 511 + Cr 3331; Delivery →
Dr 632 / Cr 156.

MSW realism: configurable latency (150–600 ms), ~3% random-failure toggle in
a "Dev panel" to demo error/retry UX, 409 conflict on stale updates
(optimistic concurrency via a version field), 422 validation errors with
`fieldErrors`. Demo users (one-click login cards): admin, purchasing,
warehouse, accountant, approver_manager, approver_director, each with
different permissions, plus a "Reset demo data" action.

## 8. Phases & exit criteria

**Phase 0 — Plan & scaffold (M0).**
PLAN.md + CLAUDE.md (this work); pnpm/Turborepo monorepo; empty
apps/packages; base tsconfig/eslint/prettier/tailwind configs; husky +
lint-staged + commitlint; GitHub Actions CI skeleton (install/lint/typecheck/build
on the empty apps). *Exit:* CI green on a scaffold with no real features yet.

**Phase 1 — Foundation (M1: "logged-in shell").**
App shell (sidebar modules, topbar, breadcrumbs, command palette); mock auth +
role switcher; RBAC primitives (`<Can>`, `useCan`, route guards); i18n vi/en +
formatters; `packages/contract` + MSW + seed + persistence proven end-to-end
with one trivial handler; error boundaries; 404/403 pages; light/dark theme
tokens. *Exit:* can log in as each demo user, see a permission-gated shell,
reload the page and keep the session/seed state.

**Phase 2 — DataGrid + Inventory (M2: "the grid").**
Full DataGrid feature set (§6); Products list↔form, Stock levels; 100k-row
Stock Movements virtualized view; CSV export/import for products. *Exit:*
first genuinely demoable milestone — grid, filtering, virtualization, CSV
round-trip all work against real seed data.

**Phase 3 — Procure-to-Pay (M3: "P2P end-to-end").**
PO wizard + line items; approval engine + inbox + timeline; Goods Receipt
(partial); Vendor Bill; Three-way match; AP postings; audit log entries.
*Exit:* PO → approve → receive (partial) → bill → match → payment works
start to finish as one scripted demo path.

**Phase 4 — Order-to-Cash, Accounting, Dashboard, Realtime (M4: "live ERP").**
Quotation → SO → delivery → invoice (+ e-invoice preview) → payment; GL,
trial balance, AR/AP aging; GraphQL dashboard KPIs + charts; WebSocket events
updating the inventory grid + approval toasts. *Exit:* full JD-mapping table
(§10) is true end to end.

**Phase 5 — Quality, docs, deploy (M5: "apply-ready MVP").**
Test coverage on critical logic; Playwright happy paths; axe checks;
Lighthouse pass; performance budget; security headers; README + JD table +
architecture diagram + ADR links; screenshots; GIF/Loom script; Next.js site;
both apps deployed; Dockerfile. *Exit:* every claim in the README has been
actually run and is true.

**Phase 6 — Stretch (after applying).**
Vue 3 Approvals Inbox on the shared contract; HRM leave requests on the
approval engine; Storybook published; saved report builder; offline draft
support. Explicitly optional.

## 9. Risks

1. **Scope vs. timeline.** This is genuinely several weeks of focused work
   done to the stated quality bar. Treating Phases 0–3 as the non-negotiable
   core (§2) is how I'll protect against an unfinished, half-polished
   everything.
2. **MSW-as-the-only-backend, on static hosting.** Service-worker
   registration/scope issues on a deployed static host are a common failure
   mode (base path, HTTPS, scope). I'll prove this works with one trivial
   handler in Phase 1 before building the full contract layer on top of it,
   rather than discovering it broken in Phase 5.
3. **Client-side seeding of 100k+ rows.** Generating this with faker at
   runtime needs to happen once, persist to IndexedDB, and show a "preparing
   demo data..." state — I'll benchmark this in Phase 2, not late.
4. **Three mocked transports (REST + GraphQL + WS) via MSW** is real
   integration surface. Keeping the GraphQL surface to dashboard aggregates
   only (as specified) keeps this bounded.
5. **"Realtime" with no real server.** Within one browser tab, optimistic
   Query-cache updates driven by the mock WS are straightforward. Making an
   approval in one tab show a toast in *another* tab of the same browser
   needs a mechanism the brief doesn't specify (e.g. `BroadcastChannel`).
   I'll treat single-tab optimistic updates as the Phase 4 baseline and
   cross-tab sync as an enhancement if time allows, not a blocking
   requirement.
6. **Vietnamese regulatory citation.** The brief states that "Circular
   99/2025/TT-BTC replaced Circular 200/2014/TT-BTC for fiscal years from 1
   Jan 2026." Circular 200/2014/TT-BTC is real and well-known; I can't
   independently verify the specific successor citation right now, and
   getting a regulation number wrong in a public portfolio aimed at a
   Vietnamese ERP-focused employer is a real credibility risk. See §12 —
   I'd rather soften the wording than assert an unverified number.
7. **Next.js version drift.** I'll pin whatever the actual current stable
   Next.js release is when `apps/site` is scaffolded in Phase 5, and record
   the real version in `CLAUDE.md`, rather than trust a version number
   written months before scaffolding happens.
8. **Coverage target (≥80% on `packages/contract` + domain logic)** is far
   easier to hit as a per-phase habit than a Phase-5 retrofit. Each phase's
   exit criteria (§8) includes tests for that phase's new logic.

## 10. JD requirement → feature mapping

(Canonical source for this table; copied into `README.md` in Phase 5.)

| JD requirement | Feature / evidence |
|---|---|
| ERP UIs: Accounting, Inventory, SCM (+HRM stretch) | Inventory, Purchasing, Sales, Accounting modules; HRM Leave (stretch) |
| Multi-step forms | PO wizard: Supplier → Lines → Delivery/Terms → Review; autosave draft |
| Approval flows | Approval engine + Approvals Inbox + status timeline on documents |
| Financial dashboards | Dashboard: revenue, gross margin, AR/AP aging, cash position |
| Real-time reporting tables | Inventory grid live-updates via WebSocket; "live" badge + row flash |
| GL/AR/AP, P2P, O2C, inventory | Document flows auto-post journal entries; GL, trial balance, aging |
| REST / GraphQL / WebSocket | MSW REST for CRUD, GraphQL for dashboard/reports, ws.link for events |
| Reusable components, FE architecture | `packages/ui` design system + DataGrid + FormKit; feature-sliced app |
| Performance optimization | Server-side pagination; virtualized 100k-row movements grid; code-splitting; bundle budget |
| Responsive design | Desktop-first dense layouts; tablet/mobile fallbacks (card lists) |
| Frontend security best practices | RBAC-aware UI, route guards, CSP headers, input sanitization, SECURITY.md |
| TypeScript, Tailwind, SCSS | TS strict; Tailwind v4; one SCSS module (print styles for invoice) |
| Git, CI/CD, Docker | GitHub Actions pipeline; Dockerfile (nginx static) |
| SSR/SSG (Next.js), SEO | `apps/site`: Next.js SSG case-study site with metadata, OG images, sitemap |
| Unit testing (Vitest/RTL) | Vitest + React Testing Library + Playwright e2e + axe a11y checks |
| Vue.js (equal option) | `apps/erp-vue`: Vue 3 Approvals Inbox on the same API contract (stretch) |
| Micro frontend (nice-to-have) | Shared contract package + Vue app mountable standalone; ADR on MFE trade-offs |
| VAS localization (nice-to-have) | VAS account codes, VND formatting, vi-VN dates, VAT 0/5/8/10%, mock e-invoice |
| Collaboration with BA/design/QA | `/docs/workflows` (user stories + Mermaid flows), Storybook, test plan |

## 11. ADR backlog

Written:

- [**0001**](adr/0001-monorepo-tooling.md) — Monorepo tooling: pnpm
  workspaces + Turborepo.
- [**0002**](adr/0002-msw-as-backend.md) — MSW-in-all-environments as the
  demo "backend": IndexedDB persistence strategy, and the cross-tab realtime
  question (§9.5).
- [**0003**](adr/0003-money-as-integer-vnd.md) — Money-as-integer-VND
  convention and where the shared arithmetic helpers live.
- [**0006**](adr/0006-rendering-strategy-split.md) — SPA (Vite) for
  `apps/erp`, Next SSG for `apps/site` — why the split.
- [**0007**](adr/0007-form-library.md) — Form library: React Hook Form + Zod.
- [**0008**](adr/0008-client-ui-state.md) — Client UI state: zustand.
- [**0009**](adr/0009-hosting-vercel.md) — Hosting: Vercel.

Not written yet — deferred until the design work actually happens, so the
ADR reflects a real decision rather than a placeholder:

- **0004** — Approval-engine data model (rules, thresholds, ordering).
  Needed before Phase 3.
- **0005** — Three-way-match tolerance model. Needed before Phase 3.

## 12. Open questions

### Resolved 2026-09-28

All four were answered as recommended; each now has an ADR (§11) except
XLSX, which is a scope/prioritization call rather than an architectural one:

1. **Form library** → React Hook Form + Zod. See ADR-0007.
2. **Client UI state** → zustand (+ Context for anything trivially local).
   See ADR-0008.
3. **Hosting target** → Vercel. See ADR-0009.
4. **XLSX export** → deferred to Phase 6 stretch; CSV covers the JD-mapping
   requirement for v1.

### Narrative (default + reasoning — tell me if you want something else)

- **Vietnamese circular citation (§9.6)** — default: soften the README/seed
  copy to "the chart of accounts is fully editable, reflecting how Vietnamese
  VAS regulations are periodically revised; codes shown are illustrative,"
  without citing a specific circular number, unless you can point me to a
  source for "Circular 99/2025/TT-BTC."
- **Push cadence** — default: push at the end of each phase once checks are
  green, not after every micro-commit, so CI signal on the branch stays
  meaningful. Say so if you'd rather I push after every single commit.
- **License** — default: MIT (portfolio code), unless you want none/other.
- **Node version** — default: whatever is Active LTS at Phase-0 scaffold
  time; I'll record the exact pinned version in `CLAUDE.md` rather than
  assume one now.
- **shadcn/ui theme** — default: "New York" style, neutral base color to
  start, with a teal/blue Mekong-river-ish accent once the shell exists —
  better to iterate visually than to bikeshed color hexes now.
- **Pull requests** — per your standing instructions, none will be opened
  unless you ask; work lands via commits pushed to
  `claude/vibrant-mccarthy-hj07u8`.

## 13. Immediate next step once approved

Phase 0: scaffold the pnpm + Turborepo monorepo, empty apps/packages, base
tsconfig/eslint/prettier/tailwind configs, husky + lint-staged + commitlint,
and a GitHub Actions CI skeleton (install/lint/typecheck/build against the
empty apps). Confirm everything is green, commit phase-by-phase, then report
back before starting Phase 1.

**Still waiting on an explicit go-ahead to start Phase 0 scaffolding** — the
four forced-choice questions are resolved (§12), but that's a different
checkpoint than approving the plan as a whole (phase breakdown, folder
structure, risk acceptance). Will not start scaffolding until that's given.

## 14. Progress log

- **2026-09-28** — Initial plan drafted from the project brief. Repo was
  empty at the start of this session (branch `claude/vibrant-mccarthy-hj07u8`
  already checked out).
- **2026-09-28** — Form library, client UI state, hosting, and XLSX
  questions (§12) resolved by the project owner, all matching the
  recommended defaults. Wrote ADR-0001, 0002, 0003, 0006, 0007, 0008, 0009.
  Still waiting for explicit approval of the plan as a whole before starting
  Phase 0.
