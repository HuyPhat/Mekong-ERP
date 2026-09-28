# ADR-0003: Money & quantity representation

Status: Accepted
Date: 2026-09-28

## Context

Financial correctness (VAT calculation, line discounts, three-way-match
tolerances, journal entries) breaks silently and unpredictably with binary
floating point arithmetic. VND has no practical subunit in everyday use.

## Decision

All monetary amounts are stored and passed as **integer VND** end to end —
Zod schemas, the mock API, and the UI layer. Quantities that can be
fractional (e.g. weight in kg) go through a small shared decimal-safe helper
rather than raw JS floats wherever they feed into a total. These helpers
live in `packages/contract` (co-located with the schemas that use them) so
`apps/erp` and the stretch `apps/erp-vue` get byte-identical rounding
behavior.

## Consequences

- Eliminates an entire class of rounding/precision bugs (e.g. `0.1 + 0.2`
  style errors) in totals, VAT, and journal postings.
- One tested implementation of rounding rules instead of one per feature.
- Every place money is displayed must go through a formatter
  (`Intl.NumberFormat('vi-VN', ...)`) rather than naive string
  interpolation — called out in `CLAUDE.md` and checked in review.
