# ADR-0011: End-to-end and accessibility testing runs against the production build

Status: Accepted
Date: 2026-09-30

## Context

Across Phases 1–4 the most damaging defects were invisible to lint, the type
checker and unit tests, and were only found by driving the built app in a real
browser: a detail route swallowed by its sibling list route, a virtualized
`<tbody>` collapsing to 150px wide, Tailwind not scanning `packages/ui`, and a
20–30 second first-load seed that looked like a hang. Each was caught by an
ad hoc script that was then thrown away, so nothing stopped them regressing.

The app also has a cost that shapes any browser test: first load seeds ~110,000
records into IndexedDB, which takes about a minute.

## Decision

Keep those checks as a real suite (`apps/erp/e2e`, Playwright + axe-core):

- **Run against the production build** (`vite preview`), served with the exact
  security headers ([ADR-0012](0012-security-headers-single-source.md)). That is
  what ships; the dev server has no CSP and different service-worker and
  code-splitting behaviour.
- **Seed once, restore per test.** A global setup seeds a fresh browser profile
  and saves its storage state, IndexedDB included. Every test starts from that
  pristine snapshot, so tests can create and mutate documents freely and stay
  independent. `E2E_REUSE_SEED=1` skips the reseed for local iteration.
- **Fail on any console or page error.** An auto fixture records them for every
  spec; a spec that provokes errors on purpose (injected 503s) must allow them
  by pattern.
- **Test business flows end to end, asserting outcomes** rather than that
  buttons exist: the full P2P and O2C paths, exact status badges, the wizard's
  review total, and a balanced trial balance afterwards.
- **axe-core (WCAG 2.0/2.1 A + AA)** on the login page and five representative
  screens, plus the dark theme.
- Vitest excludes `e2e/`; Playwright specs are not unit tests.

## Consequences

- The suite has already paid for itself: it found a stale-total bug in the PO
  wizard's review step, WCAG contrast failures in three theme colours, an
  unnamed grid header button, a missing favicon and a wrong `<html lang>`.
- Each test spends ~50 s restoring the 78 MB IndexedDB snapshot, so 24 specs take
  about 9 minutes on 3 local workers. That is the price of independence at full
  data volume. Alternatives considered: a smaller e2e-only seed (rejected: it
  would stop exercising the 100,000-row virtualization claim) and one shared
  context with serial tests (rejected: order-dependent, and one failure cascades).
- `toContainText` on `body` sees adjacent elements' text run together, so status
  assertions go through an `expectStatus` helper matching exact badge text.
- Specs are Chromium-only. A sandbox with a preinstalled Chromium of a different
  revision can point `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` at it.
