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

Phase 1 (logged-in shell) landed 2026-09-28, on top of the Phase 0 scaffold
(pnpm + Turborepo monorepo, CI, husky/lint-staged/commitlint). `apps/erp` now
has a real session-gated shell: MSW-backed session endpoint, RBAC
(`useCan`/`<Can>`/route guards), `_auth`/`_app` routing, sidebar/topbar/
command palette, i18n (vi default, en), light/dark theme, 404/error
boundaries. First real components in `packages/ui` (Button, Dialog,
DropdownMenu, Command). `packages/contract` and `apps/erp` both have real
Vitest coverage for this phase's domain logic. No business-entity features
yet (products, POs, etc. — that starts Phase 2). Check §14 (Progress log) in
`docs/PLAN.md` for the latest state before assuming more exists than this.

## Commands

```
pnpm install          # install workspace deps
pnpm dev              # run apps/erp (and other apps as added)
pnpm build            # build all apps/packages via Turborepo
pnpm lint             # eslint across the workspace
pnpm typecheck        # tsc across the workspace
pnpm test             # turbo run test (vitest in packages/contract and apps/erp)
pnpm format           # prettier --write
pnpm format:check     # prettier --check
```

`pnpm test:e2e` and `pnpm storybook` don't exist yet. `packages/ui` already
has its first real components (Button, Dialog, DropdownMenu, Command as of
Phase 1), but four small primitives don't yet earn a Storybook setup —
deliberately deferred to Phase 2, when DataGrid gives it a real payoff.
Playwright e2e lands per the plan, in Phase 5. Don't claim either runs until
actually wired up.

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

Phase 1 is complete (approved 2026-09-28, landed same day — see
`docs/PLAN.md` §14). **Phase 2 (DataGrid + Inventory) has not been asked for
yet** — don't start building the DataGrid, Products list/detail, or the
100k-row Stock Movements view until the project owner explicitly says to
move on, per the standing "ask before" rules above.

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
