# ADR-0007: Form handling — React Hook Form + Zod

Status: Accepted
Date: 2026-09-28

## Context

Needed for the PO/SO multi-step wizards and their editable line-item tables
(`useFieldArray`), plus every other form in `apps/erp`. TanStack Form was
raised as an alternative, since the rest of the data layer (Router, Query,
Table) is TanStack.

## Decision

React Hook Form + `@hookform/resolvers` + Zod, confirmed by the project
owner on 2026-09-28. TanStack Form was rejected: it is newer and less proven
specifically for complex multi-step wizards combined with `useFieldArray`
-style line items, which this project needs a lot of (PO lines, SO lines),
and switching would add risk without a clear benefit.

## Consequences

- Mature, well-documented `useFieldArray` behavior for line items.
- shadcn/ui's official form primitives are built on RHF, minimizing
  component-library friction.
- One dependency in the stack that isn't TanStack-branded — acceptable,
  since form state and server state are different problems and TanStack
  Query remains the only source of server state (`CLAUDE.md`).
