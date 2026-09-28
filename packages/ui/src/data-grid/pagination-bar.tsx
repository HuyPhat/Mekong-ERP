import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../components/button';
import { defaultDataGridLabels, type DataGridLabels } from './types';

export interface PaginationBarProps {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  labels?: DataGridLabels;
}

export function PaginationBar({
  pageIndex,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  labels = defaultDataGridLabels,
}: PaginationBarProps) {
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{labels.rangeOfTotal(from, to, total)}</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 rounded-md border border-border bg-transparent px-1 text-sm"
          aria-label={labels.rowsPerPage}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(0)}
          aria-label={labels.firstPage}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(pageIndex - 1)}
          aria-label={labels.previousPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 tabular-nums">
          {labels.pageIndicator(pageCount === 0 ? 0 : pageIndex + 1, pageCount)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
          aria-label={labels.nextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageCount - 1)}
          aria-label={labels.lastPage}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
