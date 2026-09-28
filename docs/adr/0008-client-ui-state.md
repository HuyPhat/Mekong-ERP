# ADR-0008: Client UI state — zustand

Status: Accepted
Date: 2026-09-28

## Context

Several independent, cross-cutting slices of client-only UI state exist
that are not server state and don't belong in TanStack Query: DataGrid
column layout/saved views, dev-panel toggles, sidebar collapse state,
in-progress wizard UI flags. Plain React Context was the alternative, at
the cost of either several separate providers or more prop drilling as the
number of slices grows.

## Decision

Use zustand for these slices, confirmed by the project owner on 2026-09-28.
React Context remains the right tool for state that's genuinely local to
one subtree (e.g. a single form's internal UI state).

## Consequences

- Avoids provider nesting for unrelated state slices; ~1KB dependency.
- Trivial to persist a given slice to `localStorage` where needed (e.g.
  DataGrid column layout per user+view).
- One more dependency to justify. Guardrail: server data never lives in a
  zustand store — TanStack Query stays the only source of server state, per
  `CLAUDE.md`'s non-negotiable conventions.
