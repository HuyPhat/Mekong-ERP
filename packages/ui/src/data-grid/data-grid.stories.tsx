import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { MoneyCell, NumberCell } from './cells';
import { exportCsv } from './csv';
import { DataGrid } from './data-grid';
import { createDataGridColumnHelper, type BulkAction } from './types';
import { exportXlsx, type XlsxColumn } from './xlsx';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  reorderPoint: number;
}

const CATEGORIES = ['Đồ uống', 'Bánh kẹo', 'Gia vị', 'Mì gói', 'Sữa', 'Dầu ăn'];
const NAMES = ['Nước mắm', 'Trà xanh', 'Bánh quy', 'Mì gói', 'Sữa tươi', 'Dầu đậu nành'];

/** Deterministic, so every story (and its screenshot) shows the same rows. */
function makeProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, i) => {
    const cost = 8000 + ((i * 7919) % 90) * 1000;
    return {
      id: `p-${i + 1}`,
      sku: `SKU-${String(i + 1).padStart(5, '0')}`,
      name: `${NAMES[i % NAMES.length]} ${i + 1}`,
      category: CATEGORIES[i % CATEGORIES.length] ?? '',
      costPrice: cost,
      salePrice: Math.round(cost * 1.25),
      reorderPoint: 10 + ((i * 13) % 90),
    };
  });
}

const columnHelper = createDataGridColumnHelper<Product>();

const columns = [
  columnHelper.accessor('sku', { header: 'SKU', size: 110 }),
  columnHelper.accessor('name', { header: 'Name', size: 240 }),
  columnHelper.accessor('category', { header: 'Category', size: 140 }),
  columnHelper.accessor('costPrice', {
    header: 'Cost price',
    size: 130,
    cell: (info) => <MoneyCell value={info.getValue()} />,
  }),
  columnHelper.accessor('salePrice', {
    header: 'Sale price',
    size: 130,
    cell: (info) => <MoneyCell value={info.getValue()} />,
  }),
  columnHelper.accessor('reorderPoint', {
    header: 'Reorder point',
    size: 120,
    cell: (info) => <NumberCell value={info.getValue()} />,
  }),
];

const exportColumns: XlsxColumn<Product>[] = [
  { header: 'SKU', get: (row) => row.sku },
  { header: 'Name', get: (row) => row.name },
  { header: 'Category', get: (row) => row.category },
  { header: 'Cost price', get: (row) => row.costPrice, type: 'money' },
  { header: 'Sale price', get: (row) => row.salePrice, type: 'money' },
  { header: 'Reorder point', get: (row) => row.reorderPoint, type: 'integer' },
];

const bulkActions: BulkAction<Product>[] = [
  {
    id: 'reorder',
    label: 'Set reorder point to 50',
    run: (rows) => ({ succeeded: rows.length, failed: 0 }),
  },
  {
    id: 'archive',
    label: 'Archive',
    variant: 'destructive',
    confirmMessage: 'Archive the selected products?',
    // One deliberate failure, to show how partial results are reported.
    run: (rows) => ({ succeeded: Math.max(0, rows.length - 1), failed: Math.min(1, rows.length) }),
  },
];

interface ServerGridProps {
  total?: number;
  isLoading?: boolean;
  isError?: boolean;
  selectable?: boolean;
  exportable?: boolean;
}

/** Stands in for the server: the grid asks for a page and a sort, this answers. */
function ServerGrid({
  total = 250,
  isLoading = false,
  isError = false,
  selectable = false,
  exportable = false,
}: ServerGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const all = useMemo(() => makeProducts(total), [total]);

  const page = useMemo(() => {
    const sort = sorting[0];
    const sorted = sort
      ? [...all].sort((a, b) => {
          const left = a[sort.id as keyof Product];
          const right = b[sort.id as keyof Product];
          const order = left < right ? -1 : left > right ? 1 : 0;
          return sort.desc ? -order : order;
        })
      : all;
    const start = pagination.pageIndex * pagination.pageSize;
    return sorted.slice(start, start + pagination.pageSize);
  }, [all, sorting, pagination]);

  return (
    <div className="w-[960px]">
      <DataGrid<Product>
        viewId="story-server-grid"
        columns={columns}
        data={isLoading || isError ? [] : page}
        getRowId={(row) => row.id}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => undefined}
        emptyMessage="No products match these filters."
        searchPlaceholder="Search by name or SKU…"
        onSearchChange={() => undefined}
        enableRowSelection={selectable}
        {...(selectable ? { bulkActions } : {})}
        {...(exportable
          ? {
              onExportCsv: () => exportCsv(all, exportColumns, 'products.csv'),
              onExportXlsx: () => void exportXlsx(all, exportColumns, 'products.xlsx'),
            }
          : {})}
      />
    </div>
  );
}

function VirtualizedGrid({ rows = 10_000 }: { rows?: number }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const data = useMemo(() => makeProducts(rows), [rows]);
  return (
    <div className="h-[520px] w-[960px]">
      <DataGrid<Product>
        viewId="story-virtualized-grid"
        mode="client-virtualized"
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        rowCount={data.length}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  );
}

const meta = {
  title: 'Data/DataGrid',
  component: ServerGrid,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ServerGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Server mode: paging and sorting are requests, so it scales to any dataset. */
export const ServerMode: Story = {};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { total: 0 } };

export const ErrorWithRetry: Story = { args: { isError: true } };

/** Row selection reveals a bulk-action bar; the second action fails for one row on purpose. */
export const WithBulkActions: Story = { args: { selectable: true } };

/** Both exports come from one column list; the Excel file is built in a worker. */
export const WithExports: Story = { args: { exportable: true } };

/** 10,000 rows in memory, rendered virtually: scroll the grid, only visible rows are in the DOM. */
export const ClientVirtualized: Story = {
  render: () => <VirtualizedGrid />,
};
