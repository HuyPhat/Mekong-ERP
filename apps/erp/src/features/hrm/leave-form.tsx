import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useForm, useWatch, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Select,
  Button,
  toast,
} from '@mekong-erp/ui';
import {
  ApiError,
  LeaveTypeSchema,
  countWorkingDays,
  drawsOnAllowance,
  isRealDate,
  type LeaveRequestView,
} from '@mekong-erp/contract';
import { useSession } from '../auth/queries';
import {
  createLeaveFormSchema,
  leaveRangeProblem,
  type LeaveFormInput,
  type LeaveFormValues,
} from './leave-form-schema';
import {
  useCreateLeaveRequest,
  useLeaveBalance,
  useMyEmployee,
  useReviseLeaveRequest,
} from './queries';
import { leaveTypeLabel } from './status';

const FORM_FIELDS: readonly string[] = ['type', 'startDate', 'endDate', 'reason'];

/**
 * Turns a refused submission into the sentence shown above the buttons, and puts
 * any field-level reasons on their fields. The mock server answers in English, so
 * the codes worth acting on are worded here in the current language.
 */
function describeFailure(
  error: unknown,
  t: TFunction,
  setError: UseFormSetError<LeaveFormInput>,
): string {
  if (!(error instanceof ApiError)) return t('errors.genericTitle');

  if (error.code === 'LEAVE_OVERLAP') {
    const number = /LV-\d{4}-\d{6}/.exec(error.message)?.[0];
    return number ? t('hrm.leave.form.errors.overlap', { number }) : error.message;
  }
  if (error.code === 'INSUFFICIENT_BALANCE') return t('hrm.leave.form.errors.insufficientBalance');
  if (error.code === 'NO_APPROVAL_RULE') return t('hrm.leave.form.errors.noApprovalRule');

  let placed = false;
  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    const message = messages[0];
    if (message !== undefined && FORM_FIELDS.includes(field)) {
      setError(field as keyof LeaveFormInput, { message });
      placed = true;
    }
  }
  return placed ? '' : t('errors.genericTitle');
}

/**
 * Asking for leave, or editing a request that was sent back and resubmitting it.
 * Nobody picks an employee: a request is always for the signed-in login's own
 * employee record, which is also what stops it being filed for someone else.
 */
export function LeaveRequestForm({ revising }: { revising?: LeaveRequestView }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: employee, isLoading: employeeLoading } = useMyEmployee(session?.user?.id);
  const employeeId = revising?.employeeId ?? employee?.id;

  const createMutation = useCreateLeaveRequest();
  const reviseMutation = useReviseLeaveRequest();
  const pending = createMutation.isPending || reviseMutation.isPending;
  const [formError, setFormError] = useState('');

  const schema = useMemo(() => createLeaveFormSchema(t), [t]);
  const form = useForm<LeaveFormInput, unknown, LeaveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: revising
      ? {
          type: revising.type,
          startDate: revising.startDate,
          endDate: revising.endDate,
          reason: revising.reason,
        }
      : { type: 'annual', startDate: '', endDate: '', reason: '' },
  });
  const { control, handleSubmit, setError } = form;

  // useWatch, not watch(): it hands back fresh values on every change.
  const [type, startDate, endDate] = useWatch({ control, name: ['type', 'startDate', 'endDate'] });
  const rangeProblem = leaveRangeProblem(startDate, endDate);
  const datesChosen = isRealDate(startDate) && isRealDate(endDate);
  const days = datesChosen && !rangeProblem ? countWorkingDays(startDate, endDate) : 0;
  const year = isRealDate(startDate) ? Number(startDate.slice(0, 4)) : new Date().getFullYear();
  const { data: balance } = useLeaveBalance(employeeId, year);
  const usesAllowance = drawsOnAllowance(type);
  const remainingAfter = balance ? balance.remaining - (usesAllowance ? days : 0) : undefined;

  const onSubmit = handleSubmit(async (values) => {
    if (!employeeId) return;
    setFormError('');
    const input = {
      employeeId,
      type: values.type,
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason,
    };
    try {
      const leave = revising
        ? await reviseMutation.mutateAsync({ id: revising.id, input })
        : await createMutation.mutateAsync(input);
      toast({
        title: t(revising ? 'hrm.leave.form.resubmitSuccess' : 'hrm.leave.form.submitSuccess'),
      });
      void navigate({ to: '/hrm/leave/$leaveId', params: { leaveId: leave.id } });
    } catch (error) {
      setFormError(describeFailure(error, t, setError));
    }
  });

  if (!revising && employeeLoading) {
    return <p className="text-muted-foreground">{t('hrm.leave.form.loading')}</p>;
  }
  if (!revising && !employee) {
    return <p className="text-destructive">{t('hrm.leave.form.noEmployee')}</p>;
  }

  const person = revising
    ? { name: revising.employeeName, code: revising.employeeCode, department: revising.department }
    : employee
      ? { name: employee.name, code: employee.code, department: employee.department }
      : null;

  return (
    <Form {...form}>
      <form onSubmit={(event) => void onSubmit(event)} className="flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">
            {revising
              ? t('hrm.leave.form.reviseTitle', { number: revising.number })
              : t('hrm.leave.form.title')}
          </h1>
          {person && (
            <p className="text-sm text-muted-foreground">
              {person.name} · {person.code} · {t(`hrm.departments.${person.department}`)}
            </p>
          )}
        </div>

        <FormField
          control={control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('hrm.leave.form.typeLabel')}</FormLabel>
              <FormControl>
                <Select {...field}>
                  {LeaveTypeSchema.options.map((option) => (
                    <option key={option} value={option}>
                      {leaveTypeLabel(t, option)}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('hrm.leave.form.startDateLabel')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('hrm.leave.form.endDateLabel')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div
          className="flex flex-col gap-1 rounded-md border border-border bg-muted px-4 py-3 text-sm"
          aria-live="polite"
        >
          {rangeProblem ? (
            <p className="font-medium text-destructive">
              {t(`hrm.leave.form.errors.${rangeProblem.key}`)}
            </p>
          ) : datesChosen ? (
            <p className="font-medium">
              {t('hrm.leave.form.preview.days', { count: days })}
              <span className="font-normal text-muted-foreground">
                {' '}
                {t('hrm.leave.form.preview.daysNote')}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">{t('hrm.leave.form.preview.pickDates')}</p>
          )}
          {usesAllowance && balance && (
            <p
              className={
                remainingAfter !== undefined && remainingAfter < 0 ? 'text-destructive' : ''
              }
            >
              {remainingAfter !== undefined && remainingAfter < 0
                ? t('hrm.leave.form.preview.notEnough', {
                    days,
                    remaining: Math.max(0, balance.remaining),
                    year,
                  })
                : t('hrm.leave.form.preview.balance', {
                    remaining: balance.remaining,
                    allowance: balance.allowance,
                    after: remainingAfter ?? balance.remaining,
                    year,
                  })}
            </p>
          )}
          {!usesAllowance && (
            <p className="text-muted-foreground">{t('hrm.leave.form.preview.noAllowance')}</p>
          )}
        </div>

        <FormField
          control={control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('hrm.leave.form.reasonLabel')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('hrm.leave.form.reasonPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            {revising ? (
              <Link to="/hrm/leave/$leaveId" params={{ leaveId: revising.id }}>
                {t('hrm.leave.form.cancelButton')}
              </Link>
            ) : (
              <Link to="/hrm/leave" search={{ page: 1, pageSize: 50, scope: 'mine' }}>
                {t('hrm.leave.form.cancelButton')}
              </Link>
            )}
          </Button>
          <Button type="submit" disabled={pending || !employeeId}>
            {pending
              ? t('hrm.leave.form.submitting')
              : revising
                ? t('hrm.leave.form.resubmitButton')
                : t('hrm.leave.form.submitButton')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
