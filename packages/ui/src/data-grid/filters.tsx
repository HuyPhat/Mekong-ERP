import { useId } from 'react';
import { X } from 'lucide-react';
import { Button } from '../components/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/dropdown-menu';

export type ColumnFilterType = 'text' | 'number-range' | 'date-range' | 'enum-multiselect';

export interface ColumnFilterOption {
  label: string;
  value: string;
}

export interface ColumnFilterConfig {
  id: string;
  label: string;
  type: ColumnFilterType;
  options?: ColumnFilterOption[];
}

export type FilterValues = Record<string, string | undefined>;

// packages/ui has no i18n setup of its own; callers in apps/erp pass real
// translations here, matching the pattern in ./types' DataGridLabels.
export interface FilterBarLabels {
  clearFilters: string;
  any: string;
  clearOption: string;
  minimumLabel: (label: string) => string;
  maximumLabel: (label: string) => string;
  selectedCount: (label: string, count: number) => string;
}

export const defaultFilterBarLabels: FilterBarLabels = {
  clearFilters: 'Clear filters',
  any: 'Any',
  clearOption: 'Clear',
  minimumLabel: (label) => `${label} minimum`,
  maximumLabel: (label) => `${label} maximum`,
  selectedCount: (label, count) => `${label} (${count})`,
};

function rangeKeys(id: string, type: 'number-range' | 'date-range'): [string, string] {
  return type === 'number-range' ? [`${id}Min`, `${id}Max`] : [`${id}From`, `${id}To`];
}

function isFilterActive(config: ColumnFilterConfig, values: FilterValues): boolean {
  if (config.type === 'number-range' || config.type === 'date-range') {
    const [minKey, maxKey] = rangeKeys(config.id, config.type);
    return Boolean(values[minKey] || values[maxKey]);
  }
  return Boolean(values[config.id]);
}

export function countActiveFilters(configs: ColumnFilterConfig[], values: FilterValues): number {
  return configs.filter((config) => isFilterActive(config, values)).length;
}

export interface FilterBarProps {
  configs: ColumnFilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  labels?: FilterBarLabels;
}

export function FilterBar({
  configs,
  values,
  onChange,
  labels = defaultFilterBarLabels,
}: FilterBarProps) {
  if (configs.length === 0) return null;

  const setValue = (key: string, value: string | undefined) => {
    onChange({ ...values, [key]: value || undefined });
  };

  const clearAll = () => {
    const cleared: FilterValues = { ...values };
    for (const config of configs) {
      if (config.type === 'number-range' || config.type === 'date-range') {
        const [minKey, maxKey] = rangeKeys(config.id, config.type);
        cleared[minKey] = undefined;
        cleared[maxKey] = undefined;
      } else {
        cleared[config.id] = undefined;
      }
    }
    onChange(cleared);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border bg-muted/30 p-2">
      {configs.map((config) => (
        <FilterControl
          key={config.id}
          config={config}
          values={values}
          onSetValue={setValue}
          labels={labels}
        />
      ))}
      {countActiveFilters(configs, values) > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="h-3 w-3" />
          {labels.clearFilters}
        </Button>
      )}
    </div>
  );
}

function FilterControl({
  config,
  values,
  onSetValue,
  labels,
}: {
  config: ColumnFilterConfig;
  values: FilterValues;
  onSetValue: (key: string, value: string | undefined) => void;
  labels: FilterBarLabels;
}) {
  const labelId = useId();
  const inputClassName =
    'h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent';

  if (config.type === 'text') {
    return (
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {config.label}
        <input
          name={config.id}
          value={values[config.id] ?? ''}
          onChange={(event) => onSetValue(config.id, event.target.value)}
          className={`${inputClassName} w-40`}
        />
      </label>
    );
  }

  if (config.type === 'number-range' || config.type === 'date-range') {
    const [minKey, maxKey] = rangeKeys(config.id, config.type);
    const inputType = config.type === 'number-range' ? 'number' : 'date';
    return (
      <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
        <span id={labelId} className="text-xs text-muted-foreground">
          {config.label}
        </span>
        <div className="flex items-center gap-1">
          <input
            type={inputType}
            name={minKey}
            value={values[minKey] ?? ''}
            onChange={(event) => onSetValue(minKey, event.target.value)}
            aria-label={labels.minimumLabel(config.label)}
            className={`${inputClassName} w-28`}
          />
          <span aria-hidden="true">–</span>
          <input
            type={inputType}
            name={maxKey}
            value={values[maxKey] ?? ''}
            onChange={(event) => onSetValue(maxKey, event.target.value)}
            aria-label={labels.maximumLabel(config.label)}
            className={`${inputClassName} w-28`}
          />
        </div>
      </div>
    );
  }

  const options = config.options ?? [];
  const selected = new Set((values[config.id] ?? '').split(',').filter(Boolean));
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
      <span id={labelId} className="text-xs text-muted-foreground">
        {config.label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            {selected.size > 0 ? labels.selectedCount(config.label, selected.size) : labels.any}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>{config.label}</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={(event) => {
                event.preventDefault();
                const next = new Set(selected);
                if (next.has(option.value)) next.delete(option.value);
                else next.add(option.value);
                onSetValue(config.id, next.size > 0 ? Array.from(next).join(',') : undefined);
              }}
            >
              <input
                type="checkbox"
                name={`${config.id}-${option.value}`}
                checked={selected.has(option.value)}
                readOnly
                className="mr-2"
              />
              {option.label}
            </DropdownMenuItem>
          ))}
          {selected.size > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onSetValue(config.id, undefined)}>
                {labels.clearOption}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
