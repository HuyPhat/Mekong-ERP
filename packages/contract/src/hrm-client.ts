import { request } from './client';
import { buildListQuery, listResponseSchema, type ListParams } from './list-query';
import {
  EmployeeSchema,
  LeaveBalanceSchema,
  LeaveRequestViewSchema,
  type CreateLeaveRequestInput,
} from './hrm-entities';

const EmployeeListResponseSchema = listResponseSchema(EmployeeSchema);
const LeaveRequestListResponseSchema = listResponseSchema(LeaveRequestViewSchema);

export function fetchEmployees(params: ListParams) {
  return request(`/employees?${buildListQuery(params)}`, EmployeeListResponseSchema);
}

export function fetchEmployee(id: string) {
  return request(`/employees/${id}`, EmployeeSchema);
}

export function fetchLeaveRequests(params: ListParams) {
  return request(`/leave-requests?${buildListQuery(params)}`, LeaveRequestListResponseSchema);
}

export function fetchLeaveRequest(id: string) {
  return request(`/leave-requests/${id}`, LeaveRequestViewSchema);
}

/** Creating a request submits it for approval: leave has no draft state. */
export function createLeaveRequest(input: CreateLeaveRequestInput) {
  return request('/leave-requests', LeaveRequestViewSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Revises a request that was sent back for changes, and resubmits it. */
export function reviseLeaveRequest(id: string, input: CreateLeaveRequestInput) {
  return request(`/leave-requests/${id}`, LeaveRequestViewSchema, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function cancelLeaveRequest(id: string) {
  return request(`/leave-requests/${id}/cancel`, LeaveRequestViewSchema, { method: 'POST' });
}

export function fetchLeaveBalance(employeeId: string, year?: number) {
  const query = new URLSearchParams({ employeeId });
  if (year !== undefined) query.set('year', String(year));
  return request(`/leave-balances?${query.toString()}`, LeaveBalanceSchema);
}
