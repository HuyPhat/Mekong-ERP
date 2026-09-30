import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import type { Approval } from '@mekong-erp/contract';
import { approvalTimelineEntries } from './approval-timeline';

// A stand-in for i18next that shows which key was asked for and with what.
const t = ((key: string, options?: Record<string, unknown>) => {
  const values = Object.entries(options ?? {})
    .filter(([name]) => name !== 'defaultValue')
    .map(([name, value]) => `${name}=${String(value)}`)
    .join(',');
  return values ? `${key}(${values})` : key;
}) as unknown as TFunction;

function step(
  id: string,
  sequence: number,
  status: Approval['status'],
  createdAt: string,
  extra: Partial<Approval> = {},
): Approval {
  return {
    id,
    docType: 'leave_request',
    docId: 'leave-1',
    docNumber: 'LV-2026-000001',
    sequence,
    approverRole: sequence === 1 ? 'approver_manager' : 'approver_director',
    status,
    createdAt,
    ...extra,
  };
}

describe('approvalTimelineEntries', () => {
  it('lists one submission in chain order, however the steps arrive', () => {
    const at = '2026-03-02T09:00:00.000Z';
    const entries = approvalTimelineEntries(
      [step('b', 2, 'pending', at), step('a', 1, 'approved', at)],
      t,
    );
    expect(entries.map((entry) => entry.id)).toEqual(['a', 'b']);
    // One round, so no "submission N" prefix.
    expect(entries[0]?.title).toBe(
      'approvals.timelineStep(role=roles.approver_manager,status=approvals.status.approved)',
    );
  });

  it('keeps each round together, oldest first, and says which round a step is in', () => {
    const first = '2026-03-02T09:00:00.000Z';
    const second = '2026-03-04T09:00:00.000Z';
    const entries = approvalTimelineEntries(
      [
        step('new-2', 2, 'pending', second),
        step('old-1', 1, 'changes_requested', first),
        step('new-1', 1, 'approved', second),
        step('old-2', 2, 'skipped', first),
      ],
      t,
    );
    expect(entries.map((entry) => entry.id)).toEqual(['old-1', 'old-2', 'new-1', 'new-2']);
    expect(entries.map((entry) => /round=(\d)/.exec(entry.title)?.[1])).toEqual([
      '1',
      '1',
      '2',
      '2',
    ]);
  });

  it("carries a decision's comment and a tone matching its status", () => {
    const entries = approvalTimelineEntries(
      [
        step('a', 1, 'changes_requested', '2026-03-02T09:00:00.000Z', {
          comment: 'Please move it a day later.',
          decidedAt: '2026-03-02T11:00:00.000Z',
        }),
        step('b', 2, 'pending', '2026-03-02T09:00:00.000Z'),
      ],
      t,
    );
    expect(entries[0]).toMatchObject({
      description: 'Please move it a day later.',
      tone: 'warning',
    });
    // No comment, no description key at all.
    expect(entries[1] && 'description' in entries[1]).toBe(false);
    expect(entries[1]?.tone).toBe('info');
  });

  it('is empty for a document with no approvals yet', () => {
    expect(approvalTimelineEntries([], t)).toEqual([]);
  });
});
