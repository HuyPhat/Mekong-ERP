import { z } from 'zod';

export const RoleSchema = z.enum([
  'admin',
  'purchasing',
  'warehouse',
  'sales',
  'accountant',
  'approver_manager',
  'approver_finance',
  'approver_director',
]);
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: RoleSchema,
  permissions: z.array(z.string()),
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
  user: UserSchema.nullable(),
});
export type Session = z.infer<typeof SessionSchema>;

export const ApiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
