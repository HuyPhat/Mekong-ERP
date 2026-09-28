import { useEffect, useState, type ReactNode } from 'react';
import { Search, Download, Columns3, RotateCcw, Rows3, Rows2 } from 'lucide-react';
import { Button } from '../components/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../components/dropdown-menu';
import { defaultDataGridLabels, type DataGridLabels, type Density } from './types';

interface ToggleableColumn {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

export interface DataGridToolbarProps {
  searchValue?: string | undefined;
  onSearchChange?: ((value: string) => void) | undefined;
  searchPlaceholder?: string | undefined;
  toolbarExtra?: ReactNode | undefined;
  onExportCsv?: (() => void) | undefined;
  columns?: ToggleableColumn[] | undefined;
  density: Density;
  onDensityChange: (density: Density) => void;
  onResetLayout: () => void;
  labels?: DataGridLabels;
}

export function DataGridToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  toolbarExtra,
  onExportCsv,
  columns,
  density,
  onDensityChange,
  onResetLayout,
  labels = defaultDataGridLabels,
}: DataGridToolbarProps) {
  const [trackedSearchValue, setTrackedSearchValue] = useState(searchValue);
  const [localSearch, setLocalSearch] = useState(searchValue ?? '');

  // Re-derive during render (not in an effect) when the value changes upstream
  // (e.g. browser back/forward), so a keystroke never commits a stale frame first.
  if (searchValue !== trackedSearchValue) {
    setTrackedSearchValue(searchValue);
    setLocalSearch(searchValue ?? '');
  }

  useEffect(() => {
    if (!onSearchChange) return;
    const handle = setTimeout(() => {
      if (localSearch !== (searchValue ?? '')) onSearchChange(localSearch);
    }, 300);
    return () => {
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-debounce on local typing
  }, [localSearch]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
      {onSearchChange && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-8 w-56 rounded-md border border-border bg-transparent pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      )}

      {toolbarExtra}

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            density === 'compact'
              ? labels.switchToComfortableDensity
              : labels.switchToCompactDensity
          }
          onClick={() => onDensityChange(density === 'compact' ? 'comfortable' : 'compact')}
        >
          {density === 'compact' ? <Rows2 className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
        </Button>

        {columns && columns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={labels.chooseColumns}>
                <Columns3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{labels.columnsMenuLabel}</DropdownMenuLabel>
              {columns.map((column) => (
                <DropdownMenuItem
                  key={column.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    column.onToggle();
                  }}
                >
                  <input type="checkbox" checked={column.visible} readOnly className="mr-2" />
                  {column.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onResetLayout}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {labels.resetLayout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onExportCsv && (
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            <Download className="h-4 w-4" />
            {labels.exportCsv}
          </Button>
        )}
      </div>
    </div>
  );
}
