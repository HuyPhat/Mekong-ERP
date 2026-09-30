<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import BaseButton from './components/BaseButton.vue';
import ToastHost from './components/ToastHost.vue';
import { useI18n } from './i18n';
import { useLogout, useSession } from './queries';

const { t, lang, setLang } = useI18n();
const router = useRouter();
const { data: session } = useSession();
const logout = useLogout();
const user = computed(() => session.value?.user ?? null);

async function signOut(): Promise<void> {
  await logout.mutateAsync();
  await router.push({ name: 'login' });
}
</script>

<template>
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
  >
    {{ t('app.skipToContent') }}
  </a>
  <header
    class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3"
  >
    <div class="flex items-baseline gap-3">
      <span class="text-base font-semibold">Mekong ERP</span>
      <span class="text-sm text-muted-foreground">{{ t('app.title') }}</span>
    </div>
    <div class="flex items-center gap-3">
      <span v-if="user" class="text-sm" data-testid="signed-in-as">
        {{ user.name }} · {{ t(`role.${user.role}`) }}
      </span>
      <BaseButton
        size="sm"
        variant="outline"
        data-testid="language-toggle"
        :aria-label="t('app.switchLanguage')"
        @click="setLang(lang === 'vi' ? 'en' : 'vi')"
      >
        {{ lang === 'vi' ? 'EN' : 'VI' }}
      </BaseButton>
      <BaseButton v-if="user" size="sm" variant="outline" @click="signOut">{{
        t('app.logout')
      }}</BaseButton>
    </div>
  </header>
  <main id="main" tabindex="-1" class="mx-auto flex max-w-[110rem] flex-col gap-4 p-6">
    <RouterView />
  </main>
  <ToastHost />
</template>
