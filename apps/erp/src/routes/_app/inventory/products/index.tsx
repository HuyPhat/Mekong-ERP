import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  DataGrid,
  createDataGridColumnHelper,
  MoneyCell,
  NumberCell,
  exportCsv,
  exportXlsx,
  toast,
  FilterBar,
  SavedViewsMenu,
  Button,
  type ColumnFilterConfig,
  type BulkAction,
  type BulkActionResult,
  type XlsxColumn,
} from '@mekong-erp/ui';
import {
  PERMISSIONS,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  fetchProducts,
  updateProduct,
  type Product,
  type ListParams,
} from '@mekong-erp/contract';
import { requirePermission } from '../../../../shared/permissions/guards';
import { Can } from '../../../../shared/permissions/can';
import { useCan } from '../../../../shared/permissions/use-can';
import { formatDate } from '../../../../shared/lib/format';
import { useProducts } from '../../../../features/inventory/queries';
import {
  ProductsSearchSchema,
  type ProductsSearch,
} from '../../../../features/inventory/search-schemas';
import { sortingToParam, paramToSorting } from '../../../../shared/lib/sort-params';
import { CsvImportDialog } from '../../../../features/inventory/csv-import-dialog';
import {
  buildDataGridLabels,
  buildFilterBarLabels,
  buildSavedViewsLabels,
} from '../../../../shared/lib/data-grid-labels';

export const Route = createFileRoute('/_app/inventory/products/')({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, PERMISSIONS.inventoryRead),
  validateSearch: ProductsSearchSchema,
  component: ProductsPage,
});

const columnHelper = createDataGridColumnHelper<Product>();

function toListParams(search: ProductsSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.q ? { q: search.q } : {}),
    filters: {
      category: search.category,
      unit: search.unit,
      priceMin: search.priceMin != null ? String(search.priceMin) : undefined,
      priceMax: search.priceMax != null ? String(search.priceMax) : undefined,
      createdFrom: search.createdFrom,
      createdTo: search.createdTo,
    },
  };
}

const BULK_REORDER_POINT = 100;

function ProductsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const canEdit = useCan(PERMISSIONS.inventoryWrite);
  const queryClient = useQueryClient();

  const params = useMemo(() => toListParams(search), [search]);
  const { data, isLoading, isError, refetch } = useProducts(params);

  const bulkActions: BulkAction<Product>[] = useMemo(
    () => [
      {
        id: 'set-reorder-point',
        label: t('inventory.products.bulk.setReorderPoint', { value: BULK_REORDER_POINT }),
        confirmMessage: t('inventory.products.bulk.confirmSetReorderPoint', {
          value: BULK_REORDER_POINT,
        }),
        run: async (rows): Promise<BulkActionResult> => {
          const outcomes = await Promise.allSettled(
            rows.map((row) => updateProduct(row.id, { reorderPoint: BULK_REORDER_POINT })),
          );
          const succeeded = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
          const failed = outcomes.length - succeeded;
          void queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
          return { succeeded, failed };
        },
      },
    ],
    [t, queryClient],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('sku', { header: t('inventory.products.columns.sku'), size: 110 }),
      columnHelper.accessor('name', {
        header: t('inventory.products.columns.name'),
        size: 280,
        cell: (info) => (
          <Link
            to="/inventory/products/$productId"
            params={{ productId: info.row.original.id }}
            className="text-foreground hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('category', {
        header: t('inventory.products.columns.category'),
        size: 160,
      }),
      columnHelper.accessor('unit', { header: t('inventory.products.columns.unit'), size: 90 }),
      columnHelper.accessor('costPrice', {
        header: t('inventory.products.columns.costPrice'),
        size: 130,
        cell: (info) => <MoneyCell value={info.getValue()} />,
      }),
      columnHelper.accessor('salePrice', {
        header: t('inventory.products.columns.salePrice'),
        size: 130,
        cell: (info) => <MoneyCell value={info.getValue()} />,
      }),
      columnHelper.accessor('reorderPoint', {
        header: t('inventory.products.columns.reorderPoint'),
        size: 110,
        cell: (info) => <NumberCell value={info.getValue()} />,
      }),
      columnHelper.accessor('createdAt', {
        header: t('inventory.products.columns.createdAt'),
        size: 120,
        cell: (info) => formatDate(info.getValue()),
      }),
    ],
    [t],
  );

  const filterConfigs: ColumnFilterConfig[] = useMemo(
    () => [
      {
        id: 'category',
        label: t('inventory.products.columns.category'),
        type: 'enum-multiselect',
        options: PRODUCT_CATEGORIES.map((category) => ({ label: category, value: category })),
      },
      {
        id: 'unit',
        label: t('inventory.products.columns.unit'),
        type: 'enum-multiselect',
        options: PRODUCT_UNITS.map((unit) => ({ label: unit, value: unit })),
      },
      { id: 'price', label: t('inventory.products.columns.salePrice'), type: 'number-range' },
      { id: 'created', label: t('inventory.products.columns.createdAt'), type: 'date-range' },
    ],
    [t],
  );

  const filterValues = {
    category: search.category,
    unit: search.unit,
    priceMin: search.priceMin != null ? String(search.priceMin) : undefined,
    priceMax: search.priceMax != null ? String(search.priceMax) : undefined,
    createdFrom: search.createdFrom,
    createdTo: search.createdTo,
  };

  const dataGridLabels = useMemo(() => buildDataGridLabels(t), [t]);
  const filterBarLabels = useMemo(() => buildFilterBarLabels(t), [t]);
  const savedViewsLabels = useMemo(() => buildSavedViewsLabels(t), [t]);

  // One column list feeds both exports; `type` only matters to the XLSX cell format.
  function buildExportColumns(): XlsxColumn<Product>[] {
    return [
      { header: t('inventory.products.columns.sku'), get: (row) => row.sku },
      { header: t('inventory.products.columns.name'), get: (row) => row.name },
      { header: t('inventory.products.columns.category'), get: (row) => row.category },
      { header: t('inventory.products.columns.unit'), get: (row) => row.unit },
      {
        header: t('inventory.products.columns.costPrice'),
        get: (row) => row.costPrice,
        type: 'money',
      },
      {
        header: t('inventory.products.columns.salePrice'),
        get: (row) => row.salePrice,
        type: 'money',
      },
      {
        header: t('inventory.products.columns.reorderPoint'),
        get: (row) => row.reorderPoint,
        type: 'integer',
      },
      {
        header: t('inventory.products.columns.createdAt'),
        get: (row) => row.createdAt,
        type: 'date',
      },
    ];
  }

  async function fetchAllProducts() {
    const all = await fetchProducts({ ...params, page: 1, pageSize: data?.meta.total ?? 10_000 });
    return all.data;
  }

  async function handleExportCsv() {
    exportCsv(await fetchAllProducts(), buildExportColumns(), 'products.csv');
  }

  async function handleExportXlsx() {
    try {
      await exportXlsx(await fetchAllProducts(), buildExportColumns(), 'products.xlsx', {
        sheetName: t('inventory.tabs.products'),
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
              page: 1,
              category: next.category,
              unit: next.unit,
              priceMin: next.priceMin ? Number(next.priceMin) : undefined,
              priceMax: next.priceMax ? Number(next.priceMax) : undefined,
              createdFrom: next.createdFrom,
              createdTo: next.createdTo,
            }),
          })
        }
      />

      <DataGrid
        viewId="inventory-products"
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row) => row.id}
        rowCount={data?.meta.total ?? 0}
        enableRowSelection={canEdit}
        bulkActions={bulkActions}
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
        emptyMessage={t('inventory.products.empty')}
        searchValue={search.q ?? ''}
        onSearchChange={(value) =>
          void navigate({ search: (prev) => ({ ...prev, page: 1, q: value || undefined }) })
        }
        searchPlaceholder={t('inventory.products.searchPlaceholder')}
        onExportCsv={() => void handleExportCsv()}
        onExportXlsx={() => void handleExportXlsx()}
        labels={dataGridLabels}
        toolbarExtra={
          <div className="flex items-center gap-2">
            <SavedViewsMenu<ProductsSearch>
              viewId="inventory-products"
              currentState={search}
              onApply={(state) => void navigate({ search: state })}
              labels={savedViewsLabels}
            />
            <Can permission={PERMISSIONS.inventoryWrite}>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                {t('inventory.products.import.trigger')}
              </Button>
            </Can>
          </div>
        }
      />

      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
