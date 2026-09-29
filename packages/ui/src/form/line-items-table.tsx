import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/button';
import { cn } from '../lib/cn';

export interface LineItemsColumn {
  key: string;
  header: string;
  className?: string;
  align?: 'left' | 'right';
}

export interface LineItemRow {
  id: string;
}

export interface LineItemsTableLabels {
  addLine: string;
  removeLine: string;
  empty: string;
}

export const defaultLineItemsTableLabels: LineItemsTableLabels = {
  addLine: 'Add line',
  removeLine: 'Remove line',
  empty: 'No lines yet.',
};

// A layout shell for editable rows, deliberately not coupled to RHF's
// `useFieldArray`/`Control<T>` generics: the caller drives `useFieldArray`
// itself (so it keeps its own concrete field-value typing) and just hands
// this component the resulting `fields` array plus add/remove callbacks and
// a per-cell render prop.
export interface LineItemsTableProps<TRow extends LineItemRow> {
  columns: LineItemsColumn[];
  rows: TRow[];
  renderCell: (row: TRow, index: number, columnKey: string) => ReactNode;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  canRemoveRow?: (index: number) => boolean;
  footer?: ReactNode;
  labels?: LineItemsTableLabels;
  className?: string;
}

export function LineItemsTable<TRow extends LineItemRow>({
  columns,
  rows,
  renderCell,
  onAddRow,
  onRemoveRow,
  canRemoveRow,
  footer,
  labels = defaultLineItemsTableLabels,
  className,
}: LineItemsTableProps<TRow>) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 py-2 text-xs font-medium text-muted-foreground',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  {labels.empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 py-2 align-top',
                        column.align === 'right' ? 'text-right' : 'text-left',
                        column.className,
                      )}
                    >
                      {renderCell(row, index, column.key)}
                    </td>
                  ))}
                  <td className="px-3 py-2 align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        onRemoveRow(index);
                      }}
                      disabled={canRemoveRow ? !canRemoveRow(index) : false}
                      aria-label={labels.removeLine}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {footer !== undefined && <tfoot>{footer}</tfoot>}
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAddRow} className="self-start">
        <Plus className="h-4 w-4" />
        {labels.addLine}
      </Button>
    </div>
  );
}
