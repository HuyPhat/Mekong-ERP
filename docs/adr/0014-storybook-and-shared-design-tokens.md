# ADR-0014: Storybook for the design system, on shared design tokens

Status: Accepted
Date: 2026-09-30

## Context

PLAN.md lists Storybook under `packages/ui` and in the JD mapping ("Collaboration
with BA/design/QA"). Until Phase 6 it was held back deliberately: it is new
tooling, and it pays off only once the design system has substance. With the
DataGrid, FormKit, dialogs and status components in place, it does.

Two things stood in the way. The colour palette and the Tailwind theme lived in
`apps/erp/src/index.css`, so anything rendering `packages/ui` outside that app
(Storybook now, the Vue inbox next) would have had to copy them. And "a story
renders" is a weak claim on its own.

## Decision

- **Tokens move to `packages/ui/src/styles/tokens.css`**, exported as
  `@mekong-erp/ui/tokens.css`. The app, Storybook and the Vue inbox import the same
  file. The app's compiled stylesheet was compared before and after and is
  **byte-identical**, so nothing visible changed.
- **Storybook 10 with `@storybook/react-vite`**, stories colocated with the
  components (`*.stories.tsx`), autodocs on, and the a11y and docs addons. A theme
  toolbar toggles `.dark` on `<html>` the way the apps do. Telemetry is disabled,
  so builds make no outbound calls.
- **Every story is tested.** `packages/ui/e2e/stories.spec.ts` opens each story in
  light and dark and fails on a console error, a page error or an axe violation
  (WCAG 2.0/2.1 A and AA). CI runs it on every push and uploads the static build.

## Findings while building the check

- Storybook's a11y addon runs axe in the preview frame on every render, and axe
  allows one run per frame, so a second run from the test failed intermittently with
  "Axe is already running". The spec retries.
- Components transition their colours for 150 ms when the theme class lands after
  first render. Sampled mid-transition, dark text on the dark page measured
  **1.39:1** and axe reported it as a real contrast failure. The spec cancels
  transitions before scanning; the components were fine.
- A negative control confirmed the check bites: a story with `#ccc` on `#fff` fails
  in both themes with the measured ratio (1.6:1) in the message.
- An open modal locks the body's scroll, which Playwright reads as `hidden`, so the
  spec asserts the preview's ready class rather than visibility.

## Consequences

- 53 stories (52 when this was written; `PinnedActions` documents the DataGrid's `pinnedEndColumns`) across primitives, form controls, FormKit, the wizard, the line-items
  table, the DataGrid (server mode, loading, empty, error, bulk actions, exports,
  10,000-row virtualized) and the filter bar. All pass in both themes.
- **Not published.** `pnpm build-storybook` produces a static site (CI uploads it as
  an artifact), but hosting it needs an account this repository's automation doesn't
  have. That is an owner step, like the Vercel projects.
- The stories are the design system's documentation, not a visual-regression suite:
  there are no screenshot baselines.
- `@types/node` (already in the workspace for `apps/erp`) is now also a dev
  dependency of `packages/ui`, for the Playwright config and the story spec.
