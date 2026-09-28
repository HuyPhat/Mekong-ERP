import { useRef, useState, type ReactNode } from 'react';
import {
  useTable,
  type SortingState,
  type PaginationState,
  type RowSelectionState,
  type OnChangeFn,
  type ColumnVisibilityState,
  type ColumnPinningState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUp, ArrowDown, ChevronsUpDown, AlertCircle, Inbox, PinOff, Pin } from 'lucide-react';
import { dataGridFeatures } from './features';
import {
  defaultDataGridLabels,
  type DataGridColumnDef,
  type BulkAction,
  type DataGridLabels,
  type Density,
} from './types';
import { useColumnLayout } from './use-column-layout';
import { Button } from '../components/button';
import { cn } from '../lib/cn';
import { DataGridToolbar } from './toolbar';
import { BulkActionBar } from './bulk-action-bar';
import { PaginationBar } from './pagination-bar';

const DENSITY_ROW_HEIGHT: Record<Density, number> = {
  compact: 32,
  comfortable: 44,
};

export interface DataGridProps<TData extends object> {
  viewId: string;
  columns: DataGridColumnDef<TData>[];
  data: TData[];
  getRowId: (row: TData) => string;
  rowCount: number;
  mode?: 'server' | 'client-virtualized';

  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;

  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  toolbarExtra?: ReactNode;
  onExportCsv?: () => void;

  enableRowSelection?: boolean;
  bulkActions?: BulkAction<TData>[];

  renderFooter?: (rows: TData[]) => ReactNode;
  labels?: DataGridLabels;
}

export function DataGrid<TData extends object>(props: DataGridProps<TData>) {
  const {
    viewId,
    columns,
    data,
    getRowId,
    rowCount,
    mode = 'server',
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    isLoading = false,
    isError = false,
    onRetry,
    emptyMessage = 'No results.',
    searchValue,
    onSearchChange,
    searchPlaceholder,
    toolbarExtra,
    onExportCsv,
    enableRowSelection = false,
    bulkActions,
    renderFooter,
    labels = defaultDataGridLabels,
  } = props;

  const { layout, update: updateLayout, reset: resetLayout } = useColumnLayout(viewId);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const isServerMode = mode === 'server';
  const effectivePagination = pagination ?? { pageIndex: 0, pageSize: Math.max(data.length, 1) };

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data,
    getRowId,
    state: {
      sorting,
      pagination: effectivePagination,
      rowSelection,
      columnVisibility: layout.columnVisibility as ColumnVisibilityState,
      columnOrder: layout.columnOrder,
      columnPinning: layout.columnPinning as ColumnPinningState,
    },
    onSortingChange,
    onPaginationChange: onPaginationChange ?? (() => undefined),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater(layout.columnVisibility as ColumnVisibilityState)
          : updater;
      updateLayout({ columnVisibility: next });
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === 'function' ? updater(layout.columnOrder) : updater;
      updateLayout({ columnOrder: next });
    },
    onColumnPinningChange: (updater) => {
      const current: ColumnPinningState = {
        start: layout.columnPinning.start,
        end: layout.columnPinning.end,
      };
      const next = typeof updater === 'function' ? updater(current) : updater;
      updateLayout({ columnPinning: { start: next.start ?? [], end: next.end ?? [] } });
    },
    manualSorting: isServerMode,
    manualPagination: isServerMode,
    ...(isServerMode ? { rowCount } : {}),
    enableRowSelection,
    columnResizeMode: 'onChange',
  });

  const rows =
    mode === 'client-virtualized' ? table.getSortedRowModel().rows : table.getRowModel().rows;

  const rowHeight = DENSITY_ROW_HEIGHT[layout.density];
  const virtualizer = useVirtualizer({
    count: mode === 'client-virtualized' ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  const toggleableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide())
    .map((column) => ({
      id: column.id,
      label: typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id,
      visible: column.getIsVisible(),
      onToggle: () => {
        column.toggleVisibility();
      },
    }));

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      <DataGridToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        toolbarExtra={toolbarExtra}
        onExportCsv={onExportCsv}
        columns={toggleableColumns}
        density={layout.density}
        onDensityChange={(density) => updateLayout({ density })}
        onResetLayout={resetLayout}
        labels={labels}
      />

      {enableRowSelection && bulkActions && bulkActions.length > 0 && (
        <BulkActionBar
          count={selectedRows.length}
          rows={selectedRows}
          actions={bulkActions}
          onClear={() => setRowSelection({})}
          labels={labels}
        />
      )}

      <div
        ref={scrollRef}
        className="relative max-h-[70vh] overflow-auto"
        role="region"
        aria-label="Data grid"
      >
        <table
          role="grid"
          className="w-full border-collapse text-sm"
          style={{ width: table.getTotalSize(), tableLayout: 'fixed' }}
        >
          <thead className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {enableRowSelection && (
                  <th className="w-10 border-b border-border p-2">
                    <input
                      type="checkbox"
                      checked={table.getIsAllRowsSelected()}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
                      }}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                      aria-label={labels.selectAllRows}
                    />
                  </th>
                )}
                {headerGroup.headers.map((header) => {
                  const pinned = header.column.getIsPinned();
                  const sortDirection = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'relative select-none border-b border-border bg-background p-2 text-left font-medium',
                        pinned && 'sticky z-20 bg-background',
                      )}
                      style={{
                        width: header.getSize(),
                        insetInlineStart:
                          pinned === 'start' ? `${header.column.getStart('start')}px` : undefined,
                        insetInlineEnd:
                          pinned === 'end' ? `${header.column.getAfter('end')}px` : undefined,
                      }}
                      aria-sort={
                        sortDirection === 'asc'
                          ? 'ascending'
                          : sortDirection === 'desc'
                            ? 'descending'
                            : 'none'
                      }
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            className={cn(
                              'flex items-center gap-1',
                              header.column.getCanSort() && 'cursor-pointer hover:text-accent',
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                            disabled={!header.column.getCanSort()}
                          >
                            <table.FlexRender header={header} />
                            {header.column.getCanSort() &&
                              (sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : sortDirection === 'desc' ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              ))}
                          </button>
                        )}
                        {header.column.getCanPin() && (
                          <button
                            type="button"
                            className="ml-auto opacity-0 hover:opacity-100 group-hover:opacity-100"
                            onClick={() => header.column.pin(pinned === 'start' ? false : 'start')}
                            aria-label={pinned ? labels.unpinColumn : labels.pinColumn}
                          >
                            {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                      {header.column.getCanResize() && (
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- ARIA APG focusable-separator pattern; jsx-a11y's role table doesn't special-case it
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={labels.resizeColumn(header.column.id)}
                          aria-valuenow={header.column.getSize()}
                          aria-valuemin={header.column.columnDef.minSize ?? 20}
                          aria-valuemax={header.column.columnDef.maxSize ?? 800}
                          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- ARIA APG focusable-separator pattern; jsx-a11y's role table doesn't special-case it
                          tabIndex={0}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onKeyDown={(event) => {
                            const step = event.shiftKey ? 32 : 8;
                            if (event.key === 'ArrowLeft') {
                              event.preventDefault();
                              table.setColumnSizing((prev) => ({
                                ...prev,
                                [header.column.id]: Math.max(
                                  header.column.columnDef.minSize ?? 20,
                                  header.column.getSize() - step,
                                ),
                              }));
                            } else if (event.key === 'ArrowRight') {
                              event.preventDefault();
                              table.setColumnSizing((prev) => ({
                                ...prev,
                                [header.column.id]: header.column.getSize() + step,
                              }));
                            }
                          }}
                          className="absolute inset-y-0 right-0 w-1 cursor-col-resize touch-none select-none hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {isLoading ? (
            <tbody>
              {Array.from({ length: 8 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={columns.length + (enableRowSelection ? 1 : 0)} className="p-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          ) : isError ? (
            <tbody>
              <tr>
                <td
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  className="p-8 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-6 w-6" />
                    <span>Something went wrong loading this data.</span>
                    {onRetry && (
                      <Button size="sm" variant="outline" onClick={onRetry}>
                        Retry
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          ) : rows.length === 0 ? (
            <tbody>
              <tr>
                <td
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  className="p-8 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-6 w-6" />
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : mode === 'client-virtualized' ? (
            <tbody
              // A <tbody> forced to display:block loses the table's width (a
              // longstanding browser quirk — it shrink-wraps instead of
              // stretching), so every absolutely-positioned flex row below
              // collapses and its cells overlap. Set the width explicitly.
              style={{
                height: virtualizer.getTotalSize(),
                width: table.getTotalSize(),
                position: 'relative',
                display: 'block',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="absolute left-0 flex w-full border-b border-border hover:bg-muted"
                    style={{ transform: `translateY(${virtualRow.start}px)`, height: rowHeight }}
                  >
                    {enableRowSelection && (
                      <td className="flex w-10 items-center p-2">
                        <input
                          type="checkbox"
                          checked={row.getIsSelected()}
                          onChange={row.getToggleSelectedHandler()}
                          aria-label={labels.selectRow}
                        />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="flex items-center overflow-hidden p-2"
                        style={{ width: cell.column.getSize() }}
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ) : (
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border hover:bg-muted',
                    row.getIsSelected() && 'bg-muted',
                  )}
                  style={{ height: rowHeight }}
                >
                  {enableRowSelection && (
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        aria-label={labels.selectRow}
                      />
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => {
                    const pinned = cell.column.getIsPinned();
                    return (
                      <td
                        key={cell.id}
                        className={cn('overflow-hidden p-2', pinned && 'sticky z-10 bg-background')}
                        style={{
                          width: cell.column.getSize(),
                          insetInlineStart:
                            pinned === 'start' ? `${cell.column.getStart('start')}px` : undefined,
                          insetInlineEnd:
                            pinned === 'end' ? `${cell.column.getAfter('end')}px` : undefined,
                        }}
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          )}

          {renderFooter && rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-background font-medium">
              <tr>
                {enableRowSelection && <td className="border-t border-border p-2" />}
                <td colSpan={columns.length} className="border-t border-border p-0">
                  {renderFooter(rows.map((row) => row.original))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isServerMode && pagination && onPaginationChange && (
        <PaginationBar
          pageIndex={pagination.pageIndex}
          pageCount={table.getPageCount()}
          pageSize={pagination.pageSize}
          total={rowCount}
          onPageChange={(pageIndex) => onPaginationChange({ ...pagination, pageIndex })}
          onPageSizeChange={(pageSize) => onPaginationChange({ pageIndex: 0, pageSize })}
          labels={labels}
        />
      )}
    </div>
  );
}
