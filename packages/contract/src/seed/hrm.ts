import { faker } from '@faker-js/faker';
import type { Approval, ApprovalRule } from '../approval-entities';
import type { AuditLogEntry } from '../audit-entities';
import type {
  Employee,
  EmployeeDepartment,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
} from '../hrm-entities';
import { DEMO_USERS } from '../demo-users';
import { createApprovalChain, decideApproval, resolveApprovalRoles } from '../approval-engine';
import { generateDocumentNumber } from '../document-number';
import {
  DEFAULT_ANNUAL_LEAVE_DAYS,
  addDaysToDate,
  computeLeaveBalance,
  countWorkingDays,
  findLeaveOverlap,
  isWeekend,
} from '../leave';

const EMPLOYEE_COUNT = 40;

// Who each demo login is in the company (ADR-0015): the leave screens act on
// "my" requests, so every persona needs an employee record behind it.
const DEMO_STAFF: Record<string, { department: EmployeeDepartment; jobTitle: string }> = {
  admin: { department: 'management', jobTitle: 'Quản trị hệ thống' },
  purchasing: { department: 'purchasing', jobTitle: 'Chuyên viên mua hàng' },
  warehouse: { department: 'warehouse', jobTitle: 'Thủ kho' },
  sales: { department: 'sales', jobTitle: 'Nhân viên kinh doanh' },
  accountant: { department: 'accounting', jobTitle: 'Kế toán viên' },
  approver_manager: { department: 'purchasing', jobTitle: 'Trưởng phòng mua hàng' },
  approver_finance: { department: 'accounting', jobTitle: 'Kế toán trưởng' },
  approver_director: { department: 'management', jobTitle: 'Giám đốc' },
};

const DEPARTMENT_HEADCOUNT: { department: EmployeeDepartment; count: number }[] = [
  { department: 'purchasing', count: 6 },
  { department: 'warehouse', count: 9 },
  { department: 'sales', count: 10 },
  { department: 'accounting', count: 5 },
  { department: 'management', count: 2 },
];

const JOB_TITLES: Record<EmployeeDepartment, string[]> = {
  purchasing: ['Chuyên viên mua hàng', 'Nhân viên đặt hàng', 'Điều phối nhà cung cấp'],
  warehouse: ['Thủ kho', 'Nhân viên xuất nhập kho', 'Nhân viên giao nhận', 'Tài xế'],
  sales: ['Nhân viên kinh doanh', 'Giám sát bán hàng', 'Chăm sóc khách hàng'],
  accounting: ['Kế toán viên', 'Kế toán thanh toán', 'Kế toán kho'],
  management: ['Trợ lý giám đốc', 'Chuyên viên hành chính nhân sự'],
};

const FAMILY_NAMES = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
  'Lý',
];
const MALE_GIVEN = ['Tuấn', 'Khoa', 'Bảo', 'Phước', 'Sơn', 'Thịnh', 'Dũng', 'Hải', 'Quân', 'Hùng'];
const FEMALE_GIVEN = ['Lan', 'Hà', 'Ngọc', 'Linh', 'Trúc', 'Chi', 'Mai', 'Hạnh', 'Thảo', 'Trang'];

const TYPE_WEIGHTS: { value: LeaveType; weight: number }[] = [
  { value: 'annual', weight: 60 },
  { value: 'sick', weight: 20 },
  { value: 'special', weight: 10 },
  { value: 'unpaid', weight: 10 },
];

/** How many calendar days each type usually spans (min, max). */
const SPAN_DAYS: Record<LeaveType, [number, number]> = {
  annual: [1, 7],
  sick: [1, 4],
  special: [1, 3],
  unpaid: [1, 9],
};

const PAST_STATUS_WEIGHTS: { value: LeaveRequestStatus; weight: number }[] = [
  { value: 'approved', weight: 84 },
  { value: 'rejected', weight: 10 },
  { value: 'cancelled', weight: 6 },
];
const UPCOMING_STATUS_WEIGHTS: { value: LeaveRequestStatus; weight: number }[] = [
  { value: 'pending_approval', weight: 45 },
  { value: 'approved', weight: 40 },
  { value: 'rejected', weight: 5 },
  { value: 'changes_requested', weight: 5 },
  { value: 'cancelled', weight: 5 },
];

const REASONS: Record<LeaveType, string[]> = {
  annual: [
    'Về quê thăm gia đình',
    'Đi du lịch cùng gia đình',
    'Việc riêng của gia đình',
    'Nghỉ ngơi',
  ],
  sick: ['Bị cảm cúm, có giấy bác sĩ', 'Khám sức khỏe định kỳ', 'Sốt xuất huyết, nằm viện'],
  special: ['Đám cưới của bản thân', 'Đám cưới của con', 'Việc hiếu'],
  unpaid: ['Việc gia đình đột xuất', 'Hoàn tất thủ tục giấy tờ', 'Đi thăm người thân ở xa'],
};

const REJECTION_COMMENTS = [
  'Trùng đợt kiểm kê cuối quý, vui lòng dời sang tuần sau.',
  'Phòng đang thiếu người trong thời gian này.',
  'Chưa đủ thông tin, vui lòng bổ sung.',
];
const CHANGE_COMMENTS = [
  'Vui lòng chọn ngày khác, trùng lịch giao hàng.',
  'Rút ngắn thời gian nghỉ.',
];

export interface HrmSeedResult {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  approvals: Approval[];
  auditLogEntries: AuditLogEntry[];
}

function toDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function generateEmployees(now: Date): Employee[] {
  const employees: Employee[] = [];
  const joined = (): string =>
    toDateOnly(new Date(now.getTime() - faker.number.int({ min: 90, max: 3000 }) * 86_400_000));

  for (const user of DEMO_USERS) {
    const staff = DEMO_STAFF[user.id];
    if (!staff) continue;
    employees.push({
      id: `emp-${user.id}`,
      code: `NV-${String(employees.length + 1).padStart(4, '0')}`,
      name: user.name,
      department: staff.department,
      jobTitle: staff.jobTitle,
      userId: user.id,
      joinedAt: joined(),
      annualLeaveDays: DEFAULT_ANNUAL_LEAVE_DAYS,
    });
  }

  for (const { department, count } of DEPARTMENT_HEADCOUNT) {
    for (let i = 0; i < count && employees.length < EMPLOYEE_COUNT; i += 1) {
      const female = faker.datatype.boolean();
      const middle = female ? 'Thị' : 'Văn';
      const given = faker.helpers.arrayElement(female ? FEMALE_GIVEN : MALE_GIVEN);
      const family = faker.helpers.arrayElement(FAMILY_NAMES);
      employees.push({
        id: `emp-${String(employees.length + 1).padStart(3, '0')}`,
        code: `NV-${String(employees.length + 1).padStart(4, '0')}`,
        name: `${family} ${middle} ${given}`,
        department,
        jobTitle: faker.helpers.arrayElement(JOB_TITLES[department]),
        joinedAt: joined(),
        annualLeaveDays: DEFAULT_ANNUAL_LEAVE_DAYS,
      });
    }
  }
  return employees;
}

interface DraftRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveRequestStatus;
  submittedAt: string;
}

function auditEntry(
  request: { id: string; number: string },
  action: string,
  actorId: string,
  before: string | undefined,
  after: string,
  at: string,
): AuditLogEntry {
  return {
    id: faker.string.uuid(),
    entityType: 'leave_request',
    entityId: request.id,
    entityNumber: request.number,
    action,
    actorId,
    ...(before !== undefined ? { before: { status: before } } : {}),
    after: { status: after },
    at,
  };
}

/** A timestamp `hours` after `from`, never later than `limit`. */
function laterBy(from: string, hours: number, limit: Date): string {
  const at = new Date(new Date(from).getTime() + hours * 3_600_000);
  return (at > limit ? limit : at).toISOString();
}

/**
 * Generates the HRM demo data: staff (the eight demo logins plus 32 others) and
 * a year of leave requests with their approval chains and audit trails.
 *
 * Every request obeys the rules the live handlers enforce, so seeded and
 * user-made data can't disagree: whole working days, one calendar year, no
 * overlap with the employee's other active leave, annual leave within the
 * allowance, and an approval chain resolved from the rules by working days.
 *
 * `now` is a parameter so tests can pin it; history is relative to it, as with
 * the other seeds.
 */
export function generateHrmData(rules: ApprovalRule[], now: Date = new Date()): HrmSeedResult {
  faker.seed(20260301);
  const today = toDateOnly(now);
  const employees = generateEmployees(now);

  const drafts: DraftRequest[] = [];
  for (const employee of employees) {
    const target = faker.number.int({ min: 3, max: 8 });
    for (let attempt = 0; attempt < target * 3 && drafts.length < 1_000; attempt += 1) {
      if (drafts.filter((d) => d.employeeId === employee.id).length >= target) break;

      let type = faker.helpers.weightedArrayElement(TYPE_WEIGHTS);
      let startDate = addDaysToDate(today, faker.number.int({ min: -330, max: 75 }));
      while (isWeekend(startDate)) startDate = addDaysToDate(startDate, 1);
      const [minSpan, maxSpan] = SPAN_DAYS[type];
      const endDate = addDaysToDate(
        startDate,
        faker.number.int({ min: minSpan, max: maxSpan }) - 1,
      );
      if (startDate.slice(0, 4) !== endDate.slice(0, 4)) continue;
      const days = countWorkingDays(startDate, endDate);
      if (days === 0) continue;

      const status = faker.helpers.weightedArrayElement(
        endDate < today ? PAST_STATUS_WEIGHTS : UPCOMING_STATUS_WEIGHTS,
      );
      const active = status === 'approved' || status === 'pending_approval';
      const others = drafts.filter((d) => d.employeeId === employee.id);
      if (
        active &&
        findLeaveOverlap(others.map(asOverlapCandidate), employee.id, startDate, endDate)
      ) {
        continue;
      }
      // Annual leave that would overdraw the allowance is taken unpaid instead.
      if (active && type === 'annual') {
        const balance = computeLeaveBalance(
          others.map(asBalanceCandidate),
          employee.id,
          employee.annualLeaveDays,
          Number(startDate.slice(0, 4)),
        );
        if (days > balance.remaining) type = 'unpaid';
      }

      // Submitted a few days ahead, and always in the past.
      const lead = faker.number.int({ min: 2, max: 21 });
      const submitted = new Date(`${addDaysToDate(startDate, -lead)}T00:00:00`);
      submitted.setHours(
        faker.number.int({ min: 8, max: 17 }),
        faker.number.int({ min: 0, max: 59 }),
      );
      const latest = new Date(now.getTime() - 86_400_000);
      drafts.push({
        id: faker.string.uuid(),
        employeeId: employee.id,
        type,
        startDate,
        endDate,
        days,
        reason: faker.helpers.arrayElement(REASONS[type]),
        status,
        submittedAt: (submitted > latest ? latest : submitted).toISOString(),
      });
    }
  }

  // Numbers run in the order requests were submitted, like the live counter.
  drafts.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  const leaveRequests: LeaveRequest[] = [];
  const approvals: Approval[] = [];
  const auditLogEntries: AuditLogEntry[] = [];

  drafts.forEach((draft, index) => {
    const number = generateDocumentNumber(
      'LV',
      new Date(draft.submittedAt).getFullYear(),
      index + 1,
    );
    const employee = employees.find((candidate) => candidate.id === draft.employeeId);
    const requesterId = employee?.userId ?? draft.employeeId;
    const ref = { id: draft.id, number };

    const roles = resolveApprovalRoles(rules, 'leave_request', draft.days);
    let chain = createApprovalChain(
      'leave_request',
      draft.id,
      number,
      roles,
      () => faker.string.uuid(),
      draft.submittedAt,
    );
    auditLogEntries.push(
      auditEntry(ref, 'submitted', requesterId, undefined, 'pending_approval', draft.submittedAt),
    );

    let at = draft.submittedAt;
    let statusNow: LeaveRequestStatus = 'pending_approval';
    const decide = (
      stepIndex: number,
      decision: 'approved' | 'rejected' | 'changes_requested',
      comment?: string,
    ): void => {
      const step = chain[stepIndex];
      if (!step) return;
      at = laterBy(at, faker.number.int({ min: 2, max: 30 }), now);
      const result = decideApproval(chain, step.id, decision, step.approverRole, at, comment);
      chain = result.chain;
      const before = statusNow;
      statusNow = result.outcome === 'pending' ? 'pending_approval' : result.outcome;
      auditLogEntries.push(
        auditEntry(ref, `approval_${decision}`, step.approverRole, before, statusNow, at),
      );
    };

    switch (draft.status) {
      case 'approved':
        chain.forEach((_, i) => decide(i, 'approved'));
        break;
      case 'pending_approval': {
        // Some steps already approved, at least one still waiting.
        const cut = chain.length > 1 ? faker.number.int({ min: 0, max: chain.length - 1 }) : 0;
        for (let i = 0; i < cut; i += 1) decide(i, 'approved');
        break;
      }
      case 'rejected': {
        const rejectAt = faker.number.int({ min: 0, max: chain.length - 1 });
        for (let i = 0; i < rejectAt; i += 1) decide(i, 'approved');
        decide(rejectAt, 'rejected', faker.helpers.arrayElement(REJECTION_COMMENTS));
        break;
      }
      case 'changes_requested':
        decide(0, 'changes_requested', faker.helpers.arrayElement(CHANGE_COMMENTS));
        break;
      case 'cancelled': {
        // Either withdrawn while waiting, or cancelled after it was approved.
        if (faker.datatype.boolean()) {
          chain.forEach((_, i) => decide(i, 'approved'));
        } else {
          chain = chain.map((step) => ({ ...step, status: 'skipped' as const }));
        }
        at = laterBy(at, faker.number.int({ min: 2, max: 48 }), now);
        auditLogEntries.push(auditEntry(ref, 'cancelled', requesterId, statusNow, 'cancelled', at));
        break;
      }
    }

    approvals.push(...chain);
    leaveRequests.push({
      id: draft.id,
      number,
      employeeId: draft.employeeId,
      type: draft.type,
      startDate: draft.startDate,
      endDate: draft.endDate,
      days: draft.days,
      reason: draft.reason,
      status: draft.status,
      createdAt: draft.submittedAt,
      submittedAt: draft.submittedAt,
    });
  });

  return { employees, leaveRequests, approvals, auditLogEntries };
}

function asOverlapCandidate(draft: DraftRequest) {
  return {
    id: draft.id,
    number: draft.id,
    employeeId: draft.employeeId,
    startDate: draft.startDate,
    endDate: draft.endDate,
    status: draft.status,
  };
}

function asBalanceCandidate(draft: DraftRequest) {
  return {
    id: draft.id,
    employeeId: draft.employeeId,
    type: draft.type,
    startDate: draft.startDate,
    days: draft.days,
    status: draft.status,
  };
}
