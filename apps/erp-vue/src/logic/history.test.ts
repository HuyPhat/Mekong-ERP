import { describe, expect, it } from 'vitest';
import type { Approval } from '@mekong-erp/contract';
import { historyItems } from './history';

// A stand-in for the translator that shows which message was asked for, and with what.
const t = (key: string, params: Record<string, string | number> = {}) => {
  const values = Object.entries(params)
    .map(([name, value]) => `${name}=${value}`)
    .join(',');
  return values ? `${key}(${values})` : key;
};

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

describe('historyItems', () => {
  it('lists one submission in chain order, without a round label', () => {
    const at = '2026-03-02T09:00:00.000Z';
    const items = historyItems([step('b', 2, 'pending', at), step('a', 1, 'approved', at)], t);
    expect(items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(items[0]?.title).toBe('detail.step(role=role.approver_manager,status=status.approved)');
  });

  it('keeps each round together and says which round a step is in', () => {
    const first = '2026-03-02T09:00:00.000Z';
    const second = '2026-03-04T09:00:00.000Z';
    const items = historyItems(
      [
        step('new-2', 2, 'pending', second),
        step('old-1', 1, 'changes_requested', first),
        step('new-1', 1, 'approved', second),
      ],
      t,
    );
    expect(items.map((item) => item.id)).toEqual(['old-1', 'new-1', 'new-2']);
    expect(items.map((item) => /round=(\d)/.exec(item.title)?.[1])).toEqual(['1', '2', '2']);
  });

  it('carries a decision’s comment and a tone that matches its status', () => {
    const items = historyItems(
      [
        step('a', 1, 'changes_requested', '2026-03-02T09:00:00.000Z', {
          comment: 'Move it a day.',
          decidedAt: '2026-03-02T11:00:00.000Z',
        }),
        step('b', 2, 'pending', '2026-03-02T09:00:00.000Z'),
      ],
      t,
    );
    expect(items[0]).toMatchObject({ description: 'Move it a day.', tone: 'warning' });
    expect(items[1] && 'description' in items[1]).toBe(false);
    expect(items[1]?.tone).toBe('info');
  });

  it('names a role it has no translation for as it is', () => {
    const items = historyItems(
      [step('a', 1, 'pending', '2026-03-02T09:00:00.000Z', { approverRole: 'ceo' })],
      t,
    );
    expect(items[0]?.title).toContain('role=ceo');
  });
});
