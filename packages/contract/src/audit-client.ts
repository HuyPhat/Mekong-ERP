import { request } from './client';
import { buildListQuery, listResponseSchema, type ListParams } from './list-query';
import { AuditLogEntrySchema } from './audit-entities';

const AuditLogListResponseSchema = listResponseSchema(AuditLogEntrySchema);

export function fetchAuditLog(params: ListParams) {
  return request(`/audit-log?${buildListQuery(params)}`, AuditLogListResponseSchema);
}
