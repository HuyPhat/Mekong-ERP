import { create } from 'zustand';

const FLASH_DURATION_MS = 1800;

interface RealtimeState {
  recentlyChangedIds: Set<string>;
  markChanged: (id: string) => void;
}

// Ephemeral, per-tab "just changed" markers driving the DataGrid row-flash
// effect — not persisted, and independent of the TanStack Query cache
// invalidation the same event also triggers.
export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  recentlyChangedIds: new Set(),
  markChanged: (id) => {
    set({ recentlyChangedIds: new Set(get().recentlyChangedIds).add(id) });
    setTimeout(() => {
      const next = new Set(get().recentlyChangedIds);
      next.delete(id);
      set({ recentlyChangedIds: next });
    }, FLASH_DURATION_MS);
  },
}));
