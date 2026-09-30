<script setup lang="ts">
import { useI18n } from '../i18n';
import { useToasts } from '../toasts';

const { t } = useI18n();
const { toasts, dismiss } = useToasts();
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    role="status"
    aria-live="polite"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-md',
        toast.tone === 'destructive'
          ? 'border-destructive bg-destructive text-destructive-foreground'
          : 'border-border bg-background text-foreground',
      ]"
    >
      <p class="flex-1">{{ toast.message }}</p>
      <button
        type="button"
        class="rounded px-1 leading-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        :aria-label="t('toast.dismiss')"
        @click="dismiss(toast.id)"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  </div>
</template>
