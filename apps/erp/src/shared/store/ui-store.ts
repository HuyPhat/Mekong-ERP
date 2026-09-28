import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface UiState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: getInitialTheme(),
      setTheme: (theme) => {
        set({ theme });
      },
      toggleTheme: () => {
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
      },
      sidebarCollapsed: false,
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => {
        set({ commandPaletteOpen: open });
      },
    }),
    {
      name: 'mekong-erp:ui',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
