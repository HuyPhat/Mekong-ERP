import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CSP, SECURITY_HEADERS } from './security-headers';

interface VercelHeader {
  key: string;
  value: string;
}
interface VercelConfig {
  headers: { source: string; headers: VercelHeader[] }[];
}

const vercel = JSON.parse(
  readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'),
) as VercelConfig;
const nginx = readFileSync(new URL('./nginx.conf', import.meta.url), 'utf8');

describe('security headers stay in sync', () => {
  it('vercel.json serves exactly the shared header set on every route', () => {
    const catchAll = vercel.headers.find((entry) => entry.source === '/(.*)');
    expect(catchAll).toBeDefined();
    const served = Object.fromEntries((catchAll?.headers ?? []).map((h) => [h.key, h.value]));
    expect(served).toEqual(SECURITY_HEADERS);
  });

  it('nginx.conf carries every shared header verbatim', () => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      expect(nginx, `${key} missing from nginx.conf`).toContain(
        `add_header ${key} "${value}" always;`,
      );
    }
  });

  it('the CSP forbids inline scripts, plugins and framing', () => {
    expect(CSP).toContain("script-src 'self'");
    expect(CSP).not.toMatch(/script-src[^;]*unsafe/);
    expect(CSP).toContain("object-src 'none'");
    expect(CSP).toContain("frame-ancestors 'none'");
  });
});
