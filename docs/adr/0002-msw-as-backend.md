# ADR-0002: Fully mocked backend via MSW, running in all environments

Status: Accepted
Date: 2026-09-28

## Context

There is no real backend, and none will be built — this is a frontend
portfolio project. The demo still needs to credibly exercise REST, GraphQL,
and WebSocket integration patterns (per the target job description) and
needs to be deployable as a static site with no server to operate or pay
for.

## Decision

MSW v2 intercepts REST (`http`) and GraphQL requests, and simulates a
WebSocket channel (`ws.link('wss://mekong.mock/events')`), directly in the
browser, in **every** environment — including the deployed public demo, not
just local dev/tests. Seed data is generated once with a fixed faker seed,
normalized through `packages/contract`'s Zod schemas, and persisted to
IndexedDB so it survives reloads; a "Reset demo data" action restores the
original seed. Realtime events are emitted by the mock handlers reacting to
that same tab's own mutations (optimistic, same-tab updates as the
baseline). Cross-tab sync (e.g. via `BroadcastChannel`, so approving a
document in one tab toasts in another) is a nice-to-have enhancement, not a
requirement — see `docs/PLAN.md` §9 risk 5.

## Consequences

- No backend to host, operate, or pay for; the whole app deploys as static
  files to any static host.
- Every REST/GraphQL/WS pattern called out in the target job description is
  genuinely demonstrated, not just described.
- Service-worker registration is sensitive to base path/scope/HTTPS on a
  deployed static host — this is verified early (Phase 1) with one trivial
  handler before the full contract layer is built on top of it, specifically
  to avoid discovering a broken deploy late.
- "Realtime" only reflects a tab's own actions unless/until cross-tab sync
  is added. This is stated plainly in the README rather than implied to be
  more than it is.
