import { createApp } from 'vue';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { ensureSeeded } from '@mekong-erp/contract';
import App from './App.vue';
import { router } from './router';
import { queryClient } from './query-client';
import './i18n';
import './style.css';

// The mocked backend runs in this page, so it has to be up, and seeded, before the
// first request. This app has its own origin, hence its own IndexedDB, and asks for
// the light profile: what an inbox reads, not the React app's 110,000 records.
async function start(): Promise<void> {
  const { worker } = await import('@mekong-erp/contract/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
  await ensureSeeded({ profile: 'light' });

  createApp(App).use(VueQueryPlugin, { queryClient }).use(router).mount('#app');
}

void start();
