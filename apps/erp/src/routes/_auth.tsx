import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { ensureSession } from '../features/auth/queries';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context }) => {
    const session = await ensureSession(context.queryClient);
    if (session.user) {
      throw redirect({ to: '/' });
    }
  },
  component: () => <Outlet />,
});
