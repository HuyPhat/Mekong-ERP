import { useState } from 'react';
import { Bookmark, Star, Trash2 } from 'lucide-react';
import { Button } from '../components/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/dropdown-menu';

export interface SavedView<T> {
  id: string;
  name: string;
  state: T;
}

function storageKey(viewId: string): string {
  return `mekong-erp:grid-views:${viewId}`;
}

function readViews<T>(viewId: string): SavedView<T>[] {
  try {
    const raw = localStorage.getItem(storageKey(viewId));
    return raw ? (JSON.parse(raw) as SavedView<T>[]) : [];
  } catch {
    return [];
  }
}

function writeViews<T>(viewId: string, views: SavedView<T>[]): void {
  try {
    localStorage.setItem(storageKey(viewId), JSON.stringify(views));
  } catch {
    // localStorage unavailable — saved views just won't persist across reloads.
  }
}

export function useSavedViews<T>(viewId: string) {
  const [views, setViews] = useState<SavedView<T>[]>(() => readViews<T>(viewId));

  const save = (name: string, state: T) => {
    const next = [...views, { id: crypto.randomUUID(), name, state }];
    setViews(next);
    writeViews(viewId, next);
  };

  const remove = (id: string) => {
    const next = views.filter((view) => view.id !== id);
    setViews(next);
    writeViews(viewId, next);
  };

  return { views, save, remove };
}

// packages/ui has no i18n setup of its own; callers in apps/erp pass real
// translations here, matching the pattern in ./types' DataGridLabels.
export interface SavedViewsLabels {
  viewsButton: string;
  savedViewsMenuLabel: string;
  noSavedViews: string;
  deleteView: (name: string) => string;
  saveCurrentView: string;
  namePrompt: string;
}

export const defaultSavedViewsLabels: SavedViewsLabels = {
  viewsButton: 'Views',
  savedViewsMenuLabel: 'Saved views',
  noSavedViews: 'No saved views yet.',
  deleteView: (name) => `Delete view ${name}`,
  saveCurrentView: 'Save current view…',
  namePrompt: 'Name this view',
};

export interface SavedViewsMenuProps<T> {
  viewId: string;
  currentState: T;
  onApply: (state: T) => void;
  labels?: SavedViewsLabels;
}

export function SavedViewsMenu<T>({
  viewId,
  currentState,
  onApply,
  labels = defaultSavedViewsLabels,
}: SavedViewsMenuProps<T>) {
  const { views, save, remove } = useSavedViews<T>(viewId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="h-4 w-4" />
          {labels.viewsButton}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{labels.savedViewsMenuLabel}</DropdownMenuLabel>
        {views.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{labels.noSavedViews}</div>
        )}
        {views.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onSelect={() => onApply(view.state)}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <Star className="h-3 w-3" />
              {view.name}
            </span>
            <button
              type="button"
              aria-label={labels.deleteView(view.name)}
              onClick={(event) => {
                event.stopPropagation();
                remove(view.id);
              }}
              className="rounded p-0.5 hover:bg-muted"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            const name = window.prompt(labels.namePrompt);
            if (name && name.trim()) save(name.trim(), currentState);
          }}
        >
          {labels.saveCurrentView}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
