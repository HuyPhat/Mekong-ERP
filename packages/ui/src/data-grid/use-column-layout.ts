import { useCallback, useState } from 'react';
import type { ColumnLayout } from './types';

function storageKey(viewId: string): string {
  return `mekong-erp:grid-layout:${viewId}`;
}

function defaultLayout(): ColumnLayout {
  return {
    columnVisibility: {},
    columnOrder: [],
    columnPinning: { start: [], end: [] },
    density: 'comfortable',
  };
}

function readLayout(viewId: string): ColumnLayout {
  try {
    const raw = localStorage.getItem(storageKey(viewId));
    if (!raw) return defaultLayout();
    return { ...defaultLayout(), ...(JSON.parse(raw) as Partial<ColumnLayout>) };
  } catch {
    return defaultLayout();
  }
}

function writeLayout(viewId: string, layout: ColumnLayout): void {
  try {
    localStorage.setItem(storageKey(viewId), JSON.stringify(layout));
  } catch {
    // localStorage unavailable — layout just won't persist across reloads.
  }
}

export function useColumnLayout(viewId: string) {
  const [trackedViewId, setTrackedViewId] = useState(viewId);
  const [layout, setLayout] = useState<ColumnLayout>(() => readLayout(viewId));

  // Re-derive during render rather than in an effect: an effect would commit
  // the stale layout for one extra frame before correcting itself.
  if (viewId !== trackedViewId) {
    setTrackedViewId(viewId);
    setLayout(readLayout(viewId));
  }

  const update = useCallback(
    (patch: Partial<ColumnLayout>) => {
      setLayout((prev) => {
        const next = { ...prev, ...patch };
        writeLayout(viewId, next);
        return next;
      });
    },
    [viewId],
  );

  const reset = useCallback(() => {
    const next = defaultLayout();
    setLayout(next);
    writeLayout(viewId, next);
  }, [viewId]);

  return { layout, update, reset };
}
