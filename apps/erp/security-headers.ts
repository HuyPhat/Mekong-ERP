// Single source of truth for the SPA's response headers. `vite preview` (and
// therefore the e2e suite) serves with exactly these; `vercel.json` and
// `nginx.conf` repeat them, and `security-headers.test.ts` fails if any of the
// three drift apart.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Radix, Recharts and TanStack Virtual set inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // MSW answers /api and the mock WebSocket in-page; nothing leaves the origin.
  "connect-src 'self' wss://mekong.mock",
  // The MSW service worker.
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
};
