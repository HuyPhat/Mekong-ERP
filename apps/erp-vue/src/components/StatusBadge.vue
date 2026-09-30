<script setup lang="ts">
import { computed } from 'vue';
import type { Tone } from '../logic/tone';

const props = withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'neutral' });

const TONES: Record<Tone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  info: 'border-accent/30 bg-accent/10 text-accent',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  success: 'border-success/30 bg-success/10 text-success',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const classes = computed(() => [
  'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
  TONES[props.tone],
]);
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
