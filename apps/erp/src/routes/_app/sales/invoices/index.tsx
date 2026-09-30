import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  createDataGridColumnHelper,
  MoneyCell,
  StatusBadge,
  FilterBar,
  type ColumnFilterConfig,
} from '@mekong-erp/ui';
import {
  PERMISSIONS,
  CustomerInvoiceStatusSchema,
  type CustomerInvoiceView,
  type ListParams,
} from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { formatDate } from '../../../../shared/lib/format';
import { useCustomerInvoices } from '../../../../features/sales/queries';
import {
  CustomerInvoicesSearchSchema,
  type CustomerInvoicesSearch,
} from '../../../../features/sales/search-schemas';
import {
  invoiceStatusLabel,
  invoiceStatusTone,
  isInvoiceOverdue,
} from '../../../../features/sales/status';
import { sortingToParam, paramToSorting } from '../../../../shared/lib/sort-params';
import { buildDataGridLabels, buildFilterBarLabels } from '../../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/sales/invoices/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.salesRead),
  validateSearch: CustomerInvoicesSearchSchema,
  component: CustomerInvoicesPage,
});

const columnHelper = createDataGridColumnHelper<CustomerInvoiceView>();

function toListParams(search: CustomerInvoicesSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: { status: search.status },
  };
}

function CustomerInvoicesPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useCustomerInvoices(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('number', {
        header: t('sales.invoices.columns.number'),
        size: 160,
        cell: (info) => (
          <Link
            to="/sales/invoices/$invoiceId"
            params={{ invoiceId: info.row.original.id }}
            className="text-foreground hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('customerName', {
        header: t('sales.invoices.columns.customerName'),
        size: 220,
      }),
      columnHelper.accessor('status', {
        header: t('sales.invoices.columns.status'),
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          const overdue = isInvoiceOverdue(row.status, row.dueDate);
          return (
            <StatusBadge tone={overdue ? 'destructive' : invoiceStatusTone(row.status)}>
              {overdue ? t('sales.invoices.status.overdue') : invoiceStatusLabel(t, row.status)}
            </StatusBadge>
          );
        },
      }),
      columnHelper.accessor('issueDate', {
        header: t('sales.invoices.columns.issueDate'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('dueDate', {
        header: t('sales.invoices.columns.dueDate'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('grandTotal', {
        header: t('sales.invoices.columns.grandTotal'),
        size: 140,
        cell: (info) => <MoneyCell value={info.getValue()} />,
      }),
    ],
    [t],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('sales.invoices.columns.status'),
        type: 'enum-multiselect',
        options: CustomerInvoiceStatusSchema.options.map((status) => ({
          label: invoiceStatusLabel(t, status),
          value: status,
        })),
      },
    ],
    [t],
  );

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        configs={filterConfigs}
        values={{ status: search.status }}
        labels={filterBarLabels}
        onChange={(next) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, status: next.status }) })
        }
      />

      <DataGrid
        viewId="sales-invoices"
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        rowCount={data?.meta.total ?? 0}
        pagination={{ pageIndex: search.page - 1, pageSize: search.pageSize }}
        onPaginationChange={(updater) => {
          const current = { pageIndex: search.page - 1, pageSize: search.pageSize };
          const next = typeof updater === 'function' ? updater(current) : updater;
          void navigate({
            search: (prev) => ({ ...prev, page: next.pageIndex + 1, pageSize: next.pageSize }),
          });
        }}
        sorting={paramToSorting(search.sort)}
        onSortingChange={(updater) => {
          const current = paramToSorting(search.sort);
          const next = typeof updater === 'function' ? updater(current) : updater;
          void navigate({ search: (prev) => ({ ...prev, page: 1, sort: sortingToParam(next) }) });
        }}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyMessage={t('sales.invoices.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('sales.invoices.searchPlaceholder')}
        labels={dataGridLabels}
      />
    </div>
  );
}
