import {
  tableFeatures,
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  createSortedRowModel,
  createPaginatedRowModel,
  sortFn_alphanumeric,
} from '@tanstack/react-table';

// Kept structural (not `Row<DataGridFeatures, ...>`) on purpose: these functions
// are inputs to building `dataGridFeatures` itself, so referencing the type
// derived from it here would be a circular type reference.
interface SortableRow {
  getValue(columnId: string): unknown;
}

function numericSort(rowA: SortableRow, rowB: SortableRow, columnId: string): number {
  return Number(rowA.getValue(columnId)) - Number(rowB.getValue(columnId));
}

function datetimeSort(rowA: SortableRow, rowB: SortableRow, columnId: string): number {
  return (
    new Date(String(rowA.getValue(columnId))).getTime() -
    new Date(String(rowB.getValue(columnId))).getTime()
  );
}

export const dataGridFeatures = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    numeric: numericSort,
    datetime: datetimeSort,
  },
});

export type DataGridFeatures = typeof dataGridFeatures;
