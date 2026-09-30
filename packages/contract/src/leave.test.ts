import { describe, expect, it } from 'vitest';
import {
  addDaysToDate,
  computeLeaveBalance,
  countWorkingDays,
  drawsOnAllowance,
  findLeaveOverlap,
  isPublicHoliday,
  isRealDate,
  isWeekend,
} from './leave';
import type { LeaveRequest } from './hrm-entities';

type Request = Pick<
  LeaveRequest,
  'id' | 'number' | 'employeeId' | 'type' | 'startDate' | 'endDate' | 'days' | 'status'
>;

function request(overrides: Partial<Request> & Pick<Request, 'id'>): Request {
  return {
    number: `LV-2026-${overrides.id}`,
    employeeId: 'emp-1',
    type: 'annual',
    startDate: '2026-03-09',
    endDate: '2026-03-10',
    days: 2,
    status: 'approved',
    ...overrides,
  };
}

describe('isRealDate', () => {
  it('accepts real calendar dates, including a leap day', () => {
    expect(isRealDate('2026-03-14')).toBe(true);
    expect(isRealDate('2028-02-29')).toBe(true);
  });

  it('rejects impossible or malformed dates', () => {
    expect(isRealDate('2026-02-29')).toBe(false);
    expect(isRealDate('2026-13-01')).toBe(false);
    expect(isRealDate('2026-04-31')).toBe(false);
    expect(isRealDate('26-01-01')).toBe(false);
    expect(isRealDate('2026-3-4')).toBe(false);
    expect(isRealDate('')).toBe(false);
  });
});

describe('isWeekend / isPublicHoliday', () => {
  it('knows which days are Saturday and Sunday (14 and 15 March 2026)', () => {
    expect(isWeekend('2026-03-13')).toBe(false); // Friday
    expect(isWeekend('2026-03-14')).toBe(true);
    expect(isWeekend('2026-03-15')).toBe(true);
    expect(isWeekend('2026-03-16')).toBe(false); // Monday
  });

  it('says a malformed date is not a weekend rather than guessing which day it was', () => {
    expect(isWeekend('not-a-date')).toBe(false);
    expect(isWeekend('2026-02-30')).toBe(false);
  });

  it('treats the fixed-date public holidays as holidays in any year', () => {
    for (const date of ['2026-01-01', '2026-04-30', '2026-05-01', '2026-09-02', '2031-09-02']) {
      expect(isPublicHoliday(date)).toBe(true);
    }
    expect(isPublicHoliday('2026-09-03')).toBe(false);
  });
});

describe('addDaysToDate', () => {
  it('moves across month, year and leap-day boundaries', () => {
    expect(addDaysToDate('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysToDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysToDate('2026-03-14', 0)).toBe('2026-03-14');
  });

  it('refuses an invalid date', () => {
    expect(() => addDaysToDate('2026-02-30', 1)).toThrow(RangeError);
  });
});

describe('countWorkingDays', () => {
  it('counts a full Monday-to-Friday week as 5', () => {
    expect(countWorkingDays('2026-03-09', '2026-03-13')).toBe(5);
  });

  it('counts a single working day as 1, and a single weekend day as 0', () => {
    expect(countWorkingDays('2026-03-11', '2026-03-11')).toBe(1);
    expect(countWorkingDays('2026-03-14', '2026-03-14')).toBe(0);
  });

  it('skips the weekend inside a range', () => {
    // Friday to Monday: Fri, Sat, Sun, Mon.
    expect(countWorkingDays('2026-03-13', '2026-03-16')).toBe(2);
    // Two full weeks.
    expect(countWorkingDays('2026-03-09', '2026-03-20')).toBe(10);
  });

  it('is 0 for a range that is only a weekend', () => {
    expect(countWorkingDays('2026-03-14', '2026-03-15')).toBe(0);
  });

  it('skips fixed public holidays, which is why they need no leave', () => {
    // Wed 29 Apr, Thu 30 Apr (holiday), Fri 1 May (holiday), Sat, Sun, Mon 4 May.
    expect(countWorkingDays('2026-04-29', '2026-05-04')).toBe(2);
    // Wed 31 Dec, Thu 1 Jan (holiday), Fri 2 Jan.
    expect(countWorkingDays('2025-12-31', '2026-01-02')).toBe(2);
    // Tue 1 Sep, Wed 2 Sep (holiday), Thu 3 Sep.
    expect(countWorkingDays('2026-09-01', '2026-09-03')).toBe(2);
  });

  it('accepts a different holiday calendar', () => {
    const noHolidays = () => false;
    expect(countWorkingDays('2026-04-29', '2026-05-04', noHolidays)).toBe(4);
    const everyWednesday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 3;
    expect(countWorkingDays('2026-03-09', '2026-03-13', everyWednesday)).toBe(4);
  });

  it('returns 0 for a reversed or invalid range instead of throwing', () => {
    expect(countWorkingDays('2026-03-13', '2026-03-09')).toBe(0);
    expect(countWorkingDays('2026-02-30', '2026-03-09')).toBe(0);
    expect(countWorkingDays('soon', 'later')).toBe(0);
  });

  it('counts across a year boundary', () => {
    // Mon 29 Dec 2025 .. Fri 2 Jan 2026: 29, 30, 31, [1 Jan holiday], 2.
    expect(countWorkingDays('2025-12-29', '2026-01-02')).toBe(4);
  });
});

describe('computeLeaveBalance', () => {
  const requests: Request[] = [
    request({ id: '1', days: 3, status: 'approved' }),
    request({ id: '2', days: 2, status: 'pending_approval', startDate: '2026-06-01' }),
    request({ id: '3', days: 4, status: 'rejected' }),
    request({ id: '4', days: 1, status: 'cancelled' }),
    request({ id: '5', days: 1, status: 'changes_requested' }),
    request({ id: '6', days: 2, type: 'sick' }),
    request({ id: '7', days: 2, type: 'unpaid' }),
    request({ id: '8', days: 5, startDate: '2025-11-03' }),
    request({ id: '9', days: 6, employeeId: 'emp-2' }),
  ];

  it('counts approved annual leave as used and pending annual leave as held', () => {
    expect(computeLeaveBalance(requests, 'emp-1', 12, 2026)).toEqual({
      employeeId: 'emp-1',
      year: 2026,
      allowance: 12,
      used: 3,
      pending: 2,
      remaining: 7,
    });
  });

  it('ignores rejected, cancelled and sent-back requests, other leave types, other years and other employees', () => {
    const balance = computeLeaveBalance(requests, 'emp-1', 12, 2026);
    // 3 + 2 only: requests 3-9 contribute nothing.
    expect(balance.used + balance.pending).toBe(5);
  });

  it('reports another year and another employee independently', () => {
    expect(computeLeaveBalance(requests, 'emp-1', 12, 2025).used).toBe(5);
    expect(computeLeaveBalance(requests, 'emp-2', 12, 2026).used).toBe(6);
    expect(computeLeaveBalance([], 'emp-3', 12, 2026).remaining).toBe(12);
  });

  it('can leave one request out, for editing it', () => {
    expect(computeLeaveBalance(requests, 'emp-1', 12, 2026, '1').used).toBe(0);
  });

  it('goes negative rather than hiding an overdrawn balance', () => {
    const overdrawn = [request({ id: 'x', days: 15 })];
    expect(computeLeaveBalance(overdrawn, 'emp-1', 12, 2026).remaining).toBe(-3);
  });
});

describe('findLeaveOverlap', () => {
  const booked: Request[] = [
    request({ id: 'a', startDate: '2026-03-09', endDate: '2026-03-11', status: 'approved' }),
    request({
      id: 'b',
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      status: 'pending_approval',
    }),
    request({ id: 'c', startDate: '2026-05-04', endDate: '2026-05-06', status: 'rejected' }),
    request({ id: 'd', startDate: '2026-06-01', endDate: '2026-06-02', status: 'cancelled' }),
    request({
      id: 'e',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      status: 'changes_requested',
    }),
    request({ id: 'f', employeeId: 'emp-2', startDate: '2026-08-03', endDate: '2026-08-05' }),
  ];

  it('finds an approved or pending request that overlaps, including on the boundary days', () => {
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-10', '2026-03-12')?.id).toBe('a');
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-11', '2026-03-13')?.id).toBe('a');
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-05', '2026-03-09')?.id).toBe('a');
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-30', '2026-04-01')?.id).toBe('b');
  });

  it('finds a request wholly inside, or wholly around, the new range', () => {
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-10', '2026-03-10')?.id).toBe('a');
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-01', '2026-03-31')?.id).toBe('a');
  });

  it('is clear when the dates are adjacent but not overlapping', () => {
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-12', '2026-03-13')).toBeUndefined();
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-06', '2026-03-08')).toBeUndefined();
  });

  it("ignores requests that don't occupy the calendar, and other employees", () => {
    expect(findLeaveOverlap(booked, 'emp-1', '2026-05-04', '2026-05-06')).toBeUndefined(); // rejected
    expect(findLeaveOverlap(booked, 'emp-1', '2026-06-01', '2026-06-02')).toBeUndefined(); // cancelled
    expect(findLeaveOverlap(booked, 'emp-1', '2026-07-01', '2026-07-02')).toBeUndefined(); // sent back
    expect(findLeaveOverlap(booked, 'emp-1', '2026-08-03', '2026-08-05')).toBeUndefined(); // emp-2's
  });

  it('can leave one request out, for editing it', () => {
    expect(findLeaveOverlap(booked, 'emp-1', '2026-03-10', '2026-03-12', 'a')).toBeUndefined();
  });
});

describe('drawsOnAllowance', () => {
  it('is true only for annual leave', () => {
    expect(drawsOnAllowance('annual')).toBe(true);
    expect(drawsOnAllowance('sick')).toBe(false);
    expect(drawsOnAllowance('unpaid')).toBe(false);
    expect(drawsOnAllowance('special')).toBe(false);
  });
});
