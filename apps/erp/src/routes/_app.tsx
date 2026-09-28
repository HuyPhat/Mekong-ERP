import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireSession } from '../shared/permissions/guards';
import { Shell } from '../app/shell/shell';

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => requireSession(context.queryClient),
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
});
