import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { hasPermission, type Session } from '@mekong-erp/contract';
import { ensureSession } from '../../features/auth/queries';

export async function requireSession(queryClient: QueryClient): Promise<Session> {
  const session = await ensureSession(queryClient);
  if (!session.user) {
    throw redirect({ to: '/login' });
  }
  return session;
}

export async function requirePermission(
  queryClient: QueryClient,
  permission: string,
): Promise<Session> {
  const session = await requireSession(queryClient);
  if (!hasPermission(session.user, permission)) {
    throw redirect({ to: '/403' });
  }
  return session;
}
