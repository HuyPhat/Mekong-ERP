# Mekong ERP — Project Plan

Status: **Phase 2 complete (DataGrid + Inventory). Phase 3 not yet started.**
Last updated: 2026-09-28

This document is the durable source of truth for scope, architecture, phasing,
risks, and open decisions. It exists so any future session (including this one
after context is compacted) can resume work without re-reading the original
request in full. `CLAUDE.md` holds the day-to-day conventions and commands;
this file holds the _why_ and the _what_.

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
outcome, every phase boundary is a _demoable, deployed_ state:

| After phase | State                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------- |
| 0           | Not demoable — tooling/CI only. Internal milestone.                                          |
| 1           | Not demoable — shell + mock auth only. Internal milestone.                                   |
| 2           | **First demoable milestone.** Inventory + DataGrid alone is already portfolio-worthy.        |
| 3           | P2P loop complete. Phases 2+3 together are a credible minimum submission.                    |
| 4           | Full JD coverage: O2C, GL, dashboards, realtime.                                             |
| 5           | Polish-or-bust: this is where every quality-bar claim in the README has to actually be true. |
| 6           | Stretch (Vue inbox, HRM). Explicitly OK to skip if the application deadline arrives first.   |

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

- architecture write-up + screenshots, full SEO metadata, sitemap, OG image.
  _(Will pin the actual current stable Next.js version at scaffold time rather
  than assume one — see §9 risks.)_

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
on the empty apps). _Exit:_ CI green on a scaffold with no real features yet.

**Phase 1 — Foundation (M1: "logged-in shell").**
App shell (sidebar modules, topbar, breadcrumbs, command palette); mock auth +
role switcher; RBAC primitives (`<Can>`, `useCan`, route guards); i18n vi/en +
formatters; `packages/contract` + MSW + seed + persistence proven end-to-end
with one trivial handler; error boundaries; 404/403 pages; light/dark theme
tokens. _Exit:_ can log in as each demo user, see a permission-gated shell,
reload the page and keep the session/seed state.

**Phase 2 — DataGrid + Inventory (M2: "the grid").**
Full DataGrid feature set (§6); Products list↔form, Stock levels; 100k-row
Stock Movements virtualized view; CSV export/import for products. _Exit:_
first genuinely demoable milestone — grid, filtering, virtualization, CSV
round-trip all work against real seed data.

**Phase 3 — Procure-to-Pay (M3: "P2P end-to-end").**
PO wizard + line items; approval engine + inbox + timeline; Goods Receipt
(partial); Vendor Bill; Three-way match; AP postings; audit log entries.
_Exit:_ PO → approve → receive (partial) → bill → match → payment works
start to finish as one scripted demo path.

**Phase 4 — Order-to-Cash, Accounting, Dashboard, Realtime (M4: "live ERP").**
Quotation → SO → delivery → invoice (+ e-invoice preview) → payment; GL,
trial balance, AR/AP aging; GraphQL dashboard KPIs + charts; WebSocket events
updating the inventory grid + approval toasts. _Exit:_ full JD-mapping table
(§10) is true end to end.

**Phase 5 — Quality, docs, deploy (M5: "apply-ready MVP").**
Test coverage on critical logic; Playwright happy paths; axe checks;
Lighthouse pass; performance budget; security headers; README + JD table +
architecture diagram + ADR links; screenshots; GIF/Loom script; Next.js site;
both apps deployed; Dockerfile. _Exit:_ every claim in the README has been
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
   approval in one tab show a toast in _another_ tab of the same browser
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
7. **Next.js version drift.** Resolved in Phase 0: `apps/site` was scaffolded
   against whatever was actually current at install time (Next.js 16.3.6 —
   the brief's guess held up), not a version number assumed from memory.
   Real content still lands in Phase 5; re-verify the installed version
   hasn't moved meaningfully by then.
8. **Coverage target (≥80% on `packages/contract` + domain logic)** is far
   easier to hit as a per-phase habit than a Phase-5 retrofit. Each phase's
   exit criteria (§8) includes tests for that phase's new logic.

## 10. JD requirement → feature mapping

(Canonical source for this table; copied into `README.md` in Phase 5.)

| JD requirement                                     | Feature / evidence                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| ERP UIs: Accounting, Inventory, SCM (+HRM stretch) | Inventory, Purchasing, Sales, Accounting modules; HRM Leave (stretch)                      |
| Multi-step forms                                   | PO wizard: Supplier → Lines → Delivery/Terms → Review; autosave draft                      |
| Approval flows                                     | Approval engine + Approvals Inbox + status timeline on documents                           |
| Financial dashboards                               | Dashboard: revenue, gross margin, AR/AP aging, cash position                               |
| Real-time reporting tables                         | Inventory grid live-updates via WebSocket; "live" badge + row flash                        |
| GL/AR/AP, P2P, O2C, inventory                      | Document flows auto-post journal entries; GL, trial balance, aging                         |
| REST / GraphQL / WebSocket                         | MSW REST for CRUD, GraphQL for dashboard/reports, ws.link for events                       |
| Reusable components, FE architecture               | `packages/ui` design system + DataGrid + FormKit; feature-sliced app                       |
| Performance optimization                           | Server-side pagination; virtualized 100k-row movements grid; code-splitting; bundle budget |
| Responsive design                                  | Desktop-first dense layouts; tablet/mobile fallbacks (card lists)                          |
| Frontend security best practices                   | RBAC-aware UI, route guards, CSP headers, input sanitization, SECURITY.md                  |
| TypeScript, Tailwind, SCSS                         | TS strict; Tailwind v4; one SCSS module (print styles for invoice)                         |
| Git, CI/CD, Docker                                 | GitHub Actions pipeline; Dockerfile (nginx static)                                         |
| SSR/SSG (Next.js), SEO                             | `apps/site`: Next.js SSG case-study site with metadata, OG images, sitemap                 |
| Unit testing (Vitest/RTL)                          | Vitest + React Testing Library + Playwright e2e + axe a11y checks                          |
| Vue.js (equal option)                              | `apps/erp-vue`: Vue 3 Approvals Inbox on the same API contract (stretch)                   |
| Micro frontend (nice-to-have)                      | Shared contract package + Vue app mountable standalone; ADR on MFE trade-offs              |
| VAS localization (nice-to-have)                    | VAS account codes, VND formatting, vi-VN dates, VAT 0/5/8/10%, mock e-invoice              |
| Collaboration with BA/design/QA                    | `/docs/workflows` (user stories + Mermaid flows), Storybook, test plan                     |

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
- [**0004**](adr/0004-approval-engine-data-model.md) — Approval-engine data
  model: cumulative-tier rules, up-front chain materialization, halt-on-
  reject semantics.
- [**0005**](adr/0005-three-way-match-tolerance-model.md) — Three-way-match
  tolerance model: cumulative-received comparison, status priority order,
  override-with-reason gate.

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
- **Node version** — resolved in Phase 0: pinned to `22.22.2` (the Active LTS
  actually installed in the scaffold environment), recorded in `.nvmrc` and
  root `package.json` `engines`.
- **shadcn/ui theme** — default: "New York" style, neutral base color to
  start, with a teal/blue Mekong-river-ish accent once the shell exists —
  better to iterate visually than to bikeshed color hexes now.
- **Pull requests** — per your standing instructions, none will be opened
  unless you ask; work lands via commits pushed to
  `claude/vibrant-mccarthy-hj07u8`.

## 13. Immediate next step

Phase 2 is done (§14). **Phase 3 (Procure-to-Pay) has not been asked for
yet** — per the standing "ask before" rules, work on the PO wizard,
approval engine, Goods Receipt, Vendor Bill, three-way match, or AP
postings will not start until the project owner explicitly says to move on.

## 14. Progress log

- **2026-09-28** — Initial plan drafted from the project brief. Repo was
  empty at the start of this session (branch `claude/vibrant-mccarthy-hj07u8`
  already checked out).
- **2026-09-28** — Form library, client UI state, hosting, and XLSX
  questions (§12) resolved by the project owner, all matching the
  recommended defaults. Wrote ADR-0001, 0002, 0003, 0006, 0007, 0008, 0009.
- **2026-09-28** — Project owner said to proceed with the scaffold. Phase 0
  complete: pnpm + Turborepo monorepo; `packages/config` (shared strict
  tsconfig + flat ESLint configs); `packages/contract` and `packages/ui` as
  source-only placeholder packages; `apps/erp` (Vite + React 19 + TanStack
  Router file-based routing + Tailwind v4, importing `@mekong-erp/contract`
  to prove workspace wiring); `apps/site` (Next.js 16, `output: 'export'`);
  husky + lint-staged + commitlint; GitHub Actions CI
  (format:check/lint/typecheck/test/build). `pnpm format:check`, `lint`,
  `typecheck`, `test` (trivially, 0 test scripts exist yet), and `build` all
  pass. Both apps' dev servers were verified rendering in a real browser
  (Playwright/Chromium screenshots), not just build success. Deferred out of
  Phase 0 as premature: TanStack Query/Zod/MSW, shadcn/ui, Storybook,
  Vitest, Dockerfile, `apps/erp-vue` — each lands with the phase that
  actually needs it. Two tooling decisions made empirically rather than
  from memory: TypeScript pinned to `6.0.3` (not the newest `7.x`, which
  `typescript-eslint` doesn't support yet) and ESLint kept at current `10.x`
  despite `eslint-plugin-jsx-a11y`'s peer range still declaring only up to
  9.x (verified jsx-a11y's rules actually run correctly against real JSX
  first). See `CLAUDE.md` "Known tooling notes" for details. Pushed to
  `claude/vibrant-mccarthy-hj07u8`.
- **2026-09-28** — Project owner said to proceed to Phase 1. Landed the full
  logged-in shell: session modeled as a real MSW-backed endpoint
  (GET/POST/DELETE `/api/session`, localStorage-persisted) rather than a
  zustand slice, so it doubles as the "MSW + contract proven end-to-end"
  exit criterion; six fixed demo personas with a `resource:action`
  permission catalog; `useCan()`/`<Can>` plus `requireSession`/
  `requirePermission` route guards; `_auth` (login) and `_app`
  (session-gated shell) route layouts with one guarded route per sidebar
  module; app shell (sidebar, topbar, cmdk command palette, role switcher
  doubling as the topbar user menu); i18n (vi default, en, persisted only on
  explicit switch) and Intl-based VND/number/date formatters; light/dark
  theme tokens with a zustand-backed toggle (zustand also owns sidebar-
  collapsed and command-palette-open state, per ADR-0008); root-level 404
  and error boundaries. First real components landed in `packages/ui`
  (Button, Dialog, DropdownMenu, Command), hand-authored in shadcn/ui's own
  style rather than via its CLI. All checks green throughout.
  Two bugs surfaced only by an actual Playwright run against the dev
  server, invisible to lint/typecheck/build: (1) `i18next-browser-
languagedetector`'s navigator-based detection was silently forcing
  English on first load, contradicting the "vi default" requirement — fixed
  by dropping `navigator` from the detection order; (2) Tailwind's content
  scanner doesn't reach `packages/ui` from this app by default, so utility
  classes used only there (Dialog's centering, specifically) never made it
  into the compiled CSS — the command palette rendered unstyled and inline
  at the page bottom until an explicit `@source` was added. Full flow
  (login → RBAC-filtered nav → direct-URL 403 and unknown-route 404 → role
  switch → theme/language toggle → reload-persistence) verified with zero
  console errors. Pushed to `claude/vibrant-mccarthy-hj07u8`.
- **2026-09-28** — Closed a gap against `CLAUDE.md`'s own definition of done
  (tests land with the phase that introduces the logic): wired up Vitest in
  `packages/contract` and `apps/erp` and covered this phase's actual domain
  logic — `hasPermission()`'s wildcard/exact-match rules and the VND/number/
  date Intl formatters. Writing the VND test surfaced a genuine gotcha
  (Intl's no-break space before the currency symbol is byte-different from,
  but visually identical to, a regular space), normalized explicitly rather
  than papered over. `pnpm test` now runs 11 real tests instead of 0.
- **2026-09-28** — Project owner said to proceed to Phase 2. Landed the full
  DataGrid + Inventory milestone (§6, §8 exit criteria).
  **Contract**: entity schemas (`Product`, `Warehouse`, `StockLevel`,
  `StockMovement`, denormalized `*View` variants) and generic list-query
  helpers (`parseSort`/`applySort`/`paginate`/`matchesSearch`) shared by every
  list endpoint; a hand-rolled Promise-based IndexedDB wrapper (`Collection<T>`
  over raw `indexedDB`, no external dependency — `idb` wasn't pre-approved in
  §3) persisting seed data across reloads; deterministic `@faker-js/faker`
  generators (fixed seeds) for 2 warehouses, 3,000 products, and 100,000 stock
  movements, with stock levels derived from movement history rather than
  seeded independently; MSW handlers for the full products/warehouses/
  stock-levels/stock-movements surface plus a bulk CSV-import upsert-by-SKU
  endpoint, all Zod-validated at the boundary.
  **DataGrid** (`packages/ui`): built on TanStack Table v9, which turned out
  to have a completely redesigned feature-plugin API versus the v8 shape
  assumed from training data — caught early by pulling version-matched
  guidance via `npx @tanstack/intent@latest` instead of guessing, which
  avoided building the whole thing against the wrong API. Delivered: manual
  (server) and virtualized (TanStack Virtual, client) row models; multi-column
  sort; column show/hide and resize/pin with localStorage layout persistence
  and "Reset layout" (column drag-reorder has state and persistence wired but
  no drag handle UI yet — a real gap, not claimed as done); per-column filters
  covering all four required types (text, number-range, date-range,
  enum-multiselect) plus debounced global search; saved views/favorites
  (localStorage-backed, per view); row selection with a bulk-action bar
  (confirmation + succeeded/failed reporting); right-aligned money/number
  cells with tabular numerals and a totals-footer slot; loading-skeleton/
  error-retry/empty states; ARIA grid semantics (`role="grid"`, `aria-sort`,
  a focusable-separator resize handle per the APG pattern) — full spreadsheet-
  style arrow-key cell navigation was not built, only per-control keyboard
  access (sort/pin/resize/checkboxes), another honest gap rather than an
  overstated "keyboard nav" checkbox; CSV export of the current filtered
  result and CSV import with column mapping, Zod row-level validation
  preview, and commit. `packages/ui` had no i18n mechanism of its own (by
  design, to stay reusable) but its chrome text was still hardcoded English
  — fixed by threading a `labels` prop (with English defaults) through every
  DataGrid subcomponent, populated from `apps/erp`'s real translations, so
  the "vi default, en" requirement now actually covers the grid, not just
  business copy.
  **apps/erp**: five new `_app/inventory/*` routes — a shared tabs layout,
  Products list (DataGrid + filters + saved views + CSV export/import + bulk
  "set reorder point" demo action, gated behind a new `inventory:write`
  permission), Product detail/form (React Hook Form + Zod — the project's
  first form, `z.coerce.number()` fields needed RHF's 3-generic
  `useForm<Input, Context, Output>` form to reconcile raw-vs-coerced types
  under `exactOptionalPropertyTypes`), Stock levels (warehouse/quantity
  filters, totals footer), and Stock movements (100k rows, client-virtualized,
  client-side filtering since there's no server pagination to filter
  against). All list state (page, sort, filters, search) round-trips through
  Zod-validated URL search params.
  Two real bugs surfaced only by an actual Playwright/Chromium run against
  the dev server — invisible to lint/typecheck/build/tests: (1) naming the
  detail route `products.$productId.tsx` next to `products.tsx` makes
  TanStack Router nest it as a child (the same dot-file convention that
  already nests `_app/inventory/*` under `_app.tsx`), so the list route had
  to become a pure `<Outlet/>` layout with its content moved to
  `products/index.tsx` for both routes to render correctly instead of one
  clobbering the other; (2) the Stock Movements grid's virtualized rows use a
  `<tbody style="display:block">` so TanStack Virtual can absolutely-position
  rows inside it — but a `<tbody>` forced off its table display loses the
  `<table>`'s width entirely (a real, if obscure, browser quirk) and
  shrink-wraps to ~150px, so every row's cells collapsed and overlapped into
  a garbled mess in the first ~20% of the grid. Row counts, filtering, and
  DOM structure all checked out fine in headless assertions; only a rendered
  screenshot showed the corruption. Fixed with an explicit `width:
table.getTotalSize()` on the `<tbody>`.
  Also added this phase's tests (list-query helpers, CSV formula-injection
  sanitization, filter-count logic, sort-param URL round-trip, stock-level
  computation from movements) and wired Vitest into `packages/ui` for the
  first time (`pnpm test` now covers all three packages that have logic
  worth testing, 61 tests total, 0 skipped). `pnpm format:check`, `lint`,
  `typecheck`, `test`, and `build` all green across every package. Verified
  in a real browser as warehouse-staff and admin personas: search, every
  filter type, sort, pagination, product edit/save/revert, bulk action with
  confirmation, CSV export (real download) and import dialog, saved-view
  save/apply, and the 100k-row virtualized scroll — all with zero console or
  page errors. Pushed to `claude/vibrant-mccarthy-hj07u8`.
- **2026-09-28/29** — Project owner said to move on to Phase 3. Landed the
  full Procure-to-Pay milestone (§6, §8 exit criteria): PO wizard, a
  configurable amount-tiered approval engine, partial Goods Receipt, Vendor
  Bill with three-way match (and override), AP postings, and an audit log —
  one PO can now go create → submit → approve → receive (partial ×2) → bill
  → match → pay → closed as a single scripted path.
  **Contract**: entity schemas (`Supplier`, `PurchaseOrder`/`*Line`,
  `GoodsReceipt`, `VendorBill`, `Approval`/`ApprovalRule`, `AuditLogEntry`,
  `JournalEntry`, each with denormalized `*View` variants); `money.ts`
  (`computeLineTotal`/`computeLineVat`/`computeDocumentTotals`/`isBalanced`)
  as the one ADR-0003-mandated home for arithmetic, now that Phase 3 is the
  first phase needing real computation rather than display; a pure
  `approval-engine.ts` (cumulative-tier rule resolution, up-front chain
  materialization, halt-on-reject/changes-requested with remaining steps
  marked `skipped` — ADR-0004) and a pure `three-way-match.ts` (cumulative-
  received-qty comparison, priority-ordered status, configurable tolerance,
  default 2% price / exact qty — ADR-0005); a new `approver_finance` role so
  the brief's 3-tier escalation example is genuinely three different people;
  seed generators for 150 suppliers and 1,500 POs spread realistically across
  all 9 lifecycle statuses, with a `procurement.ts` orchestrator building
  each PO's matching approval chain, GRNs, journal entries, and (for
  billed/closed POs) a vendor bill with ~30% of bills carrying an intentional
  price/qty variance for three-way-match demo variety; MSW handlers for the
  full suppliers/purchase-orders/goods-receipts/vendor-bills/approvals/audit-
  log surface including every status-transition action
  (submit/cancel/receive/create-bill/confirm-match/override-match/pay/
  decide); IndexedDB extended to 12 stores total. Added 41 new tests
  (`money`, `approval-engine`, `three-way-match` — all pure functions), 70
  total in `packages/contract`.
  **`packages/ui`**: Toast (Radix, zustand-backed queue so any mutation
  callback can fire one via `toast({...})` without prop drilling);
  `StatusBadge` (5-tone system — added `--color-success`/`--color-warning`
  tokens, the first phase needing more than accent/destructive) and
  `Timeline` for document activity; FormKit — `Form`/`FormField`/`FormItem`/
  `FormLabel`/`FormControl`/`FormMessage` (shadcn's canonical RHF-Controller
  pattern, context-linking label/control/error via generated ids),
  `Input`/`Textarea`/`Select`/`Checkbox`, a `Wizard`/`WizardFooter`/
  `WizardDraftBanner` shell with a `useWizardDraft` hook (debounced
  localStorage autosave of in-progress form state, independent of any real
  entity persistence), and a `LineItemsTable` shell deliberately decoupled
  from `useFieldArray`'s generics (the caller drives `useFieldArray` itself
  and hands over `fields`/add/remove/a per-cell render prop) to avoid fighting
  RHF's typing across a reusable component.
  **`apps/erp`**: query-keys/hooks/search-schemas for the whole purchasing
  feature; a `purchasing` tab layout (Suppliers/Purchase Orders/Vendor Bills)
  replacing its Phase-1 placeholder; a `ComboboxField` (built on the existing
  Command/Dialog primitives, not a new Radix Select) for supplier/product/PO
  pickers, client-filtered at this app's seed sizes rather than a real-scale
  server-searched combobox; a 4-step PO wizard (Supplier → Lines → Delivery &
  terms → Review) with autosaved drafts, "save as draft" and "create &
  submit" both wired; PO detail (status-conditional actions, linked
  GRNs/bills, an approval-chain timeline) and a Goods Receipt route
  supporting partial receipt against an approved PO; Vendor Bill
  create/detail with a live three-way-match table and confirm/override
  actions; an Approvals inbox (search/status filters, per-row
  approve/reject/changes-requested-with-reason, bulk approve); an Audit Log
  viewer replacing the Admin section's Phase-1 placeholder. `<Toaster/>`
  mounted once at the root.
  Two real findings surfaced only by an actual Playwright/Chromium run
  against a production build — invisible to lint/typecheck/build/tests:
  (1) first-load seeding now writes roughly 110,000+ records across 12
  IndexedDB stores (Phase 2's 100k stock movements plus this phase's
  suppliers/POs/GRNs/bills/approvals/journal/audit volume); in a real
  browser's IndexedDB (as opposed to the in-memory polyfill the seed
  generator's own smoke test ran against) this took 20–30 seconds
  sequentially, during which the app showed nothing but a loading skeleton —
  indistinguishable from broken. Fixed two ways: the 12 stores' bulk-put
  writes now run concurrently (`Promise.all`, since they're independent
  transactions) instead of sequentially, and `main.tsx` now awaits
  `ensureSeeded()` explicitly before rendering the router, showing a
  one-time "Preparing demo data…" splash instead of leaving seeding as a
  silent side effect of whichever query happens to fire first — a one-time
  cost per browser profile; every later load hydrates from IndexedDB in
  under a second. (2) Not a bug but worth recording: a combobox trigger
  wrapped in `FormControl`/`FormLabel` gets its accessible name from the
  associated `<label>` text ("Supplier"), correctly overriding the button's
  own visible placeholder text ("Search suppliers…") per the browser's name-
  computation algorithm — confirmed the accessibility wiring is working as
  intended, but means testing such a field means querying by its label, not
  its placeholder text (noted in `CLAUDE.md`).
  Known, deliberate simplifications (not silently skipped): a
  `changes_requested` PO is resubmitted as-is from its detail page rather
  than re-opened in the wizard for editing (ADR-0004 describes edit-then-
  resubmit; only the resubmit half is built, since re-populating the
  wizard's product comboboxes from bare stored ids needs product-name
  resolution this phase didn't need to build); PO-side operational actions
  (submit/cancel/receive/create-bill/pay/confirm-match) attribute the audit
  log to the operating role (`purchasing`/`warehouse`/`accountant`) rather
  than the specific logged-in demo user, matching the existing seed-
  generation convention — only approval decisions (approve/reject/changes-
  requested) carry the real actor id, since the UI passes the session's
  user id there. `pnpm format:check`, `lint`, `typecheck`, `test`, and
  `build` all green across every package. Pushed to
  `claude/vibrant-mccarthy-hj07u8`.
