import { create } from 'zustand';

export type ToastVariant = 'default' | 'destructive';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastStoreState {
  toasts: ToastItem[];
  show: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  show: (options) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...options, id }] }));
    return id;
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
  },
}));

// Convenience wrapper so callers (mutation onSuccess/onError, event handlers,
// anywhere) can fire a toast without needing to be a component that calls
// the useToastStore hook themselves.
export function toast(options: ToastOptions): string {
  return useToastStore.getState().show(options);
}
