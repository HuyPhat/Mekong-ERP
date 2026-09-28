import type { ReactNode } from 'react';
import { useCan } from './use-can';

interface CanProps {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const allowed = useCan(permission);
  return <>{allowed ? children : fallback}</>;
}
