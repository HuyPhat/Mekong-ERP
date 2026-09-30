import { createFileRoute } from '@tanstack/react-router';
import { PERMISSIONS } from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { QuotationForm } from '../../../../features/sales/quotation-form';

export const Route = createFileRoute('/_app/sales/quotations/new')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesWrite),
  component: QuotationForm,
});
