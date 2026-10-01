<script setup lang="ts">
import { computed } from 'vue';
import type { ApprovalView, User } from '@mekong-erp/contract';
import { useI18n } from '../i18n';
import { canDecide, decidableSteps, isQueued } from '../logic/decisions';
import { formatDate, formatVnd } from '../logic/format';
import { roleLabel } from '../logic/labels';
import type { InboxSort } from '../logic/inbox-query';
import { approvalTone } from '../logic/tone';
import BaseButton from './BaseButton.vue';
import StatusBadge from './StatusBadge.vue';

type Decision = 'approved' | 'rejected' | 'changes_requested';

const props = defineProps<{
  steps: ApprovalView[];
  user: User | null;
  selected: ReadonlySet<string>;
  sort: InboxSort;
  openDocId: string | undefined;
  /** A decision is on its way: the buttons wait, so a step is never decided twice. */
  busy: boolean;
}>();
const emit = defineEmits<{
  toggle: [id: string];
  toggleAll: [];
  toggleSort: [];
  open: [step: ApprovalView];
  decide: [step: ApprovalView, decision: Decision];
}>();

const { t } = useI18n();

const decidable = computed(() => decidableSteps(props.user, props.steps));
const allSelected = computed(
  () => decidable.value.length > 0 && decidable.value.every((step) => props.selected.has(step.id)),
);
const someSelected = computed(() => !allSelected.value && props.selected.size > 0);

function amountText(step: ApprovalView): string {
  return step.unit === 'days' ? t('days', { count: step.amount }) : formatVnd(step.amount);
}
</script>

<template>
  <div
    role="region"
    :aria-label="t('app.title')"
    tabindex="0"
    class="overflow-x-auto rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
  >
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-muted text-left text-xs text-muted-foreground">
          <th class="w-10 px-3 py-2">
            <input
              type="checkbox"
              :aria-label="t('inbox.selectAll')"
              :checked="allSelected"
              :indeterminate.prop="someSelected"
              :disabled="decidable.length === 0"
              @change="emit('toggleAll')"
            />
          </th>
          <th scope="col" class="px-3 py-2">{{ t('inbox.columns.document') }}</th>
          <th scope="col" class="min-w-56 px-3 py-2">{{ t('inbox.columns.subject') }}</th>
          <th scope="col" class="px-3 py-2 text-right">{{ t('inbox.columns.amount') }}</th>
          <th scope="col" class="px-3 py-2">{{ t('inbox.columns.role') }}</th>
          <th
            scope="col"
            class="px-3 py-2"
            :aria-sort="props.sort === 'createdAt:asc' ? 'ascending' : 'descending'"
          >
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded font-medium hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              @click="emit('toggleSort')"
            >
              {{ t('inbox.columns.submitted') }}
              <span aria-hidden="true">{{ props.sort === 'createdAt:asc' ? '↑' : '↓' }}</span>
              <span class="sr-only">{{
                t(
                  props.sort === 'createdAt:asc'
                    ? 'inbox.sortOldestFirst'
                    : 'inbox.sortNewestFirst',
                )
              }}</span>
            </button>
          </th>
          <th scope="col" class="px-3 py-2">{{ t('inbox.columns.status') }}</th>
          <th scope="col" class="sticky right-0 border-l border-border bg-muted px-3 py-2">
            {{ t('inbox.columns.actions') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="step in props.steps"
          :key="step.id"
          :class="[
            'border-b border-border align-top last:border-0',
            // Painted, not transparent, so the pinned Actions cell can inherit it.
            step.docId === props.openDocId ? 'bg-muted' : 'bg-background',
          ]"
        >
          <td class="px-3 py-2">
            <input
              v-if="canDecide(props.user, step)"
              type="checkbox"
              :checked="props.selected.has(step.id)"
              :aria-label="t('inbox.selectRow', { number: step.docNumber })"
              @change="emit('toggle', step.id)"
            />
          </td>
          <td class="px-3 py-2">
            <button
              type="button"
              class="rounded text-left font-medium whitespace-nowrap underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              aria-controls="detail-panel"
              :aria-expanded="step.docId === props.openDocId"
              @click="emit('open', step)"
            >
              {{ step.docNumber }}
            </button>
            <span class="block text-xs text-muted-foreground">{{
              t(`docType.${step.docType}`)
            }}</span>
          </td>
          <td class="px-3 py-2">{{ step.subject }}</td>
          <td class="px-3 py-2 text-right whitespace-nowrap tabular-nums">
            {{ amountText(step) }}
          </td>
          <td class="px-3 py-2 whitespace-nowrap">{{ roleLabel(t, step.approverRole) }}</td>
          <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(step.createdAt) }}</td>
          <td class="px-3 py-2">
            <StatusBadge :tone="approvalTone(step.status)">{{
              t(`status.${step.status}`)
            }}</StatusBadge>
          </td>
          <td class="sticky right-0 border-l border-border bg-inherit px-3 py-2">
            <span
              v-if="isQueued(props.user, step)"
              class="text-xs whitespace-nowrap text-muted-foreground"
              >{{ t('inbox.waitingOnEarlier') }}</span
            >
            <div v-else-if="canDecide(props.user, step)" class="flex gap-1">
              <BaseButton
                size="sm"
                :disabled="props.busy"
                @click="emit('decide', step, 'approved')"
                >{{ t('action.approve') }}</BaseButton
              >
              <BaseButton
                size="sm"
                variant="outline"
                :disabled="props.busy"
                @click="emit('decide', step, 'changes_requested')"
                >{{ t('action.requestChanges') }}</BaseButton
              >
              <BaseButton
                size="sm"
                variant="destructive"
                :disabled="props.busy"
                @click="emit('decide', step, 'rejected')"
                >{{ t('action.reject') }}</BaseButton
              >
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
