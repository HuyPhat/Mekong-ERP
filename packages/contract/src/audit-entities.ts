import { z } from 'zod';

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  entityNumber: z.string(),
  action: z.string(),
  actorId: z.string(),
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
  at: z.string(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
