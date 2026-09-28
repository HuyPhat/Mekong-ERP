# ADR-0006: Rendering strategy split — Vite SPA for apps/erp, Next.js SSG for apps/site

Status: Accepted
Date: 2026-09-28

## Context

`apps/erp` is an authenticated, interactive back-office with no SEO surface,
sitting on top of a fully mocked backend (ADR-0002) — there is no server to
render against, so SSR would add hydration/server-bundle complexity for no
benefit. `apps/site` is public marketing/case-study content where SEO, fast
first paint, and shareable Open Graph metadata genuinely matter.

## Decision

`apps/erp` is a pure client-side Vite SPA. `apps/site` is Next.js with
static export/SSG — no Node server at runtime, so it deploys as static
files like everything else in the repo.

## Consequences

- Both apps are static-hosting-only — no serverless functions, simplest
  possible deploy and hosting cost (ties into ADR-0009).
- Each app uses the rendering model suited to what it actually needs,
  instead of forcing one framework/model on both.
- Two different build tools/frameworks live in one repo. Mitigated by
  keeping the two apps fully independent — they only share
  `packages/contract` and `packages/ui`, never import each other directly.
