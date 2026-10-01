import type { Metadata } from 'next';
import Link from 'next/link';
import { REPO_URL } from '../site-config';

export const metadata: Metadata = {
  title: 'Case study',
  description:
    'Why Mekong ERP was built, the constraints it was built under, the decisions that shaped it, and what I would do next.',
  alternates: { canonical: '/case-study' },
};

const DECISIONS = [
  [
    'ADR-0002',
    'A mocked backend that runs everywhere',
    'MSW handlers run in the browser in every environment and persist to IndexedDB, so the demo needs no server and a reviewer can reset it.',
  ],
  [
    'ADR-0003',
    'Money is integer VND',
    'One shared set of arithmetic and rounding helpers; floats never touch an amount.',
  ],
  [
    'ADR-0004',
    'Approval engine data model',
    'Cumulative amount tiers, the chain materialised up front, and halt-on-reject semantics.',
  ],
  [
    'ADR-0005',
    'Three-way match tolerance',
    'Compare cumulative received quantity with a configurable price tolerance and a reasoned override.',
  ],
  [
    'ADR-0007',
    'React Hook Form + Zod',
    'One schema drives validation, types and server-error mapping.',
  ],
  [
    'ADR-0010',
    'Ledger computed on read',
    'GL, trial balance and aging are derived from journal entries, so they are consistent by construction.',
  ],
  [
    'ADR-0013',
    'Excel export without a library',
    'The library tried hung silently under the content security policy on large exports, so the workbook is written in-house and zipped synchronously in a same-origin worker.',
  ],
  [
    'ADR-0015',
    'Leave on the approval engine',
    'A second document type, with working days as the "amount", approvers by role, computed balances and a guard against deciding your own request.',
  ],
  [
    'ADR-0016',
    'A Vue inbox on the shared contract',
    'A standalone app that reuses the schemas, client and rules, and says plainly that it is not a composed micro frontend.',
  ],
] as const;

export default function CaseStudyPage() {
  return (
    <>
      <h1>Case study</h1>
      <p className="lede">
        A portfolio piece is only convincing if it behaves like the real thing. So the brief was:
        build the parts of an ERP front end that are actually hard, and make every claim verifiable.
      </p>

      <h2>The problem</h2>
      <p>
        ERP front ends are dense: thousands of rows, multi-step forms, approval chains, documents
        that change status and post accounting entries. Simple CRUD demos hide all of that. I wanted
        a project where the difficult interactions — server-driven tables, three-way matching,
        partial receipts and deliveries, a ledger that must always balance — are real and tested.
      </p>

      <h2>Constraints</h2>
      <ul>
        <li>No real server: the whole thing has to run and deploy as static files.</li>
        <li>
          Vietnamese context: VND (no decimals), vi-VN formatting, VAS-style chart of accounts, VAT
          rates 0/5/8/10%.
        </li>
        <li>
          Everything claimed must have been run: lint, typecheck, unit tests, and browser tests.
        </li>
      </ul>

      <h2>Key decisions</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Record</th>
            <th scope="col">Decision</th>
            <th scope="col">Why</th>
          </tr>
        </thead>
        <tbody>
          {DECISIONS.map(([id, title, why]) => (
            <tr key={id}>
              <td>
                <code>{id}</code>
              </td>
              <td>{title}</td>
              <td>{why}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        The full records are in the <a href={`${REPO_URL}/tree/main/docs/adr`}>repository</a>.
      </p>

      <h2>Bugs that only a real browser found</h2>
      <p>
        Lint, types and unit tests stayed green through many real defects. Driving the built app in
        Chromium caught them: a virtualized table body that collapsed to 150px wide, a detail route
        silently swallowed by its sibling list route, Tailwind not scanning the UI package so a
        dialog rendered unstyled, and a 20–30 second first-load seed that looked like a hung app.
        The end-to-end and accessibility suite added later found more: a wizard review step that
        showed a 0 VND total because a memo was keyed on an array the form library mutates in place;
        light-mode colours that failed WCAG contrast; two searchable dialogs with no accessible
        name, because the dialog library no longer warns about a missing title; a wide table that
        stretched the whole page and pushed the user menu off-screen; and Zod probing{' '}
        <code>eval</code> on every page load, which the content security policy correctly blocked
        and reported, without anything visibly breaking. Each is written up in the project plan with
        its fix, and the ones that can regress now have a test that fails without it.
      </p>
      <p>
        Building the later features found two more. An Excel library passed a small demo and then
        never finished on a large export, because it started a worker the content security policy
        forbids and did not report the failure. And leave requests, the second document on the
        approval engine, exposed an older bug: a purchase order sent back for changes and then
        resubmitted was sent straight back again, because the engine still counted its old approval
        steps. Nothing had exercised a resubmission end to end; it now has a browser test that fails
        without the fix.
      </p>

      <h2>What I would do next</h2>
      <ul>
        <li>Replace the client-side catalog comboboxes with server-searched, paginated ones.</li>
        <li>Full arrow-key cell navigation in the grid (currently per-control keyboard access).</li>
        <li>
          Cross-tab realtime with <code>BroadcastChannel</code>; today realtime is same-tab.
        </li>
        <li>
          Compose the React and Vue apps at run time behind one shell; today they are separate apps
          that share packages.
        </li>
      </ul>

      <p>
        See <Link href="/architecture">how it is put together</Link>.
      </p>
    </>
  );
}
