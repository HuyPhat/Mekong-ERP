import { RoleSchema } from '@mekong-erp/contract';
import type { MessageKey } from '../messages';
import type { Params } from './translate';

export type Translate = (key: MessageKey, params?: Params) => string;

/**
 * The name of a role. A step carries its approver role as a plain string, so one this
 * app has no name for is shown as it is rather than as a missing message.
 */
export function roleLabel(t: Translate, role: string): string {
  const known = RoleSchema.safeParse(role);
  return known.success ? t(`role.${known.data}`) : role;
}
