import type { TFunction } from 'i18next';
import type { TimelineEntry } from '@mekong-erp/ui';
import type { Approval } from '@mekong-erp/contract';
import { formatDate } from '../../shared/lib/format';
import { approvalStatusTone } from './status';

/**
 * A document's approval history as timeline entries, for any document type.
 *
 * A document sent back and resubmitted has one chain per submission, and the
 * steps of one submission share a timestamp. Ordering by that first, then by the
 * step's place in the chain, keeps each round together, oldest first; ordering by
 * the step's place alone would interleave them (manager, manager, finance,
 * finance). When there is more than one round, each entry says which it belongs to.
 */
export function approvalTimelineEntries(approvals: Approval[], t: TFunction): TimelineEntry[] {
  const ordered = [...approvals].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.sequence - b.sequence,
  );
  const rounds = [...new Set(ordered.map((step) => step.createdAt))];

  return ordered.map((approval) => {
    const label = t('approvals.timelineStep', {
      role: t(`roles.${approval.approverRole}`, { defaultValue: approval.approverRole }),
      status: t(`approvals.status.${approval.status}`),
    });
    return {
      id: approval.id,
      title:
        rounds.length > 1
          ? t('approvals.timelineRound', { round: rounds.indexOf(approval.createdAt) + 1, label })
          : label,
      timestampLabel: formatDate(approval.decidedAt ?? approval.createdAt),
      ...(approval.comment ? { description: approval.comment } : {}),
      tone: approvalStatusTone(approval.status),
    };
  });
}
