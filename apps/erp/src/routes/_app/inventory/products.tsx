import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/inventory/products')({
  component: () => <Outlet />,
});
