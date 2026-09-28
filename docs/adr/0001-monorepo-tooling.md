# ADR-0001: Monorepo tooling — pnpm workspaces + Turborepo

Status: Accepted
Date: 2026-09-28

## Context

The project spans multiple apps (`apps/erp`, `apps/site`, and the stretch
`apps/erp-vue`) and shared packages (`packages/ui`, `packages/contract`,
`packages/config`) that must interoperate with strict type-safety. In
particular, `packages/contract` needs to be consumed, unmodified, by both a
React app and a Vue app, so it has to build and type-check independently of
either.

## Decision

Use pnpm workspaces for dependency management and Turborepo for task
orchestration/caching across the apps/packages graph.

## Consequences

- Fast, cached builds/tests across the dependency graph; a single lockfile
  for the whole repo; type-safe cross-package imports during development
  without a publish step.
- Slightly more setup than a single app (root + per-package `tsconfig`,
  `turbo.json` pipeline). Contributors need to know workspace-filtered
  commands (`pnpm --filter <pkg>`), documented in `CLAUDE.md`.
