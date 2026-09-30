import { describe, expect, it } from 'vitest';
import { hasPermission, DEMO_USERS, PERMISSIONS } from './demo-users';
import type { User } from './schemas';

const warehouse = DEMO_USERS.find((user) => user.id === 'warehouse');
if (!warehouse) {
  throw new Error('Fixture missing: warehouse demo user');
}

const admin = DEMO_USERS.find((user) => user.id === 'admin');
if (!admin) {
  throw new Error('Fixture missing: admin demo user');
}

describe('hasPermission', () => {
  it('returns false for a null user', () => {
    expect(hasPermission(null, PERMISSIONS.inventoryRead)).toBe(false);
  });

  it('returns true when the user has the exact permission', () => {
    expect(hasPermission(warehouse, PERMISSIONS.inventoryRead)).toBe(true);
  });

  it('returns false when the user lacks the permission', () => {
    expect(hasPermission(warehouse, PERMISSIONS.adminRead)).toBe(false);
  });

  it('treats a "*" permission as unrestricted access', () => {
    expect(hasPermission(admin, PERMISSIONS.adminRead)).toBe(true);
    expect(hasPermission(admin, 'anything:at-all')).toBe(true);
  });

  it('every demo user resolves dashboard:read (the shell landing page)', () => {
    for (const user of DEMO_USERS) {
      expect(hasPermission(user, PERMISSIONS.dashboardRead)).toBe(true);
    }
  });
});

describe('DEMO_USERS fixture', () => {
  it('has no duplicate ids', () => {
    const ids = DEMO_USERS.map((user: User) => user.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('HR permissions', () => {
  it('lets every demo user read and write their own leave', () => {
    for (const user of DEMO_USERS) {
      expect(hasPermission(user, PERMISSIONS.hrmRead), user.id).toBe(true);
      expect(hasPermission(user, PERMISSIONS.hrmWrite), user.id).toBe(true);
    }
  });

  it('lets only the manager, the director and the admin decide leave requests', () => {
    const approvers = DEMO_USERS.filter((user) =>
      hasPermission(user, PERMISSIONS.leaveRequestApprove),
    ).map((user) => user.id);
    // The approval rules only ever route leave to these two roles.
    expect(approvers.sort()).toEqual(['admin', 'approver_director', 'approver_manager']);
  });
});
