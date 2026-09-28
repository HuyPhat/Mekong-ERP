# ADR-0009: Hosting — Vercel

Status: Accepted
Date: 2026-09-28

## Context

Both deployable apps (`apps/erp`, `apps/site`) are fully static builds with
no serverless functions required (ADR-0002, ADR-0006). Netlify and
Cloudflare Pages were considered as equally viable static hosts.

## Decision

Deploy both `apps/erp` and `apps/site` to Vercel, confirmed by the project
owner on 2026-09-28.

## Consequences

- Zero-config support for `apps/site` (Next.js); one platform/dashboard
  covers both apps; free preview deployments per branch/PR.
- Minimal vendor-specific configuration either way, since both apps are
  plain static builds — no meaningful lock-in beyond an optional
  `vercel.json`.
