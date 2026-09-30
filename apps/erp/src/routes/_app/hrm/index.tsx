import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/hrm/')({
  beforeLoad: () => {
    throw redirect({ to: '/hrm/leave', search: { page: 1, pageSize: 50, scope: 'mine' } });
  },
});
