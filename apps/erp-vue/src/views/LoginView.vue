<script setup lang="ts">
import { DEMO_USERS, PERMISSIONS, hasPermission } from '@mekong-erp/contract';
import { useRouter } from 'vue-router';
import { useI18n } from '../i18n';
import { useLogin } from '../queries';

const { t } = useI18n();
const router = useRouter();
const login = useLogin();

// The inbox is for the logins that decide approvals, so those are the ones listed.
const approvers = DEMO_USERS.filter((user) => hasPermission(user, PERMISSIONS.approvalsRead));

async function choose(userId: string): Promise<void> {
  await login.mutateAsync(userId);
  await router.push({ name: 'inbox' });
}
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col gap-4 pt-8">
    <h1 class="text-2xl font-semibold">{{ t('login.title') }}</h1>
    <p class="text-sm text-muted-foreground">{{ t('login.subtitle') }}</p>
    <ul class="flex flex-col gap-2">
      <li v-for="user in approvers" :key="user.id">
        <button
          type="button"
          class="flex w-full flex-col items-start rounded-md border border-border px-4 py-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          @click="choose(user.id)"
        >
          <span class="font-medium">{{ user.name }}</span>
          <span class="text-sm text-muted-foreground">{{ t(`role.${user.role}`) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
