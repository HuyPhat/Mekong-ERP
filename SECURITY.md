# Security

Mekong ERP is a **portfolio demo**. There is no real backend, no real users and
no real data. This document says plainly what the security-relevant parts of the
front end do and, just as importantly, what they do not do.

## Client-side RBAC is UX, not authorization

Permissions such as `purchase_order:approve` gate navigation, routes
(`beforeLoad` guards), and buttons (`<Can>`, `useCan()`). All of that runs in the
browser, where a user can edit any code or storage. It exists to show a
role-appropriate interface, **not** to protect anything.

A real deployment would have to enforce authorization on the server for every
request. Nothing in this repository should be read as a claim that the client
checks are a security boundary.

The "session" is a mocked endpoint that stores the chosen demo persona in
`localStorage`. There is no authentication.

## What the front end does do

- **Content-Security-Policy and hardening headers** on the ERP app
  (`apps/erp/security-headers.ts`, mirrored in `vercel.json` and `nginx.conf`, with a
  test that fails if they drift): `script-src 'self'` (no inline scripts, no `eval`),
  `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS. `style-src` allows `'unsafe-inline'`
  because Radix, Recharts and TanStack Virtual set inline style attributes. The e2e suite
  runs against the production build served with exactly these headers, so a CSP
  violation surfaces as a failing console-error check.
- **No `eval` anywhere.** Zod 4 probes `new Function` for its JIT parser, which a
  CSP without `'unsafe-eval'` blocks and reports on every load. Zod runs with JIT
  disabled (`z.config({ jitless: true })` in the contract package's `z` wrapper,
  enforced by a lint rule), and the end-to-end suite fails on any
  `securitypolicyviolation`.
- **No raw HTML rendering.** Values are rendered through React (escaped by default);
  there is no `dangerouslySetInnerHTML`.
- **CSV formula-injection sanitization.** Exported cells beginning with `=`, `+`, `-`
  or `@` are prefixed with an apostrophe so spreadsheet software treats them as text
  (covered by unit tests in `packages/ui`). Cells starting with a tab or carriage return
  are not specially handled.
- **Validation at every boundary.** Every API response is parsed with Zod; imported CSV
  rows are validated row by row before commit.
- **Money is integer VND**, so amounts cannot silently lose precision.
- **Static site only.** No server-side code, secrets or environment variables are
  shipped to the browser. `apps/site` reads only public build-time URLs.

## Known limitations

- `localStorage` and IndexedDB hold all data unencrypted, by design of the demo.
- `style-src 'unsafe-inline'` (see above). The static Next.js site additionally needs
  `script-src 'unsafe-inline'` for its hydration data, because nonces are impossible in a
  static export.
- The e-invoice preview is a demo layout. It is **not** compliant with any e-invoicing
  regulation and must not be used as one.
- Dependencies are not audited continuously; run `pnpm audit` before reusing any of this.

## Reporting

This is not a production system, but if you spot something wrong, please open an
issue on the repository.
