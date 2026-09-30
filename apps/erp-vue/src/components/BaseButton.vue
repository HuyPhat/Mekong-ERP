<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    size?: 'default' | 'sm';
    type?: 'button' | 'submit';
  }>(),
  { variant: 'default', size: 'default', type: 'button' },
);

// The same classes as the React Button in packages/ui, so the two apps look alike.
const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const VARIANTS = {
  default: 'bg-accent text-accent-foreground hover:opacity-90',
  outline: 'border border-border bg-transparent hover:bg-muted',
  ghost: 'bg-transparent hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
} as const;
const SIZES = { default: 'h-9 px-4 py-2', sm: 'h-8 px-3 text-xs' } as const;

const classes = computed(() => [BASE, VARIANTS[props.variant], SIZES[props.size]]);
</script>

<template>
  <button :type="props.type" :class="classes"><slot /></button>
</template>
