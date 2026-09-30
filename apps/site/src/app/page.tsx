import Link from 'next/link';
import { DEMO_URL, REPO_URL } from './site-config';

const FEATURES = [
  {
    title: 'Procure-to-Pay',
    body: 'A four-step purchase-order wizard with autosaved drafts, a configurable amount-tiered approval chain, partial goods receipts, vendor bills and a three-way match with tolerance and a reasoned override.',
  },
  {
    title: 'Order-to-Cash',
    body: 'Quotation → sales order → partial deliveries → invoice → payment, with a print-ready Vietnamese e-invoice preview (clearly labelled demo) including the amount in words.',
  },
  {
    title: 'Inventory & the DataGrid',
    body: 'A reusable server-driven grid: URL-backed filters and sort, saved views, column pinning/resizing, CSV import with row-level validation, CSV and Excel export, and a virtualized 100,000-row movements view.',
  },
  {
    title: 'Accounting-lite',
    body: 'Every business document posts balanced journal entries against VAS-style accounts. General ledger, trial balance and AR/AP aging are computed from those entries.',
  },
  {
    title: 'Dashboards & realtime',
    body: 'GraphQL-backed KPIs and charts, plus a WebSocket feed that toasts approvals and flashes changed stock rows — all served by mocks running in the browser.',
  },
  {
    title: 'HR leave requests',
    body: 'Leave runs on the same approval engine as purchase orders: a live working-day and balance preview, a manager-then-director chain for longer absences, no deciding your own request, and send back, edit and resubmit.',
  },
  {
    title: 'A Vue approvals inbox',
    body: 'The same inbox rebuilt in Vue 3 on the shared contract package, with its own unit and browser tests — a separate app that shares schemas, tokens and headers, not a composed micro frontend.',
  },
  {
    title: 'RBAC & i18n',
    body: 'Eight demo personas with resource:action permissions gating routes, nav and actions (a UX layer, not real authorization), Vietnamese by default with English one click away.',
  },
];

export default function HomePage() {
  return (
    <>
      <h1>A mini-ERP, end to end, with no backend.</h1>
      <p className="lede">
        Mekong ERP simulates the back-office of a fictional Vietnamese FMCG trading company. It
        exists to show, in working software, how I build large data-heavy React front ends: typed
        contracts, server state, URL-driven lists, forms, approvals and accounting flows.
      </p>
      <div className="actions">
        {DEMO_URL ? (
          <a className="btn" href={DEMO_URL}>
            Open the live demo
          </a>
        ) : null}
        <Link className="btn secondary" href="/case-study">
          Read the case study
        </Link>
        <a className="btn secondary" href={REPO_URL}>
          View the source
        </a>
      </div>

      <h2>What is in it</h2>
      <div className="grid">
        {FEATURES.map((feature) => (
          <section className="card" key={feature.title}>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </section>
        ))}
      </div>

      <h2>The stack</h2>
      <p>
        React 19, Vite, TanStack Router / Query / Table / Virtual, React Hook Form + Zod, Tailwind
        CSS v4 with Radix primitives, Recharts, i18next, and MSW v2 (REST, GraphQL and WebSocket)
        persisting to IndexedDB. A pnpm + Turborepo monorepo holds the React app, a Vue 3 approvals
        inbox, a shared UI package (with Storybook), a framework-agnostic contract package and this
        Next.js static site.
      </p>

      <p className="notice">
        <strong>Honest scope.</strong> The backend is a mock that runs in your browser, RBAC is
        client-side UX only, and the e-invoice is a demo layout — not legal compliance. The{' '}
        <Link href="/architecture">architecture page</Link> explains what that means in practice.
      </p>
    </>
  );
}
