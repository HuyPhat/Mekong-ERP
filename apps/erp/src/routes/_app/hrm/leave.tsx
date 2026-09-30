import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/hrm/leave')({
  component: () => <Outlet />,
});
