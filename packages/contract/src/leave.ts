// Pure leave-request logic: working-day counting, balances and overlap checks.
// No framework or storage imports, so it is shared by the MSW handlers, the seed
// generator and the forms' live "N working days" preview (ADR-0015).
import type { LeaveBalance, LeaveRequest, LeaveType } from './hrm-entities';

/** Illustrative policy for the demo, not legal advice. */
export const DEFAULT_ANNUAL_LEAVE_DAYS = 12;

/**
 * Public holidays that fall on the same date every year (month-day). Holidays
 * that follow the lunar calendar, such as Tết, and the extra day around National
 * Day are not modelled: the calendar is a demo default, not an official one.
 */
export const FIXED_PUBLIC_HOLIDAYS: readonly string[] = ['01-01', '04-30', '05-01', '09-02'];

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

function parseDateOnly(value: string): CalendarDate | null {
  const match = DATE_ONLY_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Date.UTC rolls 2026-02-30 over to March; reject anything that doesn't survive a round trip.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** True for a real calendar date written `yyyy-mm-dd`. */
export function isRealDate(value: string): boolean {
  return parseDateOnly(value) !== null;
}

function toUtcMs(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function formatDateOnly(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function isWeekend(date: string): boolean {
  const parsed = parseDateOnly(date);
  if (!parsed) return false;
  const weekday = new Date(toUtcMs(parsed)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function isPublicHoliday(date: string): boolean {
  return FIXED_PUBLIC_HOLIDAYS.includes(date.slice(5));
}

/** Adds `days` (may be negative) to a `yyyy-mm-dd` date. */
export function addDaysToDate(date: string, days: number): string {
  const parsed = parseDateOnly(date);
  if (!parsed) throw new RangeError(`Not a valid date: ${date}`);
  return formatDateOnly(toUtcMs(parsed) + days * MS_PER_DAY);
}

/**
 * Working days between two dates, both inclusive: Saturdays, Sundays and the
 * fixed public holidays don't count. Returns 0 for an invalid or reversed range.
 */
export function countWorkingDays(
  startDate: string,
  endDate: string,
  isHoliday: (date: string) => boolean = isPublicHoliday,
): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return 0;
  const first = toUtcMs(start);
  const last = toUtcMs(end);
  if (last < first) return 0;

  let count = 0;
  for (let ms = first; ms <= last; ms += MS_PER_DAY) {
    const date = formatDateOnly(ms);
    if (!isWeekend(date) && !isHoliday(date)) count += 1;
  }
  return count;
}

type BalanceRequest = Pick<
  LeaveRequest,
  'id' | 'employeeId' | 'type' | 'startDate' | 'days' | 'status'
>;

/**
 * Only annual leave draws on the allowance; sick, unpaid and special leave
 * don't. A request counts in the year it starts (requests can't span years).
 * Computed from the requests on demand, so it can never drift from them.
 */
export function computeLeaveBalance(
  requests: BalanceRequest[],
  employeeId: string,
  allowance: number,
  year: number,
  ignoreRequestId?: string,
): LeaveBalance {
  let used = 0;
  let pending = 0;
  for (const request of requests) {
    if (
      request.employeeId !== employeeId ||
      request.type !== 'annual' ||
      request.id === ignoreRequestId ||
      Number(request.startDate.slice(0, 4)) !== year
    ) {
      continue;
    }
    if (request.status === 'approved') used += request.days;
    else if (request.status === 'pending_approval') pending += request.days;
  }
  return { employeeId, year, allowance, used, pending, remaining: allowance - used - pending };
}

/** Statuses that occupy the calendar: rejected, cancelled and sent-back requests don't. */
const ACTIVE_STATUSES: readonly string[] = ['pending_approval', 'approved'];

type OverlapRequest = Pick<
  LeaveRequest,
  'id' | 'employeeId' | 'startDate' | 'endDate' | 'status' | 'number'
>;

/** The employee's active request that overlaps `startDate`..`endDate`, if any. */
export function findLeaveOverlap(
  requests: OverlapRequest[],
  employeeId: string,
  startDate: string,
  endDate: string,
  ignoreRequestId?: string,
): OverlapRequest | undefined {
  return requests.find(
    (request) =>
      request.employeeId === employeeId &&
      request.id !== ignoreRequestId &&
      ACTIVE_STATUSES.includes(request.status) &&
      // ISO dates compare correctly as strings.
      request.startDate <= endDate &&
      request.endDate >= startDate,
  );
}

/** Which leave types draw on the annual allowance. */
export function drawsOnAllowance(type: LeaveType): boolean {
  return type === 'annual';
}
