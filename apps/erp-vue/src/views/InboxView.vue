<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ApprovalDocTypeSchema,
  ApprovalStatusSchema,
  type ApprovalView,
} from '@mekong-erp/contract';
import BaseButton from '../components/BaseButton.vue';
import CommentDialog from '../components/CommentDialog.vue';
import DetailPanel from '../components/DetailPanel.vue';
import InboxTable from '../components/InboxTable.vue';
import { useI18n } from '../i18n';
import { classifyDecisionError, decidableSteps, summarizeBulk } from '../logic/decisions';
import {
  PAGE_SIZE,
  formatOpenDocument,
  parseInboxQuery,
  parseOpenDocument,
  serializeInboxQuery,
  toListParams,
  type InboxQuery,
} from '../logic/inbox-query';
import { useApprovals, useDecision, useSession } from '../queries';
import { pushToast } from '../toasts';

type Decision = 'approved' | 'rejected' | 'changes_requested';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { data: session } = useSession();
const user = computed(() => session.value?.user ?? null);

// What is on screen is a function of the address bar.
const query = computed(() => parseInboxQuery(route.query));
const listParams = computed(() => toListParams(query.value, user.value?.role));
const { data, isPending, isError, refetch } = useApprovals(listParams);
const decision = useDecision();

const steps = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.meta.total ?? 0);
const pages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));
const firstShown = computed(() => (total.value === 0 ? 0 : (query.value.page - 1) * PAGE_SIZE + 1));
const lastShown = computed(() => Math.min(total.value, query.value.page * PAGE_SIZE));
const decidable = computed(() => decidableSteps(user.value, steps.value));
const openDocument = computed(() => parseOpenDocument(query.value.open));

function update(
  patch: Partial<InboxQuery>,
  options: { replace?: boolean; keepPage?: boolean } = {},
) {
  const next: InboxQuery = {
    ...query.value,
    ...(options.keepPage ? {} : { page: 1 }),
    ...patch,
  };
  const navigate = options.replace ? router.replace : router.push;
  void navigate({ query: serializeInboxQuery(next) });
}

function valueOf(event: Event): string {
  return (event.target as HTMLSelectElement | HTMLInputElement).value;
}

// Typing in the search box waits for a pause before it goes to the URL and the server.
const searchText = ref(query.value.q);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchText, (text) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => update({ q: text.trim() }, { replace: true }), 300);
});
watch(
  () => query.value.q,
  (q) => {
    if (q !== searchText.value.trim()) searchText.value = q;
  },
);
onBeforeUnmount(() => clearTimeout(searchTimer));

// Selection is of rows on the current page: it never outlives them.
const selected = ref<ReadonlySet<string>>(new Set());
watch(steps, (rows) => {
  const visible = new Set(rows.map((row) => row.id));
  selected.value = new Set([...selected.value].filter((id) => visible.has(id)));
});

function toggle(id: string): void {
  const next = new Set(selected.value);
  if (!next.delete(id)) next.add(id);
  selected.value = next;
}

function toggleAll(): void {
  const everyone =
    decidable.value.length > 0 && decidable.value.every((s) => selected.value.has(s.id));
  selected.value = everyone ? new Set() : new Set(decidable.value.map((s) => s.id));
}

function failureText(error: unknown): string {
  const failure = classifyDecisionError(error);
  if (failure === 'own-request') return t('toast.ownRequest');
  if (failure === 'not-your-turn') return t('toast.notYourTurn');
  return t('toast.failed');
}

const DONE = {
  approved: 'toast.approved',
  rejected: 'toast.rejected',
  changes_requested: 'toast.changesRequested',
} as const;

async function decide(step: ApprovalView, outcome: Decision, comment?: string): Promise<boolean> {
  if (!user.value) return false;
  try {
    await decision.mutateAsync({
      id: step.id,
      decision: outcome,
      actorId: user.value.id,
      ...(comment ? { comment } : {}),
    });
    pushToast(t(DONE[outcome], { number: step.docNumber }));
    return true;
  } catch (error) {
    pushToast(failureText(error), 'destructive');
    return false;
  }
}

// Rejecting or asking for changes needs a comment; approving does not.
const commenting = ref<{ step: ApprovalView; kind: 'changes' | 'reject' } | null>(null);

function onDecide(step: ApprovalView, outcome: Decision): void {
  if (outcome === 'approved') {
    void decide(step, 'approved');
  } else {
    commenting.value = { step, kind: outcome === 'rejected' ? 'reject' : 'changes' };
  }
}

async function onComment(comment: string): Promise<void> {
  const pending = commenting.value;
  if (!pending) return;
  const outcome = pending.kind === 'reject' ? 'rejected' : 'changes_requested';
  if (await decide(pending.step, outcome, comment)) commenting.value = null;
}

async function approveSelected(): Promise<void> {
  const account = user.value;
  if (!account) return;
  const chosen = decidable.value.filter((step) => selected.value.has(step.id));
  const results = await Promise.allSettled(
    chosen.map((step) =>
      decision.mutateAsync({ id: step.id, decision: 'approved', actorId: account.id }),
    ),
  );
  const { succeeded, failed } = summarizeBulk(results);
  selected.value = new Set();
  if (failed === 0) {
    pushToast(t('toast.bulkDone', { succeeded, total: results.length }));
  } else {
    pushToast(t('toast.bulkPartial', { succeeded, failed }), 'destructive');
  }
}

function openStep(step: ApprovalView): void {
  const opened = openDocument.value?.docId === step.docId;
  update(
    { open: opened ? undefined : formatOpenDocument({ docType: step.docType, docId: step.docId }) },
    { keepPage: true },
  );
}

const emptyText = computed(() => {
  const q = query.value;
  const untouched = q.status === 'pending' && q.type === 'all' && q.q === '';
  return t(untouched ? 'inbox.emptyPending' : 'inbox.empty');
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">{{ t('app.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('app.tagline') }}</p>
    </div>

    <div class="flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1">
        <label for="filter-status" class="text-xs font-medium text-muted-foreground">{{
          t('filters.status')
        }}</label>
        <select
          id="filter-status"
          :value="query.status"
          class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          @change="update({ status: parseInboxQuery({ status: valueOf($event) }).status })"
        >
          <option value="all">{{ t('filters.allStatuses') }}</option>
          <option v-for="status in ApprovalStatusSchema.options" :key="status" :value="status">
            {{ t(`status.${status}`) }}
          </option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="filter-type" class="text-xs font-medium text-muted-foreground">{{
          t('filters.type')
        }}</label>
        <select
          id="filter-type"
          :value="query.type"
          class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          @change="update({ type: parseInboxQuery({ type: valueOf($event) }).type })"
        >
          <option value="all">{{ t('filters.allTypes') }}</option>
          <option v-for="type in ApprovalDocTypeSchema.options" :key="type" :value="type">
            {{ t(`docType.${type}`) }}
          </option>
        </select>
      </div>
      <div class="flex min-w-64 flex-col gap-1">
        <label for="filter-search" class="text-xs font-medium text-muted-foreground">{{
          t('filters.search')
        }}</label>
        <input
          id="filter-search"
          v-model="searchText"
          type="search"
          :placeholder="t('filters.searchPlaceholder')"
          class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        />
      </div>
    </div>

    <div
      v-if="selected.size > 0"
      role="toolbar"
      :aria-label="t('inbox.selected', { count: selected.size })"
      class="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted px-4 py-2 text-sm"
    >
      <span class="font-medium">{{ t('inbox.selected', { count: selected.size }) }}</span>
      <BaseButton size="sm" @click="approveSelected">{{ t('inbox.approveSelected') }}</BaseButton>
      <BaseButton size="sm" variant="ghost" @click="selected = new Set()">{{
        t('inbox.clearSelection')
      }}</BaseButton>
    </div>

    <div :class="['grid gap-4', openDocument ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : '']">
      <div class="flex min-w-0 flex-col gap-3">
        <p v-if="isPending" class="text-sm text-muted-foreground">{{ t('inbox.loading') }}</p>
        <div v-else-if="isError" class="flex items-center gap-3">
          <p class="text-sm font-medium text-destructive">{{ t('inbox.error') }}</p>
          <BaseButton size="sm" variant="outline" @click="refetch()">{{
            t('inbox.retry')
          }}</BaseButton>
        </div>
        <p v-else-if="steps.length === 0" class="text-sm text-muted-foreground">{{ emptyText }}</p>
        <template v-else>
          <InboxTable
            :steps="steps"
            :user="user"
            :selected="selected"
            :sort="query.sort"
            :open-doc-id="openDocument?.docId"
            :busy="decision.isPending.value"
            @toggle="toggle"
            @toggle-all="toggleAll"
            @toggle-sort="
              update({ sort: query.sort === 'createdAt:asc' ? 'createdAt:desc' : 'createdAt:asc' })
            "
            @open="openStep"
            @decide="onDecide"
          />
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span class="text-muted-foreground">{{
              t('inbox.range', { from: firstShown, to: lastShown, total })
            }}</span>
            <div class="flex items-center gap-2">
              <BaseButton
                size="sm"
                variant="outline"
                :disabled="query.page <= 1"
                @click="update({ page: query.page - 1 }, { keepPage: true })"
                >{{ t('inbox.previous') }}</BaseButton
              >
              <span>{{ t('inbox.pageOf', { page: query.page, pages }) }}</span>
              <BaseButton
                size="sm"
                variant="outline"
                :disabled="query.page >= pages"
                @click="update({ page: query.page + 1 }, { keepPage: true })"
                >{{ t('inbox.next') }}</BaseButton
              >
            </div>
          </div>
        </template>
      </div>

      <DetailPanel
        v-if="openDocument"
        :key="openDocument.docId"
        :document="openDocument"
        @close="update({ open: undefined }, { keepPage: true })"
      />
    </div>

    <CommentDialog
      :open="commenting !== null"
      :kind="commenting?.kind ?? 'changes'"
      :number="commenting?.step.docNumber ?? ''"
      :busy="decision.isPending.value"
      @submit="onComment"
      @cancel="commenting = null"
    />
  </div>
</template>
