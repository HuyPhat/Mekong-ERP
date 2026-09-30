import { z } from './zod';
import { isRealDate } from './leave';

export const EmployeeDepartmentSchema = z.enum([
  'purchasing',
  'warehouse',
  'sales',
  'accounting',
  'management',
]);
export type EmployeeDepartment = z.infer<typeof EmployeeDepartmentSchema>;

export const EmployeeSchema = z.object({
  id: z.string(),
  /** `NV-0001`: "nhân viên". */
  code: z.string(),
  name: z.string(),
  department: EmployeeDepartmentSchema,
  jobTitle: z.string(),
  /** The demo login this employee corresponds to, if any. */
  userId: z.string().optional(),
  joinedAt: z.string(),
  annualLeaveDays: z.number().int().positive(),
});
export type Employee = z.infer<typeof EmployeeSchema>;

export const LeaveTypeSchema = z.enum(['annual', 'sick', 'unpaid', 'special']);
export type LeaveType = z.infer<typeof LeaveTypeSchema>;

// Leave is submitted when it is created, so there is no draft: unlike a purchase
// order it is a short form, and a half-finished one isn't worth persisting.
export const LeaveRequestStatusSchema = z.enum([
  'pending_approval',
  'approved',
  'rejected',
  'changes_requested',
  'cancelled',
]);
export type LeaveRequestStatus = z.infer<typeof LeaveRequestStatusSchema>;

/** A calendar date `yyyy-mm-dd` (not an instant, so no time zone shifts it). */
export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the yyyy-mm-dd format.')
  .refine(isRealDate, 'That date does not exist.');

export const LeaveRequestSchema = z.object({
  id: z.string(),
  /** `LV-2026-000012`. */
  number: z.string(),
  employeeId: z.string(),
  type: LeaveTypeSchema,
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
  /** Working days: weekends and fixed public holidays excluded. */
  days: z.number().int().positive(),
  reason: z.string(),
  status: LeaveRequestStatusSchema,
  createdAt: z.string(),
  submittedAt: z.string(),
});
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

/** The list/detail shape: the request with the employee denormalized onto it. */
export const LeaveRequestViewSchema = LeaveRequestSchema.extend({
  employeeName: z.string(),
  employeeCode: z.string(),
  department: EmployeeDepartmentSchema,
});
export type LeaveRequestView = z.infer<typeof LeaveRequestViewSchema>;

export const CreateLeaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  type: LeaveTypeSchema,
  startDate: DateOnlySchema,
  endDate: DateOnlySchema,
  reason: z.string().trim().min(1, 'Enter a reason.').max(500),
});
export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestSchema>;

/**
 * Annual leave: `used` is approved, `pending` is awaiting a decision and is held
 * against the balance so it can't be double-booked.
 */
export const LeaveBalanceSchema = z.object({
  employeeId: z.string(),
  year: z.number().int(),
  allowance: z.number().int(),
  used: z.number().int(),
  pending: z.number().int(),
  remaining: z.number().int(),
});
export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;
