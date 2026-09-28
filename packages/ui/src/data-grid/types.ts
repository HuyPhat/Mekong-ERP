import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import type { DataGridFeatures } from './features';

// `any` (not `unknown`) for TValue is deliberate: a column array mixes many
// per-column value types (string, number, ...), and ColumnDefTemplate's
// contravariant render-prop functions make a `ColumnDef<...,unknown>[]`
// reject any array of concretely-typed columns. This is TanStack Table's own
// pattern for the `columns` option, not a shortcut around real typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
export type DataGridColumnDef<TData extends object> = ColumnDef<DataGridFeatures, TData, any>;

export function createDataGridColumnHelper<TData extends object>() {
  return createColumnHelper<DataGridFeatures, TData>();
}

export type Density = 'compact' | 'comfortable';

export interface BulkActionResult {
  succeeded: number;
  failed: number;
  errors?: string[];
}

export interface BulkAction<TData> {
  id: string;
  label: string;
  run: (rows: TData[]) => Promise<BulkActionResult> | BulkActionResult;
  variant?: 'default' | 'destructive';
  confirmMessage?: string;
}

export interface ColumnLayout {
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnPinning: { start: string[]; end: string[] };
  density: Density;
}

// Visible chrome text for DataGrid's pagination bar and bulk-action bar.
// packages/ui has no i18n setup of its own (it stays reusable across future
// consumers), so callers in apps/erp pass real translations here; these
// English defaults only cover a caller that doesn't.
export interface DataGridLabels {
  resetLayout: string;
  rowsPerPage: string;
  rangeOfTotal: (from: number, to: number, total: number) => string;
  pageIndicator: (page: number, pageCount: number) => string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
  selectedCount: (count: number) => string;
  clearSelection: string;
  bulkActionWorking: string;
  bulkActionResult: (succeeded: number, failed: number) => string;
  chooseColumns: string;
  columnsMenuLabel: string;
  switchToCompactDensity: string;
  switchToComfortableDensity: string;
  exportCsv: string;
  selectAllRows: string;
  selectRow: string;
  pinColumn: string;
  unpinColumn: string;
  resizeColumn: (columnId: string) => string;
}

export const defaultDataGridLabels: DataGridLabels = {
  resetLayout: 'Reset layout',
  rowsPerPage: 'Rows per page',
  rangeOfTotal: (from, to, total) => `${from}–${to} of ${total}`,
  pageIndicator: (page, pageCount) => `Page ${page} / ${pageCount}`,
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  selectedCount: (count) => `${count} selected`,
  clearSelection: 'Clear selection',
  bulkActionWorking: 'Working…',
  bulkActionResult: (succeeded, failed) =>
    `${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}`,
  chooseColumns: 'Choose columns',
  columnsMenuLabel: 'Columns',
  switchToCompactDensity: 'Compact density',
  switchToComfortableDensity: 'Comfortable density',
  exportCsv: 'Export CSV',
  selectAllRows: 'Select all rows',
  selectRow: 'Select row',
  pinColumn: 'Pin column',
  unpinColumn: 'Unpin column',
  resizeColumn: (columnId) => `Resize column ${columnId}`,
};
