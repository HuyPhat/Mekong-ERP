import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/sales/')({
  beforeLoad: () => {
    throw redirect({ to: '/sales/quotations', search: { page: 1, pageSize: 50 } });
  },
});
