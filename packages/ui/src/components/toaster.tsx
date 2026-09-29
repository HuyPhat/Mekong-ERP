import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';
import { useToastStore } from './toast-store';

// Mount once near the app root. Anywhere else, call `toast({ title, ... })`
// from './toast-store' to enqueue a notification — no context/provider
// plumbing needed at the call site.
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, duration }) => (
        <Toast
          key={id}
          variant={variant}
          {...(duration !== undefined ? { duration } : {})}
          onOpenChange={(open) => {
            if (!open) dismiss(id);
          }}
        >
          <div className="flex flex-col gap-1">
            {title !== undefined && <ToastTitle>{title}</ToastTitle>}
            {description !== undefined && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
