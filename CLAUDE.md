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

Phase 6 (stretch) landed 2026-09-30 after the owner said "move on", **except
publishing Storybook and deploying anything** (still owner steps; `docs/PLAN.md`
§13). What landed, each with its ADR: **Excel export** from the DataGrid
(in-house OOXML writer on fflate, built in a same-origin worker — the library
first tried hung silently under the CSP; ADR-0013); **Storybook 10** for
`packages/ui` on design tokens now shared from `@mekong-erp/ui/tokens.css`, with
every story checked for console errors and axe A/AA in light and dark (ADR-0014);
**HR leave requests** as the second document on the approval engine — contract,
mock handlers, a `DB_VERSION` 4 targeted upgrade, HR screens under `/hrm`
(balance, request form with a live working-day preview, detail with timeline,
everyone's leave for approvers), leave rows in the shared approvals inbox
(ADR-0015); and **`apps/erp-vue`**, a standalone Vue 3 approvals inbox on the
shared contract with its own light demo dataset, unit and e2e tests (ADR-0016 —
not a composed micro frontend, and the README says so). Building leave also
exposed a real Phase 3 bug: a resubmitted document was decided against its
_old_ steps too (`latestChain` in the contract is the fix, with an e2e
regression spec; ADR-0015). `ApprovalView` changed shape (`{subject, amount,
unit}` replaces `supplierName`), which the owner approved beforehand. Saved
report builder and offline drafts (the rest of PLAN §8's Phase 6 list) were not
asked for and do not exist.

Phase 5 (Quality, docs, deploy) landed 2026-09-30 **except deployment**: no
Vercel projects exist, so there is no live URL, and the exit criterion "both
apps deployed" is unmet (see `docs/PLAN.md` §13 for the owner's steps). What
landed: 27 Playwright specs (full P2P and O2C flows, RBAC, dashboard, grid,
demo tools, layout, axe WCAG A/AA) run against the production build with the
real CSP; 150 unit tests with 99% line coverage of the pure domain modules;
strict security headers with a drift test; a 300 kB gzip initial-JS budget
(currently 273 kB); Lighthouse 98–100 across the app and 100 on the site;
`apps/site` with real content and SEO; README, `docs/workflows`, DEMO_SCRIPT,
SECURITY, CONTRIBUTING, LICENSE, screenshots; Dockerfile, `vercel.json` files,
and CI jobs for coverage, budget, e2e and a Docker build. It also added the
missing **Demo tools** (user menu: reset demo data, simulated latency and
failures) and fixed a dozen real defects the new checks found (list in
`docs/PLAN.md` §14). The Phase 4 summary below is still accurate for what each
module does.

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
pnpm test             # turbo run test (vitest in packages/contract, packages/ui, apps/erp, apps/erp-vue)
pnpm format           # prettier --write
pnpm format:check     # prettier --check
```

Also: `pnpm test:e2e` (builds `apps/erp`, then runs Playwright against
`vite preview`; ~14 min locally from a fresh seed, ~5 min on CI),
`pnpm test:e2e:vue` (the Vue inbox's suite, ~30 s), `pnpm --filter
@mekong-erp/contract test:coverage` (domain-logic thresholds), and `pnpm
--filter @mekong-erp/erp budget` / `pnpm --filter @mekong-erp/erp-vue budget`
(initial-bundle budgets; run after a build). Other apps: `pnpm --filter
@mekong-erp/erp-vue dev` (port 5174) and `pnpm --filter @mekong-erp/ui storybook`
(port 6006; `build-storybook` and `test:stories` check every story). There is
no root `pnpm storybook` script. Storybook is built and tested but **not
published**, and neither app is deployed: don't claim otherwise.

Run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
before every commit that touches app code (this is what CI's main job runs;
CI additionally runs coverage thresholds, both bundle budgets, `pnpm test:e2e`,
the Vue e2e suite, the Storybook check and a Docker build as separate jobs).
Run prettier from the repo root: `.prettierignore` is read from the working
directory, so `prettier` inside `apps/erp` reformats the generated
`routeTree.gen.ts`.

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
- **Import `z` from `@mekong-erp/contract`, never from `'zod'`** (ESLint
  enforces it). The contract's wrapper turns Zod's JIT off, because Zod 4's
  `new Function` probe otherwise violates the CSP on every load (ADR-0012).
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

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` green, plus
      `pnpm test:e2e` when the change touches UI or a business flow.
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
- `docs/DEMO_SCRIPT.md` — guided walk-through for a reviewer.
- `README.md` — public front page: JD mapping with honest statuses, quality
  numbers, deploy steps. Numbers in it must be re-measured, not edited by hand.
- `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE` (MIT).

## Confirmed decisions

Resolved 2026-09-28 (see `docs/PLAN.md` §12 and the linked ADRs — these are
settled, not defaults):

| Question        | Decision                                         | ADR                                                    |
| --------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Form library    | React Hook Form + Zod                            | [0007](docs/adr/0007-form-library.md)                  |
| Client UI state | zustand (+ Context for anything trivially local) | [0008](docs/adr/0008-client-ui-state.md)               |
| Hosting         | Vercel                                           | [0009](docs/adr/0009-hosting-vercel.md)                |
| XLSX export     | Built in Phase 6, in-house on fflate             | [0013](docs/adr/0013-xlsx-export-without-a-library.md) |

## Status of this plan

Phases 5 and 6 are complete except deployment/publishing (approved 2026-09-30
via "Move on", landed 2026-09-30 — see `docs/PLAN.md` §14). **Nothing is
deployed**: the project owner has to create the Vercel projects (`docs/PLAN.md`
§13; `apps/erp-vue` also needs its own `vercel.json`), host the static
Storybook, put the live links in the README and record a demo. **Anything past
Phase 6 has not been asked for** (saved report builder, offline drafts, more HR)
— don't start it until the project owner explicitly says to move on, per the
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
- From Phase 5: e2e runs in Chromium only; Lighthouse was measured on local
  production builds with the desktop preset (not on a hosted deployment or the
  mobile preset); the layout is desktop-first and not tuned for phones; no
  GIF/Loom was recorded (only `docs/DEMO_SCRIPT.md`); the Vercel configuration
  has never run on Vercel (the Docker image was built and smoke-tested by CI,
  not locally, as the authoring sandbox has no Docker daemon).

- From Phase 6: the inbox lists steps that are not yet actionable (a director's
  step under a still-pending manager step; the server refuses a decision on it
  with a 409). The fix is an `actionable` flag on `ApprovalView` — a contract
  change, so it is proposed in ADR-0016 and not made. The React inbox's Actions
  column is clipped at about 1400px wide (pre-existing; fixing it needs a
  default-pinning API on the DataGrid, a public-API change). The Vue app has no
  realtime feed, its own origin/data/login, and no `vercel.json`. Leave is a
  slice of HR: flat 12-day allowance, whole days, four fixed public holidays and
  no lunar ones, roles instead of reporting lines. `apps/erp/src/features/hrm`
  imports the approval hooks from `features/purchasing` (a cross-feature import
  that should move to a shared module if a third document type arrives). The
  `.xlsx` was verified with openpyxl and SheetJS, never desktop Excel.

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
- **`watch('lines')` is not a safe `useMemo` dependency.** React Hook Form
  returns its own array there and mutates it in place as fields change, so a
  memo keyed on it never recomputes; the PO wizard's Review step and the
  quotation form showed a blank line and a 0 VND total (the submitted document
  was correct). Use `useWatch({ control, name })`, which returns a fresh value
  on every change. The e2e P2P spec asserts the 220,000 VND review total.
- **Zod 4 + CSP.** Zod probes `new Function('')` when each schema is
  constructed; under a CSP without `unsafe-eval` that is reported as a
  `securitypolicyviolation` even though the throw is caught. Nothing breaks and
  no console check notices (Lighthouse's "issues logged in DevTools" audit
  did). `z.config({ jitless: true })` fixes it, but only if it runs before the
  first schema is built, and a side-effect-only config module was evaluated by
  the bundler after the chunk that had already built the schemas. So
  `packages/contract/src/zod.ts` sets it and re-exports `z` (a data
  dependency), and ESLint forbids `import ... from 'zod'` elsewhere.
- **A flex item never shrinks below its content** — the app shell's content
  column needs `min-w-0`, otherwise a wide grid stretches the whole page and
  pushes the top bar (user menu, theme, language) off-screen at 1360px.
  Playwright treats an off-screen element as _visible_, so only an explicit
  `toBeInViewport()` / `scrollWidth <= innerWidth` check catches it
  (`e2e/layout.spec.ts`).
- **e2e conventions** (`apps/erp/e2e`, ADR-0011). Specs run against `vite
preview` of the production build, with the real CSP. Seeding takes ~1 min, so
  `global-setup.ts` seeds once and saves `e2e/.auth/seeded.json` (~78 MB,
  gitignored, IndexedDB included); every test restores it, which is most of
  each test's ~50 s. `E2E_REUSE_SEED=1` skips reseeding for local iteration
  (rebuild `dist` first if app code changed). A sandbox's preinstalled Chromium
  may not match the Playwright version: set
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Vitest in `apps/erp` must exclude
  `e2e/**` (set in `vite.config.ts`) or it collects the specs.
- **Assertion traps found while writing the specs.** `expect(body).toContainText`
  sees adjacent elements' text run together (`QUO-2026-001307Sent`), so
  `\bSent\b` never matches and `Received` would match `Partially received`:
  use the `expectStatus` helper (exact badge text). Grid search is debounced, so
  the first Approve button in the still-unfiltered inbox belongs to another
  document: scope the click to the row containing this document's number.
  Recharts draws lines with a ~1.5 s entrance animation and opens a tooltip
  under a stationary pointer: for screenshots or axe runs, park the mouse and
  wait, or you will "see" a half-empty chart (the earlier false alarm) or a
  tooltip mid-fade.
- **A Radix dialog with no `DialogTitle` fails silently.** The installed Radix
  Dialog (1.1.23) no longer logs a dev warning for a missing title or
  description, so lint, types and the console all stay green while the dialog
  has no accessible name (the command palette and the searchable pickers shipped
  that way through Phase 4). Every `DialogContent` needs a `DialogTitle` (add
  `className="sr-only"` when it would repeat visible text); only axe's
  `aria-dialog-name`, or querying `getByRole('dialog', { name })`, notices a
  miss. Dialogs the page-level scans can't reach need their own spec
  (`e2e/a11y.spec.ts`).
- **Colour tokens are measured, not eyeballed.** Text on white and on a 10%
  tint of itself (badges) must be >= 4.5:1; the light-mode accent, success,
  warning and destructive tokens are >= 5:1. Keep chroma inside sRGB (a
  wider-gamut value is gamut-mapped by the browser to something with
  different contrast). Dark mode already passed.
- **Lighthouse here.** `npx lighthouse` (not a repo dependency) can't launch its
  own Chrome in this sandbox; start Chromium yourself with
  `--remote-debugging-port=N --user-data-dir=...` and pass `--port=N`. Use a
  profile that was seeded first plus `--disable-storage-reset`, otherwise you
  are measuring the 110k-record seed, not the app. The app can't be audited
  cold: a genuine first visit reached the login page in 9.0 s on an idle
  machine.
- **Sandbox shell gotcha.** `pkill -f`/`pgrep -f` inside a Bash call also matches
  the calling shell's own command line (the command text contains the pattern)
  and kills it (exit 144). Kill by PID, or put the kill in a script file and run
  it as its own command, never in the same command as the process it targets.
- The README's screenshots come from `apps/erp/scripts/capture-screenshots.mjs`
  against a running `vite preview` (reuses the e2e seeded state); regenerate
  them rather than hand-editing when the UI changes.

### Phase 6 notes

- **A library can pass every check and still hang under the CSP.** `write-excel-file`
  zips with fflate's _async_ API, which starts a `blob:` Web Worker for files over
  ~160 kB; `worker-src 'self'` blocks it and the promise never settles, so "Export"
  did nothing with no error. The in-house writer uses `zipSync` inside a same-origin
  worker script (ADR-0013). When adding a dependency, exercise its large-input path
  under the real CSP, not just a small demo.
- **Tailwind sources for Storybook and stories.** The app scans `packages/ui/src`
  with `@source`, and `@source not` excludes `*.stories.tsx` so story-only classes
  don't reach the app's stylesheet (the compiled CSS was compared byte-for-byte
  before and after the tokens moved). Storybook has its own `@source '../src'`.
- **Storybook's a11y addon and transitions.** axe allows one run per frame, so a
  second run from the test failed intermittently ("Axe is already running"); the story
  spec retries. Components ease their colours for 150 ms when the theme class lands,
  and a scan mid-transition measured 1.39:1 on a page that is fine — the spec cancels
  transitions first. A negative control (`#ccc` on `#fff`) confirmed the check bites.
- **`latestChain` before `decideApproval`.** A document has one chain per
  submission; anything that decides a step must pass only the newest submission's
  steps (`latestChain` in the contract), or an old "changes requested" step decides the
  outcome again. History views use `approvalHistory` (rounds). Both live in the
  contract because two clients need them.
- **Two `vite` copies after a dependency change.** A stale `apps/erp/node_modules/vite`
  symlink made `tsc -b` complain about the `test` key in `vite.config.ts` locally while CI
  passed. `pnpm install --frozen-lockfile` re-links it and leaves the lockfile alone.
- **Date-only strings are not instants.** `new Date('2027-03-01')` is UTC midnight and
  renders as the previous day west of Greenwich. Leave dates use `formatDateOnly`
  (`apps/erp/src/shared/lib/format.ts`, and the Vue app's own) and `yyyy-mm-dd` string
  arithmetic; both were checked under `TZ=America/Los_Angeles` and `Asia/Tokyo`.
- **e2e dates come from today.** The seeded leave history runs ~75 days past the day
  the browser was seeded, so specs use `e2e/dates.ts` (`anchorYear`, `freeWeek`,
  `addDays`) and read balances relative to a baseline. Hard-coded dates or absolute
  balances are a time bomb. The React suite restores `e2e/.auth/seeded.json`; with
  `E2E_REUSE_SEED=1` an older snapshot exercises the v3→v4 database upgrade.
- **The Vue app** (`apps/erp-vue`): `<script setup lang="ts">`, Vue Router in history
  mode, `@tanstack/vue-query`, logic in plain modules under `src/logic` (unit-tested
  without a component-test library — `@vue/test-utils` and `happy-dom` were not
  approved), a typed i18n dictionary (vi default, key `mekong-erp-vue:lang`), native
  `<dialog>`. `vue-tsc` runs two plain (non-composite) tsconfig projects, since a
  composite one raised TS2883. ESLint config: `packages/config/eslint/vue.js`
  (`eslint-config-prettier` last; `no-undef` off for `.vue`). It previews under the
  React app's CSP by importing `apps/erp/security-headers.ts`.
- **A hard navigation right after "Log out" aborts the in-flight `DELETE /api/session`**,
  and the aborted fetch is a console error that fails the guard. Wait for `/login`
  before navigating. Do not add a guard for MSW's service-worker update: it looked
  like the cause, was written, and was removed when repeating the spec showed it wasn't.
- **The inbox lists one row per step per round**, so a resubmitted document has two
  rows; specs filter to "Pending" or count rounds. Statuses default to "Any" in the
  React inbox, so a decided row stays listed. Sorting resets the page to 1 by design.
- **Screenshots.** `apps/erp/scripts/capture-screenshots.mjs` now also captures the HR
  screens (12–14); `apps/erp-vue/scripts/capture-screenshots.mjs` captures the Vue
  inbox (15–17) from `vite preview` on port 4174, with no saved state.
- **Lighthouse on the static site.** `apps/site/out` holds `case-study.html` next to a
  `case-study/` directory of data files. A plain file server asked for `/case-study/` returns
  a directory listing (HTTP 200), which Lighthouse scores as an 86/91 page with no `<main>`
  and no description; the real page, `/case-study.html`, scores 100. Audit the `.html` URL.
