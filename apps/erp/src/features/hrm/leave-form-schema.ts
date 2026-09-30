import type { TFunction } from 'i18next';
import { z, LeaveTypeSchema, countWorkingDays, isRealDate } from '@mekong-erp/contract';

export interface LeaveRangeProblem {
  field: 'startDate' | 'endDate';
  /** Key under `hrm.leave.form.errors`. */
  key: 'endBeforeStart' | 'twoYears' | 'noWorkingDays';
}

/**
 * What is wrong with a pair of dates, if anything. The same three rules the mock
 * server enforces, so the form can say so before the request is sent; the server
 * still checks them again. Dates that aren't real yet are left to the required-field
 * messages rather than reported twice.
 */
export function leaveRangeProblem(startDate: string, endDate: string): LeaveRangeProblem | null {
  if (!isRealDate(startDate) || !isRealDate(endDate)) return null;
  if (endDate < startDate) return { field: 'endDate', key: 'endBeforeStart' };
  if (startDate.slice(0, 4) !== endDate.slice(0, 4)) return { field: 'endDate', key: 'twoYears' };
  if (countWorkingDays(startDate, endDate) === 0)
    return { field: 'startDate', key: 'noWorkingDays' };
  return null;
}

/** The leave form's rules, worded in the current language. */
export function createLeaveFormSchema(t: TFunction) {
  return z
    .object({
      type: LeaveTypeSchema,
      startDate: z.string().refine(isRealDate, t('hrm.leave.form.errors.startRequired')),
      endDate: z.string().refine(isRealDate, t('hrm.leave.form.errors.endRequired')),
      reason: z
        .string()
        .trim()
        .min(1, t('hrm.leave.form.errors.reasonRequired'))
        .max(500, t('hrm.leave.form.errors.reasonTooLong')),
    })
    .check((ctx) => {
      const problem = leaveRangeProblem(ctx.value.startDate, ctx.value.endDate);
      if (!problem) return;
      ctx.issues.push({
        code: 'custom',
        input: ctx.value,
        path: [problem.field],
        message: t(`hrm.leave.form.errors.${problem.key}`),
      });
    });
}

export type LeaveFormInput = z.input<ReturnType<typeof createLeaveFormSchema>>;
export type LeaveFormValues = z.output<ReturnType<typeof createLeaveFormSchema>>;
