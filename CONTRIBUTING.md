# Contributing

This is primarily a portfolio project, but it is set up like a team codebase.

## Setup

```
nvm use            # Node 22.22.2 (see .nvmrc)
corepack enable
pnpm install
pnpm dev           # apps/erp on http://localhost:5173
```

The first load seeds ~110,000 records into IndexedDB. That is a one-time wait of
tens of seconds per browser profile; a splash screen shows while it happens.

## Before you commit

```
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e      # Playwright, against the production build
```

CI runs the same commands. Commits use [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`), enforced by commitlint.

## Conventions

The non-negotiables live in [`CLAUDE.md`](CLAUDE.md) (TypeScript strict, money as
integer VND, server state only in TanStack Query, URL as the source of truth for list
views, Zod at the API boundary, `packages/contract` stays framework-agnostic). Design
rationale is in [`docs/PLAN.md`](docs/PLAN.md) and [`docs/adr/`](docs/adr).

A significant decision gets an ADR; new domain logic gets unit tests in the same change.
