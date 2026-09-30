import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architecture',
  description:
    'How the Mekong ERP monorepo, the mocked backend, state management and the document flows fit together.',
  alternates: { canonical: '/architecture' },
};

export default function ArchitecturePage() {
  return (
    <>
      <h1>Architecture</h1>
      <p className="lede">
        Three packages and two apps, with one rule that shapes everything: the contract package
        knows nothing about React.
      </p>

      <svg
        className="diagram"
        viewBox="0 0 720 300"
        role="img"
        aria-labelledby="arch-title arch-desc"
      >
        <title id="arch-title">Monorepo and runtime architecture</title>
        <desc id="arch-desc">
          The ERP app renders UI from the ui package and calls the contract package. In the browser,
          a Mock Service Worker intercepts REST, GraphQL and WebSocket traffic and serves it from
          IndexedDB.
        </desc>
        <g fontFamily="system-ui, sans-serif" fontSize="14" fill="currentColor">
          <rect x="20" y="20" width="200" height="70" rx="10" fill="none" stroke="currentColor" />
          <text x="120" y="50" textAnchor="middle" fontWeight="700">
            apps/erp
          </text>
          <text x="120" y="70" textAnchor="middle">
            React 19 · TanStack
          </text>

          <rect x="260" y="20" width="200" height="70" rx="10" fill="none" stroke="currentColor" />
          <text x="360" y="50" textAnchor="middle" fontWeight="700">
            packages/ui
          </text>
          <text x="360" y="70" textAnchor="middle">
            DataGrid · FormKit
          </text>

          <rect x="500" y="20" width="200" height="70" rx="10" fill="none" stroke="currentColor" />
          <text x="600" y="50" textAnchor="middle" fontWeight="700">
            apps/site
          </text>
          <text x="600" y="70" textAnchor="middle">
            Next.js static export
          </text>

          <rect x="20" y="130" width="440" height="70" rx="10" fill="none" stroke="currentColor" />
          <text x="240" y="160" textAnchor="middle" fontWeight="700">
            packages/contract
          </text>
          <text x="240" y="180" textAnchor="middle">
            Zod schemas · typed client · pure domain logic · seed
          </text>

          <rect
            x="20"
            y="230"
            width="440"
            height="56"
            rx="10"
            fill="none"
            stroke="currentColor"
            strokeDasharray="6 4"
          />
          <text x="240" y="255" textAnchor="middle" fontWeight="700">
            MSW (REST · GraphQL · WS) → IndexedDB
          </text>
          <text x="240" y="274" textAnchor="middle">
            runs in the browser, in every environment
          </text>

          <path d="M120 90v40M360 90v40M240 200v30" stroke="currentColor" fill="none" />
        </g>
      </svg>

      <h2>Data flow</h2>
      <ol>
        <li>
          A route loader or hook asks TanStack Query for data by a key from a per-entity factory.
        </li>
        <li>
          The typed client in <code>packages/contract</code> calls <code>/api/*</code> and parses
          every response with Zod; failures are normalised to{' '}
          <code>{'{ code, message, fieldErrors? }'}</code>.
        </li>
        <li>
          The service worker answers from IndexedDB-backed collections, adding simulated latency and
          optional failures so loading and error states are real.
        </li>
        <li>
          Mutations post balanced journal entries and broadcast a WebSocket event that invalidates
          caches and flashes the affected grid row.
        </li>
      </ol>

      <h2>Rules that keep it honest</h2>
      <ul>
        <li>Server state lives only in TanStack Query — never copied into a client store.</li>
        <li>The URL is the source of truth for list views, validated with Zod.</li>
        <li>Money is integer VND; rounding lives in one module.</li>
        <li>
          Client-side RBAC hides and guards UI but is <strong>not</strong> authorization; a real
          server would have to enforce it.
        </li>
      </ul>
    </>
  );
}
