import { hasPermission } from '@mekong-erp/contract';
import { useSession } from '../../features/auth/queries';

export function useCan(permission: string): boolean {
  const { data } = useSession();
  return hasPermission(data?.user ?? null, permission);
}
