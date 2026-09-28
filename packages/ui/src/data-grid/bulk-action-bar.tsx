import { useState } from 'react';
import { Button } from '../components/button';
import {
  defaultDataGridLabels,
  type BulkAction,
  type BulkActionResult,
  type DataGridLabels,
} from './types';

export interface BulkActionBarProps<TData> {
  count: number;
  rows: TData[];
  actions: BulkAction<TData>[];
  onClear: () => void;
  labels?: DataGridLabels;
}

export function BulkActionBar<TData>({
  count,
  rows,
  actions,
  onClear,
  labels = defaultDataGridLabels,
}: BulkActionBarProps<TData>) {
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<{ actionId: string; result: BulkActionResult } | null>(null);

  if (count === 0) return null;

  async function runAction(action: BulkAction<TData>) {
    if (action.confirmMessage && !window.confirm(action.confirmMessage)) return;
    setPending(action.id);
    setResult(null);
    try {
      const outcome = await action.run(rows);
      setResult({ actionId: action.id, result: outcome });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-border bg-muted px-3 py-2 text-sm">
      <span className="font-medium">{labels.selectedCount(count)}</span>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant === 'destructive' ? 'destructive' : 'default'}
            disabled={pending !== null}
            onClick={() => void runAction(action)}
          >
            {pending === action.id ? labels.bulkActionWorking : action.label}
          </Button>
        ))}
      </div>
      {result && (
        <span className="text-muted-foreground">
          {labels.bulkActionResult(result.result.succeeded, result.result.failed)}
        </span>
      )}
      <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
        {labels.clearSelection}
      </Button>
    </div>
  );
}
