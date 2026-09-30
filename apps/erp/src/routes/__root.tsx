import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  Outlet,
  Link,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@mekong-erp/ui';
import { ThemeEffect } from '../shared/theme/theme-effect';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function RootComponent() {
  return (
    <>
      <ThemeEffect />
      <Outlet />
      <Toaster />
    </>
  );
}

function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-center text-foreground">
      <h1 className="text-xl font-semibold">{t('errors.notFoundTitle')}</h1>
      <p className="text-muted-foreground">{t('errors.notFoundBody')}</p>
      <Link to="/" className="text-accent underline">
        {t('errors.backHome')}
      </Link>
    </main>
  );
}

function ErrorPage({ error }: ErrorComponentProps) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : String(error);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-center text-foreground">
      <h1 className="text-xl font-semibold">{t('errors.genericTitle')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
