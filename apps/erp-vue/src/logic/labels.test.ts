import { describe, expect, it } from 'vitest';
import { roleLabel } from './labels';

const t = (key: string) => `[${key}]`;

describe('roleLabel', () => {
  it('names a known role through the translator', () => {
    expect(roleLabel(t, 'approver_director')).toBe('[role.approver_director]');
  });

  it('shows a role it does not know as it is, not as a missing message', () => {
    expect(roleLabel(t, 'ceo')).toBe('ceo');
  });
});
