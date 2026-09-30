# ADR-0015: Leave requests on the approval engine

Status: Accepted
Date: 2026-09-30

## Context

The job description lists HRM alongside the finance and supply-chain modules. Phase 6
adds leave requests as the second document to run on the approval engine from
[ADR-0004](0004-approval-engine-data-model.md). The engine was written generically
(rules keyed by document type and an amount range, a chain materialised up front), but
until now it had approved only purchase orders, so "generic" was a claim rather than a
fact. Leave is a fair test: a different document, a different unit (working days, not
VND), and a different question (who is away, not what is spent).

Three things needed deciding: how a non-monetary document fits the rules, what the
inbox lists now that it holds two kinds of document, and how HR data reaches a browser
that already holds the 110,000-record database from earlier phases.

## Decision

- **The rule model is unchanged.** `ApprovalDocType` gains `leave_request`. A rule's
  `minAmount`/`maxAmount` bounds "the document's magnitude", which is VND for a
  purchase order and working days for leave. The unit belongs to the document type,
  not to the rule. Seeded tiers: 1-2 days go to the manager; 3 or more go to the
  manager, then the director. A separate leave policy was rejected: it would have
  duplicated `resolveApprovalRoles`, `createApprovalChain`, `decideApproval` and
  `chainOutcome`, and the inbox would have needed two sources.
- **`ApprovalView` is reshaped to `{ subject, amount, unit }`**, replacing
  `supplierName`. It is the one contract change this phase makes to an existing shape,
  and it was agreed before it was made. One inbox lists both document types, and the
  unit tells the client how to show the amount. Any consumer, in any framework, parses
  the same schema.
- **Approvers are roles, not people.** A chain resolves to role names, as for purchase
  orders, and anyone holding the role can decide. There is no "your manager": the data
  has no reporting lines, and inventing an org chart to route by would be modelling for
  its own sake.
- **Nobody decides their own leave.** The decide handler refuses with a 403
  (`SELF_DECISION`) when the actor is the requester, and the inbox says so in the
  user's language. Purchase orders record a role, not a person, as their creator, so
  there is nobody to compare against there. The consequence is real and accepted: a
  manager's own request waits at the manager step until someone else decides it. The
  demo has one manager login, so the admin login, which holds no approver role but can
  decide any step, sees every step in the inbox and is that someone.
- **Balances are computed, never stored.** `computeLeaveBalance` derives them from the
  requests: used is approved annual leave, pending is annual leave still awaiting a
  decision, remaining is the allowance minus both. Holding pending days against the
  balance is what stops two requests from both spending the last days. Sick, unpaid and
  special leave don't draw on the allowance. It is the same idea as
  [ADR-0010](0010-general-ledger-and-aging-model.md): a number recomputed from its
  source can't drift from it.
- **Working days are weekdays minus four fixed-date public holidays** (1 Jan, 30 Apr,
  1 May, 2 Sep). The lunar-calendar holidays (Tết, the Hùng Kings) and any substitute
  days off are **not modelled**: they move every year, and a wrong list is worse than
  an acknowledged gap. A request must sit inside one calendar year so a balance has one
  year to reckon in. There is no draft state; a request exists once it is submitted.
- **The handler enforces the rules, not just the form.** It answers with a field-level
  `422` when the end precedes the start, when the range holds no working day, when it
  spans two years, or when the reason is blank; `409 LEAVE_OVERLAP` naming the request
  in the way; `422 INSUFFICIENT_BALANCE`; and `422 NO_APPROVAL_RULE`. The seed
  generator calls the same pure functions, so seeded and user-made data can't disagree.
- **A request sent back is edited and resubmitted as the same document.** It keeps its
  number, gets a new approval chain, and the old steps stay as history. See the finding
  below.
- **HR data reaches existing databases through a targeted upgrade.** The database
  version goes from 3 to 4 and adds `employees` and `leaveRequests`. A browser holding
  the older database gets the HR data, and the missing rules, from `seedHrm()` instead
  of a reseed, so the 110,000 existing records aren't touched. On a fresh database the
  HR seed runs last with its own faker seed, so it can't shift anything generated
  before it. Each demo login has an employee record (`Employee.userId`), which is what
  makes "my leave" meaningful.

## Finding: old steps decided a resubmitted document

Designing revise-and-resubmit meant reading how a second chain for the same document
is treated, and it was wrong, in Phase 3 as well. The decide handler passed every step
ever created for a document to `decideApproval`, so the old "changes requested" step
still counted when the outcome was worked out. A purchase order sent back and then
resubmitted was sent straight back again the moment its manager approved the new chain.
Nothing had exercised resubmission end to end, so no test noticed.

It was reproduced on the pre-fix production build (approve, and both the outcome and
the order status come back as `changes_requested`), then fixed in its own commit:
`latestChain` selects the steps of the newest submission, which share one timestamp,
and the handler decides against those. An e2e spec fails on the old build and passes on
the new one, and the leave flow has the same guard.

## Consequences

- The inbox lists purchase orders and leave together, with a type column and filter.
  The Vue inbox in this phase reads the same schema.
- The realtime events are reused unchanged: `approval.requested` and
  `approval.decided` carry a document type that is already a plain string.
- Permissions: `hrm:read` and `hrm:write` are on every login, since everyone is an
  employee, and `leave_request:approve` is on the manager and the director. As
  everywhere in this project, that is UX gating on the client, not authorization.
- Seeded: 40 employees (the eight demo logins and 32 others) and 225 leave requests
  over a year, 159 approved, 29 rejected, 26 pending, 8 cancelled, 3 sent back, with
  340 approval steps and 520 audit entries. The numbers are relative to the day the
  database is first seeded, like the other generators.
- **Simplifications, not oversights:** a flat allowance of 12 days for everyone, with
  no accrual by tenure and no carry-over; whole days only, no half-days; no
  leave-type-specific rules such as a sick note; roles instead of reporting lines; no
  lunar holidays. Each is a rule the pure `leave.ts` module would take, without the
  engine changing.
