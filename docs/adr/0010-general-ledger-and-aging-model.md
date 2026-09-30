# ADR-0010: General Ledger, Trial Balance, and AR/AP Aging computed on-demand from journal entries

Status: Accepted
Date: 2026-09-30

## Context

Phase 3 introduced `JournalEntry` (a header plus `{accountCode, accountName,
debit, credit}` lines), auto-posted by P2P document actions (goods receipt,
vendor bill, payment). Phase 4 adds the symmetric O2C postings (delivery,
customer invoice, customer payment) and needs three new reports: a General
Ledger (per-account transaction history with a running balance), a Trial
Balance (debit/credit totals per account, which must balance), and AR/AP
aging (outstanding invoices/bills bucketed by days overdue). No accounting
entity so far holds a running balance anywhere — `packages/contract` has no
"ledger" store, only the raw journal entries themselves.

## Decision

Don't introduce a separate ledger or running-balance store. Add one new
entity, `ChartOfAccount` (code, name, type, normalBalance), seeded once with
the VAS-style codes named in `docs/PLAN.md` §7. General Ledger, Trial
Balance, and AR/AP Aging are all pure, read-time aggregations over the
existing `JournalEntry` collection (plus the open `CustomerInvoice`/
`VendorBill` documents for aging) — `packages/contract/src/ledger.ts`'s
`computeGeneralLedger`/`computeTrialBalance`/`computeAging`/`summarizeAging`,
framework-agnostic and unit-tested the same way as `money.ts`/
`approval-engine.ts`/`three-way-match.ts`. The MSW accounting handlers call
these functions directly against whatever is currently in IndexedDB;
nothing is precomputed, cached, or incrementally maintained.

## Consequences

- Reports are consistent with posted journal entries by construction — there
  is no separate write path to keep in sync, so a ledger balance can never
  drift from the entries that produced it.
- Every report recomputes from the full `JournalEntry` collection on each
  request. This is fine at this project's seed volumes (a few thousand
  documents, two lines each); a real system at production scale would need
  pagination/indexing/precomputed summaries instead — a known, stated
  simplification, not a silently assumed one.
- The Trial Balance's total debit and total credit are equal by
  construction, since every journal entry this project ever creates is
  already balanced (true since Phase 3). Tests assert this as a property of
  `computeTrialBalance`'s output, not just per-entry.
- AR/AP aging buckets are derived from each open document's own `dueDate`
  against "now" at read time, not from a stored aging snapshot — so aging
  always reflects live status (e.g. a bill paid between two page loads drops
  out of the next computation instead of needing an explicit refresh step).
