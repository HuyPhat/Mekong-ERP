<script setup lang="ts">
import type { HistoryItem } from '../logic/history';
import type { Tone } from '../logic/tone';

defineProps<{ items: HistoryItem[] }>();

const DOTS: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-accent',
  warning: 'bg-warning',
  success: 'bg-success',
  destructive: 'bg-destructive',
};
</script>

<template>
  <ol class="flex flex-col">
    <li v-for="(item, index) in items" :key="item.id" class="relative flex gap-3 pb-6 last:pb-0">
      <span
        v-if="index < items.length - 1"
        aria-hidden="true"
        class="absolute top-3 left-[5px] h-full w-px bg-border"
      />
      <span
        aria-hidden="true"
        :class="[
          'relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-background',
          DOTS[item.tone],
        ]"
      />
      <div class="flex flex-1 flex-col gap-0.5">
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span class="text-sm font-medium text-foreground">{{ item.title }}</span>
          <span class="text-xs text-muted-foreground">{{ item.timestampLabel }}</span>
        </div>
        <p v-if="item.description !== undefined" class="text-sm text-muted-foreground">
          {{ item.description }}
        </p>
      </div>
    </li>
  </ol>
</template>
