import type { TFunction } from 'i18next';
import type { TimelineEntry } from '@mekong-erp/ui';
import { approvalHistory, type Approval } from '@mekong-erp/contract';
import { formatDate } from '../../shared/lib/format';
import { approvalStatusTone } from './status';

/**
 * A document's approval history as timeline entries, for any document type. The
 * ordering and rounds come from the contract, so every client shows a resubmitted
 * document the same way; when there is more than one round, each entry says which
 * it belongs to.
 */
export function approvalTimelineEntries(approvals: Approval[], t: TFunction): TimelineEntry[] {
  return approvalHistory(approvals).map(({ step: approval, round, rounds }) => {
    const label = t('approvals.timelineStep', {
      role: t(`roles.${approval.approverRole}`, { defaultValue: approval.approverRole }),
      status: t(`approvals.status.${approval.status}`),
    });
    return {
      id: approval.id,
      title: rounds > 1 ? t('approvals.timelineRound', { round, label }) : label,
      timestampLabel: formatDate(approval.decidedAt ?? approval.createdAt),
      ...(approval.comment ? { description: approval.comment } : {}),
      tone: approvalStatusTone(approval.status),
    };
  });
}
