# ADR-0004: Approval-engine data model

Status: Accepted
Date: 2026-09-28

## Context

Phase 3 needs a configurable approval engine: PO amount determines which
roles must sign off, in order, before a document is approved (PLAN.md §6).
The brief's example is a 3-tier escalation — Purchasing Manager under 50M
VND, + Finance Manager from 50M, + Director from 500M — and the inbox needs
to show each approver only the documents actually waiting on them.

## Decision

**Rules are cumulative tiers, not incremental deltas.** An `ApprovalRule` is
`{ docType, minAmount, maxAmount, approverRoles }`, and `approverRoles`
already lists the _full_ ordered chain for that tier (e.g. the >=500M tier
lists all three roles), not just the role newly added at that threshold.
Resolving a chain for an amount is picking the one rule whose range contains
it — never merging rules. This keeps `resolveApprovalRoles()` a single
lookup instead of an accumulation, and keeps each rule independently
readable (an admin editing the >=500M row sees the whole chain that applies,
not a diff against the row below it).

**Every approval step is materialized up front, all `pending`.** Submitting
a document creates one `Approval` record per required role
(`sequence: 1..N`, `status: 'pending'`) rather than creating steps lazily as
each prior one clears. The "current" step is simply the lowest-`sequence`
record still `pending`. This makes the inbox query trivial (`status =
'pending' AND approverRole = me`) and gives the document's timeline a
complete, stable list of who's involved from the moment it's submitted,
rather than revealing approvers one at a time.

**A reject or changes-requested decision halts the chain**: every other
still-`pending` step is marked `skipped`, and the document takes that
terminal status. There's no path back into the same chain — a
changes-requested document is edited and **re-submitted**, which discards
the old chain and creates a fresh one against the (possibly different)
amount, since editing could move it into a different rule tier.

**A fourth role, `approver_finance`, was added** alongside the existing
`approver_manager`/`approver_director` so the 3-tier example is genuinely
three _different_ people, not two roles doing double duty. This is additive
to the existing RBAC catalog (`demo-users.ts`, `RoleSchema`), not a
restructuring.

## Consequences

- `resolveApprovalRoles`, `createApprovalChain`, `currentApprovalStep`,
  `chainOutcome`, and `decideApproval` are pure functions
  (`packages/contract/src/approval-engine.ts`) usable identically from seed
  generation and from the live MSW `/api/approvals/:id/decide` handler —
  seeded history and live demo actions can never drift apart in behavior.
- Rules are seeded data (`approvalRulesStore`), fetched like any other
  resource — "configurable" in the sense that changing a threshold is a data
  change, not a code change, even though Phase 3 doesn't ship a rule-editing
  UI (out of scope for the P2P exit criterion; a natural Phase 4+ admin
  screen if wanted).
- Only `purchase_order` uses the engine in Phase 3 — `ApprovalDocType` is
  deliberately a one-value enum for now rather than speculatively including
  `vendor_bill`. Bills go through the three-way-match gate instead
  (ADR-0005), not a second approval chain; the enum grows the day something
  actually creates a chain for a new doc type, not before.
