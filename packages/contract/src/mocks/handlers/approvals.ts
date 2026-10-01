import { http, HttpResponse } from 'msw';
import { z } from '../../zod';
import {
  approvalsStore,
  employeesStore,
  leaveRequestsStore,
  purchaseOrdersStore,
  suppliersStore,
} from '../../db/store';
import { ensureSeeded } from '../../seed';
import { applySort, matchesSearch, paginate, parseListParams } from '../../list-query';
import {
  actionableStepIds,
  currentApprovalStep,
  decideApproval,
  latestChain,
  type ChainOutcome,
} from '../../approval-engine';
import type { Approval, ApprovalView } from '../../approval-entities';
import type { LeaveRequestStatus } from '../../hrm-entities';
import type { PurchaseOrderStatus } from '../../purchasing-entities';
import { writeAudit } from './audit';
import { broadcastEvent } from '../ws';

const DecideApprovalSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'changes_requested']),
  comment: z.string().optional(),
  actorId: z.string(),
});

// One inbox lists every document type that runs on the approval engine, so each
// type says what to show: who or what it is about, and the magnitude its rules use.
function toView(approval: Approval, actionable: ReadonlySet<string>): ApprovalView {
  const isUp = actionable.has(approval.id);
  if (approval.docType === 'leave_request') {
    const request = leaveRequestsStore.get(approval.docId);
    const employee = request ? employeesStore.get(request.employeeId) : undefined;
    return {
      ...approval,
      subject: employee?.name ?? '',
      amount: request?.days ?? 0,
      unit: 'days',
      actionable: isUp,
    };
  }
  const po = purchaseOrdersStore.get(approval.docId);
  const supplier = po ? suppliersStore.get(po.supplierId) : undefined;
  return {
    ...approval,
    subject: supplier?.name ?? '',
    amount: po?.grandTotal ?? 0,
    unit: 'vnd',
    actionable: isUp,
  };
}

function documentStatus(
  outcome: ChainOutcome,
): 'approved' | 'rejected' | 'changes_requested' | 'pending_approval' {
  return outcome === 'pending' ? 'pending_approval' : outcome;
}

/** Applies a settled step to the document behind the chain, and records it in the audit log. */
async function applyToDocument(
  approval: Approval,
  outcome: ChainOutcome,
  decision: string,
  actorId: string,
  now: string,
): Promise<void> {
  const nextStatus = documentStatus(outcome);
  if (approval.docType === 'purchase_order') {
    const po = purchaseOrdersStore.get(approval.docId);
    if (!po) return;
    await purchaseOrdersStore.put({ ...po, status: nextStatus satisfies PurchaseOrderStatus });
    await writeAudit(
      'purchase_order',
      po.id,
      po.number,
      `approval_${decision}`,
      actorId,
      po.status,
      nextStatus,
      now,
    );
    return;
  }
  const leave = leaveRequestsStore.get(approval.docId);
  if (!leave) return;
  await leaveRequestsStore.put({ ...leave, status: nextStatus satisfies LeaveRequestStatus });
  await writeAudit(
    'leave_request',
    leave.id,
    leave.number,
    `approval_${decision}`,
    actorId,
    leave.status,
    nextStatus,
    now,
  );
}

export const approvalsHandlers = [
  http.get('/api/approvals', async ({ request }) => {
    await ensureSeeded();
    const url = new URL(request.url);
    const { page, pageSize, sort, q } = parseListParams(url, [
      { field: 'createdAt', direction: 'asc' },
    ]);
    const approverRole = url.searchParams.get('filter[approverRole]');
    const statuses = url.searchParams.get('filter[status]')?.split(',').filter(Boolean) ?? [];
    const docTypes = url.searchParams.get('filter[docType]')?.split(',').filter(Boolean) ?? [];
    const docId = url.searchParams.get('filter[docId]');

    // Which steps are up depends on a document's whole chain, so it is worked out before
    // any filter narrows the list.
    const all = approvalsStore.list();
    const actionable = actionableStepIds(all);
    let items = all.map((approval) => toView(approval, actionable));
    if (approverRole) items = items.filter((approval) => approval.approverRole === approverRole);
    if (statuses.length > 0) items = items.filter((approval) => statuses.includes(approval.status));
    if (docTypes.length > 0)
      items = items.filter((approval) => docTypes.includes(approval.docType));
    if (docId) items = items.filter((approval) => approval.docId === docId);
    items = items.filter((approval) => matchesSearch(approval, q, ['docNumber', 'subject']));
    items = applySort(items, sort);
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.post('/api/approvals/:id/decide', async ({ params, request }) => {
    await ensureSeeded();
    const approval = approvalsStore.get(String(params.id));
    if (!approval) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Approval step not found' },
        { status: 404 },
      );
    }
    const body: unknown = await request.json();
    const parsed = DecideApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid decision',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    // Nobody decides their own leave. Purchase orders record a role, not a person,
    // as their creator, so there is no one to compare against there (ADR-0015).
    if (approval.docType === 'leave_request') {
      const leave = leaveRequestsStore.get(approval.docId);
      const requester = leave ? employeesStore.get(leave.employeeId) : undefined;
      if (requester?.userId !== undefined && requester.userId === parsed.data.actorId) {
        return HttpResponse.json(
          { code: 'SELF_DECISION', message: 'You cannot decide your own leave request' },
          { status: 403 },
        );
      }
    }
    // Only the newest submission's steps decide: older ones are history.
    const chain = latestChain(
      approvalsStore.list().filter((candidate) => candidate.docId === approval.docId),
    );
    const now = new Date().toISOString();
    let result;
    try {
      result = decideApproval(
        chain,
        approval.id,
        parsed.data.decision,
        parsed.data.actorId,
        now,
        parsed.data.comment,
      );
    } catch (error) {
      return HttpResponse.json(
        { code: 'INVALID_STEP', message: (error as Error).message },
        { status: 409 },
      );
    }
    await approvalsStore.putMany(result.chain);
    broadcastEvent({
      type: 'approval.decided',
      docType: approval.docType,
      docId: approval.docId,
      docNumber: approval.docNumber,
      decision: parsed.data.decision,
      approverRole: approval.approverRole,
    });
    if (result.outcome === 'pending') {
      const nextStep = currentApprovalStep(result.chain);
      if (nextStep) {
        broadcastEvent({
          type: 'approval.requested',
          docType: nextStep.docType,
          docId: nextStep.docId,
          docNumber: nextStep.docNumber,
          approverRole: nextStep.approverRole,
        });
      }
    }

    await applyToDocument(approval, result.outcome, parsed.data.decision, parsed.data.actorId, now);

    return HttpResponse.json({ chain: result.chain, outcome: result.outcome });
  }),
];
