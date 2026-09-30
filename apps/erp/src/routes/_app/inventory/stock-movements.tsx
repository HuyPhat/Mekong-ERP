import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  createDataGridColumnHelper,
  NumberCell,
  FilterBar,
  exportCsv,
  exportXlsx,
  toast,
  type ColumnFilterConfig,
  type XlsxColumn,
} from '@mekong-erp/ui';
import { PERMISSIONS, MovementTypeSchema, type StockMovementView } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { useStockMovements } from '../../../features/inventory/queries';
import { StockMovementsSearchSchema } from '../../../features/inventory/search-schemas';
import { sortingToParam, paramToSorting } from '../../../shared/lib/sort-params';
import { formatDate } from '../../../shared/lib/format';
import { buildDataGridLabels, buildFilterBarLabels } from '../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/inventory/stock-movements')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.inventoryRead),
  validateSearch: StockMovementsSearchSchema,
  component: StockMovementsPage,
});

const columnHelper = createDataGridColumnHelper<StockMovementView>();

function StockMovementsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isLoading, isError, refetch } = useStockMovements();

  const typeLabels: Record<string, string> = {
    in: t('inventory.stockMovements.types.in'),
    out: t('inventory.stockMovements.types.out'),
    adjustment: t('inventory.stockMovements.types.adjustment'),
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('occurredAt', {
        header: t('inventory.stockMovements.columns.occurredAt'),
        size: 150,
        cell: (info) => formatDate(info.getValue()),
        sortFn: 'datetime',
      }),
      columnHelper.accessor('productSku', {
        header: t('inventory.products.columns.sku'),
        size: 110,
      }),
      columnHelper.accessor('productName', {
        header: t('inventory.products.columns.name'),
        size: 240,
      }),
      columnHelper.accessor('warehouseName', {
        header: t('inventory.stockLevels.columns.warehouse'),
        size: 160,
      }),
      columnHelper.accessor('type', {
        header: t('inventory.stockMovements.columns.type'),
        size: 110,
        cell: (info) => typeLabels[info.getValue()] ?? info.getValue(),
      }),
      columnHelper.accessor('quantity', {
        header: t('inventory.stockMovements.columns.quantity'),
        size: 110,
        cell: (info) => <NumberCell value={info.getValue()} />,
        sortFn: 'numeric',
      }),
      columnHelper.accessor('reference', {
        header: t('inventory.stockMovements.columns.reference'),
        size: 160,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- typeLabels is a plain object recreated every render from `t`; keying off `t` is sufficient
    [t],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'type',
        label: t('inventory.stockMovements.columns.type'),
        type: 'enum-multiselect',
        options: MovementTypeSchema.options.map((value) => ({
          label: typeLabels[value] ?? value,
          value,
        })),
      },
      {
        id: 'occurredAt',
        label: t('inventory.stockMovements.columns.occurredAt'),
        type: 'date-range',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- typeLabels is a plain object recreated every render from `t`; keying off `t` is sufficient
    [t],
  );

  const filterValues = {
    type: search.type,
    occurredAtFrom: search.occurredAtFrom,
    occurredAtTo: search.occurredAtTo,
  };

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);

  const filteredRows = useMemo(() => {
    const all = data?.data ?? [];
    const types = search.type?.split(',').filter(Boolean) ?? [];
    const q = search.q?.trim().toLowerCase();
    return all.filter((row) => {
      if (types.length > 0 && !types.includes(row.type)) return false;
      if (search.occurredAtFrom && row.occurredAt < search.occurredAtFrom) return false;
      if (search.occurredAtTo && row.occurredAt > `${search.occurredAtTo}T23:59:59.999Z`)
        return false;
      if (q && !`${row.productName} ${row.productSku} ${row.reference}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data, search.type, search.occurredAtFrom, search.occurredAtTo, search.q]);

  // One column list feeds both exports; `type` only matters to the XLSX cell format.
  function buildExportColumns(): XlsxColumn<StockMovementView>[] {
    return [
      {
        header: t('inventory.stockMovements.columns.occurredAt'),
        get: (row) => row.occurredAt,
        type: 'datetime',
      },
      { header: t('inventory.products.columns.sku'), get: (row) => row.productSku },
      { header: t('inventory.products.columns.name'), get: (row) => row.productName },
      { header: t('inventory.stockLevels.columns.warehouse'), get: (row) => row.warehouseName },
      { header: t('inventory.stockMovements.columns.type'), get: (row) => row.type },
      {
        header: t('inventory.stockMovements.columns.quantity'),
        get: (row) => row.quantity,
        type: 'integer',
      },
      { header: t('inventory.stockMovements.columns.reference'), get: (row) => row.reference },
    ];
  }

  function handleExportCsv() {
    exportCsv(filteredRows, buildExportColumns(), 'stock-movements.csv');
  }

  async function handleExportXlsx() {
    try {
      await exportXlsx(filteredRows, buildExportColumns(), 'stock-movements.xlsx', {
        sheetName: t('inventory.tabs.stockMovements'),
      });
    } catch {
      toast({ title: t('dataGrid.exportFailed'), variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        configs={filterConfigs}
        values={filterValues}
        labels={filterBarLabels}
        onChange={(next) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              type: next.type,
              occurredAtFrom: next.occurredAtFrom,
              occurredAtTo: next.occurredAtTo,
            }),
          })
        }
      />

      <DataGrid
        viewId="inventory-stock-movements"
        mode="client-virtualized"
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.id}
        rowCount={filteredRows.length}
        sorting={paramToSorting(search.sort)}
        onSortingChange={(updater) => {
          const current = paramToSorting(search.sort);
          const next = typeof updater === 'function' ? updater(current) : updater;
          void navigate({ search: (prev) => ({ ...prev, sort: sortingToParam(next) }) });
        }}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyMessage={t('inventory.stockMovements.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, q: value || undefined }) })
        }
        searchPlaceholder={t('inventory.stockMovements.searchPlaceholder')}
        onExportCsv={handleExportCsv}
        onExportXlsx={() => void handleExportXlsx()}
        labels={dataGridLabels}
      />
    </div>
  );
}
