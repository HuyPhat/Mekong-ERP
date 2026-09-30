import { describe, expect, it } from 'vitest';
import { approvalTone, documentTone } from './tone';

describe('approvalTone', () => {
  it('reads at a glance: waiting is blue, done is green, refused is red, sent back is amber', () => {
    expect(approvalTone('pending')).toBe('info');
    expect(approvalTone('approved')).toBe('success');
    expect(approvalTone('rejected')).toBe('destructive');
    expect(approvalTone('changes_requested')).toBe('warning');
    expect(approvalTone('skipped')).toBe('neutral');
  });
});

describe('documentTone', () => {
  it('covers the statuses of purchase orders and of leave requests', () => {
    expect(documentTone('approved')).toBe('success');
    expect(documentTone('pending_approval')).toBe('info');
    expect(documentTone('changes_requested')).toBe('warning');
    expect(documentTone('cancelled')).toBe('destructive');
    expect(documentTone('partially_received')).toBe('info');
  });

  it('is neutral for a status it does not know', () => {
    expect(documentTone('draft')).toBe('neutral');
    expect(documentTone('whatever')).toBe('neutral');
  });
});
