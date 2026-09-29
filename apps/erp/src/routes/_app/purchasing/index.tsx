import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/purchasing/')({
  beforeLoad: () => {
    throw redirect({ to: '/purchasing/orders', search: { page: 1, pageSize: 50 } });
  },
});
