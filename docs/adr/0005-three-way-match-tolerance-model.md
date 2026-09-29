# ADR-0005: Three-way-match tolerance model

Status: Accepted
Date: 2026-09-28

## Context

Before a vendor bill can be paid, PLAN.md §6 wants a per-line comparison of
what was ordered (PO), what actually arrived (Goods Receipt), and what the
supplier billed (Vendor Bill), with a configurable tolerance so trivial
rounding differences don't block payment on every single invoice the way a
zero-tolerance match would.

## Decision

**Compare against cumulative received quantity, not the PO's ordered
quantity.** A PO can be received across multiple partial GRNs; the match
uses the _sum_ of every GRN line's `receivedQty` for that product on that
PO, not the original order quantity. Billing against a partially-received
line is expected and normal — the match is "does the bill agree with what
actually showed up," not "does the bill agree with what was ordered."

**Status per line, evaluated in a fixed priority order:**

1. `not_received` — nothing has arrived yet for this line, or the vendor
   hasn't billed it. Takes priority over everything else: there's no
   meaningful price/qty comparison to make against zero received quantity.
2. `qty_variance` — `|billed qty − received qty|` exceeds the quantity
   tolerance (`qtyAbs`, default **0** — quantities must match exactly, since
   a Vietnamese supplier invoice is expected to bill exactly what was
   physically received, not an estimate).
3. `price_variance` — `|billed price − PO price| / PO price` exceeds the
   price tolerance (`pricePct`, default **2%** — absorbing small,
   normal-course price adjustments without flagging every invoice).
4. `matched` — within tolerance on both.

Price variance is checked **against the original PO price**, not a
receipt-time price (GRNs don't carry a price — receiving is a quantity-only
event in this model; price only re-enters at billing).

**Tolerance is a parameter, not a constant**: `computeThreeWayMatch(poLines,
receivedByProduct, billLines, tolerance)` defaults to `{ pricePct: 0.02,
qtyAbs: 0 }` but takes the values as an argument, so a future per-supplier or
per-category tolerance policy is a caller-side change, not a rewrite of the
comparison logic itself.

**Exceptions block payment unless explicitly overridden.** A bill with any
line not `matched` cannot move to `matched` status via the normal
`confirm-match` action (the MSW handler re-verifies server-side, not just in
the UI). The `vendor_bill:override_match` permission gates a separate
`override-match` action that requires a non-empty reason and sets
`match_override` instead of `matched` — both statuses unlock payment, but
`matchOverrideReason` records why an exception was accepted, and audit-log
entries record who did it and when.

## Consequences

- `computeThreeWayMatch` is a pure function
  (`packages/contract/src/three-way-match.ts`), used identically by seed
  generation (so seeded "billed" POs already have realistic variance to
  demo) and the live `GET /api/vendor-bills/:id/match` endpoint — the match
  a reviewer sees live is computed the same way the seed data's variety was
  constructed, not a separate parallel implementation.
- Because match status is always computed on demand rather than persisted on
  the bill, there's no risk of a stale stored match status surviving a late
  GRN correction — every view of the match reflects current data.
- The line-level `MatchLineStatus` union is intentionally small (four
  values) and doesn't attempt to model compound exceptions (e.g. a line that
  is both qty- and price-variant reports whichever the priority order above
  reaches first) — sufficient for a demo hitting "blocks payment on
  exceptions," not a full AP exception-management system.
