import { approvalHistory, type Approval } from '@mekong-erp/contract';
import { formatDate } from './format';
import { roleLabel, type Translate } from './labels';
import { approvalTone, type Tone } from './tone';

export interface HistoryItem {
  id: string;
  title: string;
  timestampLabel: string;
  description?: string;
  tone: Tone;
}

/**
 * A document's approval steps as history entries. The ordering and the rounds come from
 * the contract, the same as in the React app; with more than one round, each entry says
 * which one it belongs to.
 */
export function historyItems(approvals: Approval[], t: Translate): HistoryItem[] {
  return approvalHistory(approvals).map(({ step, round, rounds }) => {
    const label = t('detail.step', {
      role: roleLabel(t, step.approverRole),
      status: t(`status.${step.status}`),
    });
    return {
      id: step.id,
      title: rounds > 1 ? t('detail.round', { round, label }) : label,
      timestampLabel: formatDate(step.decidedAt ?? step.createdAt),
      ...(step.comment ? { description: step.comment } : {}),
      tone: approvalTone(step.status),
    };
  });
}
