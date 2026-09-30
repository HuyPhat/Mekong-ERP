# ADR-0016: A Vue approvals inbox on the shared contract

Status: Accepted
Date: 2026-09-30

## Context

The job description asks for ReactJS and VueJS as equals and lists micro frontends as
a plus. `packages/contract` was kept free of React from the start so that a second
client could reuse it, but until something did, that was a claim rather than a fact.
Phase 6 builds that client: `apps/erp-vue`, a Vue 3 app for one screen, the approvals
inbox. The inbox is the right screen for it. It is where two kinds of document meet one
engine (ADR-0004, ADR-0015), so it tests the shared contract harder than a single-module
screen would, and it is small enough to finish rather than sketch.

Two decisions came with it: how the two apps relate at run time, and what data the
second one seeds.

## Decision

- **A standalone app on its own origin, not a composed one.** `apps/erp-vue` has its own
  service worker, its own IndexedDB and its own session. It shares no state with the
  React app at run time. Putting both under one origin would have meant two apps
  contending for one `mockServiceWorker.js` scope, and a shell to route between them;
  neither buys anything for a screen that stands alone. This is **not** a micro frontend
  in the run-time-composition sense (no Module Federation, no shell, no shared runtime),
  and it shouldn't be described as one. What it demonstrates is the part that makes
  composition possible: independently deployable clients over one API contract.
- **What is shared** is what should have one definition: `@mekong-erp/contract` (the Zod
  schemas, the typed client, the mock handlers, the seed generators, the permission
  model, and the approval-engine helpers `latestChain` and `approvalHistory`);
  `@mekong-erp/ui/tokens.css` (the palette and Tailwind theme, so the two apps can't
  drift apart visually); and the React app's `security-headers.ts`, which the Vue app is
  previewed and tested under, so it runs under the same strict CSP.
- **What is not shared** is what is framework code: components, the i18n layer and the
  formatting helpers. The Vue app has a small typed dictionary in place of
  `vue-i18n` (about 105 messages in two languages; the language switch is a ref) and
  its own date and VND formatters, roughly twenty lines that duplicate the React app's.
  That duplication is the honest cost of two frameworks; moving them into the contract
  would have put `Intl` presentation choices where the API lives.
- **A light seed profile.** `ensureSeeded({ profile: 'light' })` seeds what an inbox
  reads (200 products, 30 suppliers, 240 purchase orders, the 40 employees and 225
  leave requests, and the steps and audit entries between them: about 2,400 records)
  instead of the React app's 110,000. The profile is remembered, because the request
  handlers call `ensureSeeded()` bare before every read and would otherwise have
  regenerated the full dataset over it. The default is unchanged. A fresh browser
  profile reaches the Vue login screen in about half a second; the React app's first
  visit takes several seconds by design.
- **Tests without a component-testing library.** None was approved, so behaviour that
  matters lives in plain TypeScript modules under `src/logic` and is unit-tested
  there (47 tests: the URL as the view's state, who may decide what, message
  interpolation and plurals, both languages having the same messages with the same
  placeholders, the history ordering). The components are thin. Everything a person
  does is covered by Playwright against the production build under the real CSP
  (10 flow specs and 5 accessibility scans, WCAG 2 A and AA, in both languages).
- **Tooling.** `vue-tsc` checks the `.vue` files, as two plain tsconfig projects rather
  than project references: `composite` requires every exported type to be nameable, and
  TanStack Vue Query's inferred mutation types are not. `eslint-plugin-vue` sits on the
  shared TypeScript rules, with `eslint-config-prettier` last so that Prettier alone
  decides layout.

## Findings while building it

- **Two clients found things one hid.** `hasPermission` was already in the contract but
  the Vue app needed the same "who may decide this" rule, which confirmed it belongs
  there. The ordering of a resubmitted document's approval steps into rounds was written
  for React first; it moved into the contract (`approvalHistory`) once a second client
  needed it, and the React helper now uses it.
- **An aborted request is a console error.** A spec that clicked "Log out" and at once
  did a hard navigation aborted the in-flight `DELETE /api/session`, and the resulting
  `TypeError: Failed to fetch` failed the console guard (it first looked like MSW's
  unawaited service worker update, and a guard for that was written and then removed
  once repeating the spec showed the real cause). The spec now waits for the sign-out.
- **The inbox lists steps that are not yet up.** A director's list includes the second
  step of a chain whose first approver has not decided. The list endpoint doesn't say
  whether a step is current, so neither client can hide its buttons; a decision on such a
  step is refused with a 409, and a batch reports how many went through. An `actionable`
  flag on `ApprovalView` would fix it in both apps at once. It is a contract change, so
  it is proposed here rather than made.

- **The list was unreadable beside the detail panel.** A documentation screenshot, not
  a test, showed it: with the panel open the subject column was squeezed to a sliver (a
  supplier name over seven lines) and the action buttons ran off the edge. The subject now
  has a minimum width, the table scrolls sideways inside its region, and the Actions
  column is pinned to the right. The panel spec asserts both and failed on the old build.

## Consequences

- One contract, two frameworks, same behaviour: a decision, a refusal, a resubmitted
  document's history and a language switch all work the same in both.
- The Vue app is small: 82.5 kB gzip of initial JavaScript against 279.0 kB for the React
  app (budgets enforced in CI for both), because it has one screen and no charting or
  grid library.
- **Not deployed.** Like the React app it needs a Vercel project, which is an owner step,
  and it has no `vercel.json` yet. Nothing in it depends on a server.
- It has no realtime channel: it refreshes after its own decisions and when the window
  regains focus, not from the mock WebSocket. That is a gap in the demo, not in the
  contract, whose events any client can subscribe to.
