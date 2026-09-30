import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { useApAging } from '../../../features/accounting/queries';
import { AgingReport } from '../../../features/accounting/aging-report';

export const Route = createFileRoute('/_app/accounting/ap-aging')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.accountingRead),
  component: ApAgingPage,
});

function ApAgingPage() {
  const { data, isLoading } = useApAging();
  return (
    <AgingReport
      data={data}
      isLoading={isLoading}
      partyLabelKey="accounting.aging.supplierColumn"
    />
  );
}
