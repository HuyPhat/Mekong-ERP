import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { ensureSeeded } from '@mekong-erp/contract';
import { queryClient } from './app/query-client';
import { enableMocking } from './app/mocks';
import { SplashScreen } from './app/splash-screen';
import { routeTree } from './routeTree.gen';
import './app/i18n';
import './index.css';

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(<SplashScreen />);

// Seeding the mocked backend's demo dataset into IndexedDB is a one-time,
// multi-second cost on a fresh browser profile (hundreds of thousands of
// records across every module) — done here, up front and visibly, rather
// than silently inside whichever route's query happens to fire first.
void enableMocking()
  .then(() => ensureSeeded())
  .then(() => {
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    );
  });
