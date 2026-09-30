import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { useArAging } from '../../../features/accounting/queries';
import { AgingReport } from '../../../features/accounting/aging-report';

export const Route = createFileRoute('/_app/accounting/ar-aging')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.accountingRead),
  component: ArAgingPage,
});

function ArAgingPage() {
  const { data, isLoading } = useArAging();
  return (
    <AgingReport
      data={data}
      isLoading={isLoading}
      partyLabelKey="accounting.aging.customerColumn"
    />
  );
}
