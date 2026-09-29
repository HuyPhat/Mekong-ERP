import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  createDataGridColumnHelper,
  NumberCell,
  FilterBar,
  SavedViewsMenu,
  type ColumnFilterConfig,
} from '@mekong-erp/ui';
import { PERMISSIONS, type ListParams, type StockLevelView } from '@mekong-erp/contract';
import { requirePermission } from '../../../shared/permissions/guards';
import { useStockLevels, useWarehouses } from '../../../features/inventory/queries';
import {
  StockLevelsSearchSchema,
  type StockLevelsSearch,
} from '../../../features/inventory/search-schemas';
import { sortingToParam, paramToSorting } from '../../../shared/lib/sort-params';
import { formatNumber } from '../../../shared/lib/format';
import {
  buildDataGridLabels,
  buildFilterBarLabels,
  buildSavedViewsLabels,
} from '../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/inventory/stock-levels')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.inventoryRead),
  validateSearch: StockLevelsSearchSchema,
  component: StockLevelsPage,
});

const columnHelper = createDataGridColumnHelper<StockLevelView>();

function toListParams(search: StockLevelsSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: {
      warehouseId: search.warehouseId,
      qtyMin: search.qtyMin != null ? String(search.qtyMin) : undefined,
      qtyMax: search.qtyMax != null ? String(search.qtyMax) : undefined,
    },
  };
}

function StockLevelsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: warehouses } = useWarehouses();

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useStockLevels(params);

  const columns = useMemo(
    () => [
      columnHelper.accessor('productSku', {
        header: t('inventory.products.columns.sku'),
        size: 110,
      }),
      columnHelper.accessor('productName', {
        header: t('inventory.products.columns.name'),
        size: 280,
      }),
      columnHelper.accessor('warehouseName', {
        header: t('inventory.stockLevels.columns.warehouse'),
        size: 180,
      }),
      columnHelper.accessor('quantityOnHand', {
        header: t('inventory.stockLevels.columns.quantityOnHand'),
        size: 130,
        cell: (info) => <NumberCell value={info.getValue()} />,
      }),
      columnHelper.accessor('reorderPoint', {
        header: t('inventory.stockLevels.columns.reorderPoint'),
        size: 130,
        cell: (info) => <NumberCell value={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'status',
        header: t('inventory.stockLevels.columns.status'),
        size: 140,
        cell: ({ row }) =>
          row.original.quantityOnHand <= row.original.reorderPoint ? (
            <span className="text-destructive">{t('inventory.stockLevels.belowReorder')}</span>
          ) : (
            <span className="text-muted-foreground">{t('inventory.stockLevels.ok')}</span>
          ),
      }),
    ],
    [t],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'warehouseId',
        label: t('inventory.stockLevels.columns.warehouse'),
        type: 'enum-multiselect',
        options: (warehouses?.data ?? []).map((warehouse) => ({
          label: warehouse.name,
          value: warehouse.id,
        })),
      },
      { id: 'qty', label: t('inventory.stockLevels.columns.quantityOnHand'), type: 'number-range' },
    ],
    [t, warehouses],
  );

  const filterValues = {
    warehouseId: search.warehouseId,
    qtyMin: search.qtyMin != null ? String(search.qtyMin) : undefined,
    qtyMax: search.qtyMax != null ? String(search.qtyMax) : undefined,
  };

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);
  const savedViewsLabels = useMemo(() => buildSavedViewsLabels(t), [t]);

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
              page: 1,
              warehouseId: next.warehouseId,
              qtyMin: next.qtyMin ? Number(next.qtyMin) : undefined,
              qtyMax: next.qtyMax ? Number(next.qtyMax) : undefined,
            }),
          })
        }
      />

      <DataGrid
        viewId="inventory-stock-levels"
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
        emptyMessage={t('inventory.stockLevels.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('inventory.stockLevels.searchPlaceholder')}
        labels={dataGridLabels}
        toolbarExtra={
          <SavedViewsMenu<StockLevelsSearch>
            viewId="inventory-stock-levels"
            currentState={search}
            onApply={(state) => void navigate({ search: state })}
            labels={savedViewsLabels}
          />
        }
        renderFooter={(rows) => (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
            {t('inventory.stockLevels.pageTotal', {
              total: formatNumber(rows.reduce((sum, row) => sum + row.quantityOnHand, 0)),
            })}
          </div>
        )}
      />
    </div>
  );
}
