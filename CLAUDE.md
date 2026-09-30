# CLAUDE.md

Conventions and commands for working in this repo. For the full spec,
phase plan, architecture rationale, risks, and open decisions, see
[`/docs/PLAN.md`](docs/PLAN.md) — read it before starting a new phase.

## What this is

**Mekong ERP** — a portfolio project simulating a mini ERP back-office for a
fictional Vietnamese FMCG trading SME. Built to demonstrate frontend skills
against an ERP-focused job description: Procure-to-Pay, Order-to-Cash,
Inventory, Accounting-lite, a configurable approval engine, dashboards, and
admin/RBAC — all against a fully mocked backend (MSW: REST + GraphQL + WS)
so the whole thing runs and deploys with no real server.

## Current status

Phase 4 (Order-to-Cash, Accounting, Dashboard, Realtime) landed 2026-09-30,
on top of Phase 3's P2P flow, Phase 2's DataGrid + Inventory, and Phase 1's
logged-in shell. `apps/erp` now also has a full O2C flow: Customers list,
Quotations list + single-page create form + detail (send/accept/reject/
convert-to-SO), Sales Orders list + detail (confirm/cancel/deliver/create-
invoice), a partial Delivery route, and Customer Invoices list/detail/
record-payment plus a print-ready e-invoice preview (mock only, Vietnamese
amount-in-words, mock XML download) — one quotation can go create → send →
accept → convert → deliver (×2, partial) → invoice → pay → closed as a
single scripted demo path, alongside Phase 3's P2P path, verified in a real
browser. Accounting gained real reports — Chart of Accounts, General
Ledger, Trial Balance, AR/AP Aging — computed on-demand from journal
entries (ADR-0010). The Dashboard route is now real: 6 KPI tiles + a
revenue/COGS trend chart + two aging bar charts, fed by one GraphQL query.
A WebSocket layer pushes `stock.changed`/`approval.*`/`document.posted`
events that invalidate the relevant TanStack Query caches, toast, and flash
the affected Stock Levels row — same-tab only (ADR-0002). `packages/contract`
gained Customer/Quotation/SalesOrder/Delivery/CustomerInvoice/
ChartOfAccount entities, the GL/aging pure-compute engine, and
`vndToWords()` (95 tests total in that package now). `packages/ui` gained
Card and KpiTile. Check §14 (Progress log) in `docs/PLAN.md` for the full
detail, including four real bugs found and fixed this phase, before
assuming more exists than this.

## Commands

```
pnpm install          # install workspace deps
pnpm dev              # run apps/erp (and other apps as added)
pnpm build            # build all apps/packages via Turborepo
pnpm lint             # eslint across the workspace
pnpm typecheck        # tsc across the workspace
pnpm test             # turbo run test (vitest in packages/contract, packages/ui, and apps/erp)
pnpm format           # prettier --write
pnpm format:check     # prettier --check
```

`pnpm test:e2e` and `pnpm storybook` don't exist yet. `packages/ui` now has
DataGrid (the component Storybook was deliberately waiting for, per the
Phase 1 note this replaces) alongside Button/Dialog/DropdownMenu/Command,
so the payoff case for Storybook is real now — but setting it up is a
project-owner call (new tooling, not free), not something to add silently.
Playwright e2e still lands per the plan, in Phase 5. Don't claim either runs
until actually wired up.

Run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
before every commit that touches app code (this is exactly what CI runs).

## Non-negotiable conventions

- **TypeScript strict everywhere**: `strict: true`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any`. No
  non-null assertion (`!`) without a comment explaining why it's safe.
  Prefer Zod-inferred types over hand-written ones for anything crossing an
  API boundary.
- **Money is always integer VND.** Never a float. Shared arithmetic/rounding
  helpers live in one place ([ADR-0003](docs/adr/0003-money-as-integer-vnd.md))
  — don't reimplement rounding per feature.
- **Server state lives only in TanStack Query**, keyed via one factory per
  entity (e.g. `purchaseOrderKeys.list(filters)`). Never duplicate server
  data into a client store.
- **URL is the source of truth for list views**: page, pageSize, sort,
  filters, column presets, search — validated with Zod in `validateSearch`.
  A list view that doesn't survive a refresh or a pasted link is a bug.
- **API boundary**: every response parsed with Zod in `packages/contract`.
  Errors normalize to `{ code, message, fieldErrors? }` — don't let a raw
  fetch error reach a component.
- **RBAC is UX only on the client.** Gate with `<Can permission>`,
  `useCan()`, and route `beforeLoad` guards — but never claim or imply this
  is real authorization; `SECURITY.md` says so explicitly, and any doc/comment
  suggesting otherwise is wrong.
- **`packages/contract` stays framework-agnostic** — no React imports. This
  is what lets `apps/erp-vue` (stretch) reuse it.
- Feature-sliced structure inside `apps/erp/src/features/*`: a feature owns
  its route glue, components, hooks, and queries. Shared/cross-feature UI
  goes in `packages/ui`, not copy-pasted.

## Commit & branch discipline

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`,
  `chore:`), one logical change per commit, imperative mood.
- Never commit with failing lint/typecheck/test/build.
- All work happens on `claude/vibrant-mccarthy-hj07u8`. Push with
  `git push -u origin claude/vibrant-mccarthy-hj07u8`. Never force-push
  without explicit permission. No PR unless explicitly asked.
- Default push cadence: end of each phase, once checks are green (see
  `docs/PLAN.md` §12 — tell me if you'd rather I push after every commit).

## Always ask before

- Adding any dependency not already named in `docs/PLAN.md` §3.
- Changing the stack, folder structure, or a public API/contract shape.
- Deleting files.
- Anything that's more than ~2 hours of work in one go.

(These are standing instructions from the project owner — don't relax them
because a task "seems small.")

## Definition of done (per phase, and per meaningful PR-sized chunk)

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` green (+
      `pnpm test:e2e` once it exists).
- [ ] No new `any`, no console errors/warnings introduced in dev.
- [ ] Tests added for this phase's new domain logic — not deferred to a
      later "testing phase."
- [ ] `docs/PLAN.md` progress log updated; a new ADR added under
      `docs/adr/` if a significant decision was made.
- [ ] Conventional commit(s) made; pushed per the cadence above.
- [ ] Short summary given: what changed, what's next, any trade-offs made.

## Pointers

- `docs/PLAN.md` — full spec, phase plan, risks, ADR backlog, open questions.
- `docs/adr/NNNN-title.md` — one file per significant decision.
- `docs/workflows/` — user stories + Mermaid diagrams (P2P, O2C, approvals).
- `docs/DEMO_SCRIPT.md` — written in Phase 5.
- `README.md` — written in Phase 5 (needs real, working features to point at
  before it's worth writing).

## Confirmed decisions

Resolved 2026-09-28 (see `docs/PLAN.md` §12 and the linked ADRs — these are
settled, not defaults):

| Question        | Decision                                         | ADR                                      |
| --------------- | ------------------------------------------------ | ---------------------------------------- |
| Form library    | React Hook Form + Zod                            | [0007](docs/adr/0007-form-library.md)    |
| Client UI state | zustand (+ Context for anything trivially local) | [0008](docs/adr/0008-client-ui-state.md) |
| Hosting         | Vercel                                           | [0009](docs/adr/0009-hosting-vercel.md)  |
| XLSX export     | Deferred to Phase 6                              | —                                        |

## Status of this plan

Phase 4 is complete (approved 2026-09-29 via "Move on", landed 2026-09-30 —
see `docs/PLAN.md` §14). **Phase 5 (Quality, docs, deploy) has not been
asked for yet** — don't start Playwright e2e, axe/Lighthouse passes, the
performance budget, security headers, the README/architecture write-up, or
deployment until the project owner explicitly says to move on, per the
standing "ask before" rules above.

Known gaps carried forward rather than overstated as done:

- From Phase 2's DataGrid: column drag-reorder has state and persistence
  wired but no drag-handle UI, and grid keyboard support covers individual
  controls (sort/pin/resize/checkboxes) but not full ARIA-APG arrow-key cell
  navigation.
- From Phase 3: a `changes_requested` PO is resubmitted as-is from its
  detail page rather than re-opened in the wizard for editing (ADR-0004
  frames edit-then-resubmit as the intended path; only the resubmit half is
  built — re-populating the wizard's product comboboxes from bare stored
  ids needs product-name resolution this phase didn't need elsewhere). The
  supplier/product comboboxes load the full catalog client-side and filter
  in memory rather than a server-searched, paginated combobox — fine at
  this app's seed sizes (150 suppliers, 3,000 products), not a real-scale
  pattern. PO-side operational actions (submit/cancel/receive/create-
  bill/pay/confirm-match) attribute the audit log to the operating role
  (`purchasing`/`warehouse`/`accountant`) rather than the specific logged-in
  demo user; only approval decisions carry the real actor id.
- From Phase 4: General Ledger/Trial Balance/AR/AP Aging (ADR-0010) recompute
  fully from the entire journal-entry list on every request rather than
  maintaining running balances — consistent by construction, but a real
  scale concern if ever revisited. Realtime stays same-tab only per the
  pre-existing ADR-0002: a mutation in one browser tab doesn't toast or
  invalidate caches in another tab of the same browser. The dashboard's
  GraphQL surface is intentionally exactly one query (`DashboardAggregates`,
  PLAN.md §9 risk 4) — there is no other GraphQL endpoint to extend without
  a deliberate decision to widen that surface.

Pick these up if a future phase's work would benefit, or if asked.

## Known tooling notes

- `eslint-plugin-jsx-a11y@6.10.2`'s declared peer range tops out at
  ESLint 9; we run ESLint 10 anyway since every other plugin already supports
  it and jsx-a11y's rules verified working against real JSX in lint runs.
  Harmless pnpm peer warning — revisit if jsx-a11y ever actually misbehaves.
- TypeScript is pinned to `6.0.3`, not the newest `7.x`, because
  `typescript-eslint` doesn't support TS 7 yet. Don't bump TypeScript past
  6.0.x until typescript-eslint's peer range allows it.
- `src/routeTree.gen.ts` (apps/erp) and Next's `next-env.d.ts` (apps/site)
  are tool-generated; the former is committed (avoids a CI generation-order
  problem), the latter is gitignored (nothing depends on it existing). Don't
  hand-edit either.
- Turborepo and Next.js each auto-generate an `AGENTS.md` (and Next also a
  `CLAUDE.md` stub) warning that their APIs may differ from training data.
  These are legitimate and self-explanatory — keep them committed as their
  own content asks; don't mistake them for stray files.
- **Tailwind only auto-scans `apps/erp`'s own files.** Any class used only
  inside `packages/ui` (or any other workspace package) needs an explicit
  `@source '../../../packages/ui/src';` in `apps/erp/src/index.css` (already
  added) or it silently never makes it into the compiled CSS — components
  render with zero styling/positioning, and lint/typecheck/build all stay
  green regardless. If a future `packages/*` UI package needs its classes
  picked up too, it needs its own `@source` line. Caught only by an actual
  browser check (Dialog rendered unstyled and inline until this was added).
- `i18next-browser-languagedetector`'s `detection.order` must NOT include
  `'navigator'` for this project — the visitor's OS/browser locale would
  silently override the "vi default" requirement (§3) on first load.
  `localStorage` only, so the default holds until an explicit in-app switch.
- Intl output (`Intl.NumberFormat`, `Intl.DateTimeFormat`) uses locale-
  specific whitespace (e.g. a no-break space, U+00A0, before "₫") that is
  visually identical to a regular space but fails a strict string-equality
  test against a hand-typed literal. Check real output (`node -e "..."` or a
  code-point dump) before asserting exact formatter output in a test.
- A `<tbody>` forced to `display: block` (needed to let TanStack Virtual
  absolutely-position rows inside it) loses the parent `<table>`'s width
  entirely and shrink-wraps instead — a genuine, easy-to-miss browser quirk,
  not a TanStack Virtual bug. Give it an explicit `width` matching
  `table.getTotalSize()`. Caught only by a rendered screenshot; row counts
  and DOM structure looked completely fine in headless assertions
  (`packages/ui/src/data-grid/data-grid.tsx`).
- TanStack Router's default search-param codec JSON-parses any value that
  looks like JSON (`?page=2` → the number `2`, not the string `"2"`). A Zod
  search schema field using `.catch()`/`.default()` to survive a bad URL
  therefore has a non-optional _output_ type, which makes that field
  required at every typed `<Link>`/`redirect()` call site targeting that
  route — including from unrelated routes, since ancestor routes' search
  stays live during a child navigation. Pass the field explicitly at those
  call sites (see the inventory routes' `search={{ page: 1, pageSize: 50 }}`
  back-links) rather than fighting the type.
- A route file named `foo.bar.tsx` next to `foo.tsx` (TanStack Router's
  flat-file nesting convention — the same mechanism that nests `_app/*`
  under `_app.tsx`) makes `foo.tsx` `bar`'s parent whether you intended
  nesting or two siblings. If `foo.tsx` renders content directly instead of
  `<Outlet/>`, the child route has nowhere to render. Two routes meant to be
  siblings both need to live one level down (`foo/index.tsx` +
  `foo/bar.tsx`), with `foo.tsx` reduced to a pure `<Outlet/>` layout.
- `zod`, `@tanstack/react-table`, and any other package only `apps/erp`
  imports directly (not just transitively through a workspace dependency
  like `@mekong-erp/contract` or `@mekong-erp/ui`) needs its own entry in
  `apps/erp/package.json`. pnpm's workspace linking doesn't hoist a
  transitive dependency into a place `tsc`/Vite will resolve it from for a
  package that doesn't declare it — `tsc -b` fails with "Cannot find module"
  even though the package is already in the lockfile.
- **First-load seeding is a real, multi-second wait, not a bug** — by Phase 3
  the seed data is 110,000+ records across 12 IndexedDB stores. A real
  browser's IndexedDB (unlike the in-memory polyfill the seed generator's own
  smoke-test script runs against) took 20–30 seconds to write all of that on
  first visit before this was fixed, with nothing on screen but a loading
  skeleton — indistinguishable from a hung app. Fixed by (1) writing all 12
  stores' bulk-put transactions concurrently (`Promise.all`, they're
  independent) instead of sequentially, and (2) `main.tsx` now explicitly
  awaits `ensureSeeded()` before rendering the router, showing a one-time
  "Preparing demo data…" splash instead of leaving seeding as a silent side
  effect of whichever query fires first. Still a one-time real cost per
  browser profile (every later load hydrates from IndexedDB in under a
  second) — if a future phase adds much more seed volume, re-check this
  rather than assuming it still fits comfortably in a few seconds.
- A form control wrapped in FormKit's `FormLabel`/`FormControl` gets its
  accessible name from the associated `<label>` text, which correctly wins
  over the control's own visible text per the browser's name-computation
  algorithm (e.g. a combobox trigger displaying "Search suppliers…" but
  labeled "Supplier" has an accessible name of "Supplier", not its own
  placeholder text). This is correct, intended behavior, not a bug — but it
  means a test (or anything else querying by accessible role/name) has to
  target the label, not the visible placeholder text, for any field built
  this way.
- **The app defaults to `vi`, not `en`** (per the `navigator`-detection note
  above) — a Playwright assertion against an English string (e.g. matching a
  KPI label or button text) will silently never match and just time out,
  with no console or page error to point at the real cause. This produced a
  false "the dashboard never finishes loading" alarm this phase (the page
  had actually rendered correctly, in Vietnamese, well before the timeout).
  Either assert against the real Vietnamese copy, or switch the language
  toggle first, in any Phase 5 e2e spec.
- `page.waitForFunction`'s predicate runs in the browser and can only close
  over serializable arguments — a `RegExp` object passed directly (or
  captured via closure) crosses that boundary as `{}`. Pass `pattern.source`
  **and** `pattern.flags` explicitly and reconstruct `new RegExp(...)` inside
  the predicate; passing `source` alone silently drops case-insensitivity
  and similar flags rather than erroring.
- A CSS `text-transform` (e.g. `uppercase` on an invoice heading) changes
  what Playwright's `innerText` reads (it reflects rendered/layout text) but
  not `textContent`. A regex asserting on `innerText` against such an
  element needs to match the transformed case (or use `/i`), even though the
  source text/props never changed case.
