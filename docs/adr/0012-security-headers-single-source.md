# ADR-0012: Response security headers are defined once and verified three ways

Status: Accepted
Date: 2026-09-30

## Context

The ERP is a static SPA. Its protection against injected script is a
Content-Security-Policy plus a few hardening headers, and those must be served
identically by every host we support: Vercel ([ADR-0009](0009-hosting-vercel.md)),
the nginx image, and the local preview used by the browser tests. Three
hand-maintained copies drift, and a CSP that only exists in a config file nobody
runs under test is easy to break silently.

## Decision

`apps/erp/security-headers.ts` is the single source of truth:

- `vite preview` serves the production build with it, so the e2e suite runs under
  the real policy and any `securitypolicyviolation` event fails the spec.
- `vercel.json` and `nginx.conf` repeat the values literally (neither can import
  TypeScript), and `security-headers.test.ts` fails if either differs from the
  module.
- The policy: `default-src 'self'`; `script-src 'self'` (no inline scripts, no
  `eval`); `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`;
  `frame-ancestors 'none'`; `worker-src 'self'` (the MSW service worker);
  `connect-src 'self' wss://mekong.mock` (the mocked WebSocket); plus `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, COOP and HSTS.
- The dev server deliberately has no CSP (React Refresh needs inline scripts).

## Consequences

- `style-src` must allow `'unsafe-inline'`: Radix, Recharts and TanStack Virtual
  set inline `style` attributes. Script execution, the high-value part, stays
  locked down.
- `apps/site` (a Next.js static export) needs `script-src 'unsafe-inline'` for its
  hydration data, since nonces are impossible without a server. Its `vercel.json`
  documents this; it is a weaker policy than the app's.
- A future change to the policy is one edit to the module plus mirroring it into
  two files, with the test pointing at whichever was missed.
- **Zod's JIT must be off.** Zod 4 probes `new Function('')` when each schema is
  constructed to decide whether it may compile parsers. Under a CSP without
  `'unsafe-eval'` the probe is blocked and reported as a `securitypolicyviolation`
  even though the throw is caught, so every page load logged a CSP violation. It
  was invisible to the console-error check and was found by Lighthouse's "issues
  logged in DevTools" audit. `z.config({ jitless: true })` fixes it, but Zod reads
  it at schema _construction_, and a side-effect-only config module was evaluated
  by the bundler after the chunk that had already built the schemas. So every
  schema module imports `z` from a wrapper (`packages/contract/src/zod.ts`) that
  sets the option and re-exports it, making the order a data dependency; an ESLint
  `no-restricted-imports` rule forbids importing `zod` directly. The e2e fixture
  now listens for `securitypolicyviolation` on every page and fails the spec.
- None of this makes client-side RBAC a security boundary; see `SECURITY.md`.
