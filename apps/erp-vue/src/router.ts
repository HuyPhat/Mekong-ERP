import { createRouter, createWebHistory } from 'vue-router';
import { PERMISSIONS, hasPermission } from '@mekong-erp/contract';
import { queryClient } from './query-client';
import { sessionQueryOptions } from './queries';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
    { path: '/', name: 'inbox', component: () => import('./views/InboxView.vue') },
    { path: '/:pathMatch(.*)*', redirect: { name: 'inbox' } },
  ],
});

// The inbox is for logins that decide approvals; everyone else is sent to choose one.
// (UX gating only, as everywhere in this project: nothing here is authorization.)
router.beforeEach(async (to) => {
  const session = await queryClient.ensureQueryData(sessionQueryOptions());
  const canDecide = hasPermission(session.user, PERMISSIONS.approvalsRead);
  if (to.name === 'login') return canDecide ? { name: 'inbox' } : true;
  return canDecide ? true : { name: 'login' };
});
