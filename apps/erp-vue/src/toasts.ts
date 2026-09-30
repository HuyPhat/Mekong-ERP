import { readonly, ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'destructive';
}

const toasts = ref<Toast[]>([]);
let nextId = 1;

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

export function pushToast(message: string, tone: Toast['tone'] = 'default'): void {
  const id = nextId++;
  toasts.value = [...toasts.value, { id, message, tone }];
  setTimeout(() => dismissToast(id), 7000);
}

export function useToasts() {
  return { toasts: readonly(toasts), dismiss: dismissToast };
}
