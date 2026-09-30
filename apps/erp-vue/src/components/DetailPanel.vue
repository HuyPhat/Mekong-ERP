<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../i18n';
import { formatDay, formatDate, formatVnd } from '../logic/format';
import { historyItems } from '../logic/history';
import type { OpenDocument } from '../logic/inbox-query';
import { documentTone } from '../logic/tone';
import { useApprovalHistory, useLeaveRequest, usePurchaseOrder } from '../queries';
import BaseButton from './BaseButton.vue';
import HistoryList from './HistoryList.vue';
import StatusBadge from './StatusBadge.vue';

const props = defineProps<{ document: OpenDocument }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

const isPurchaseOrder = computed(() => props.document.docType === 'purchase_order');
const purchaseOrder = usePurchaseOrder(() =>
  isPurchaseOrder.value ? props.document.docId : undefined,
);
const leave = useLeaveRequest(() => (isPurchaseOrder.value ? undefined : props.document.docId));
const approvals = useApprovalHistory(() => props.document.docId);

const failed = computed(() =>
  isPurchaseOrder.value ? purchaseOrder.isError.value : leave.isError.value,
);
const loading = computed(() =>
  isPurchaseOrder.value ? purchaseOrder.isPending.value : leave.isPending.value,
);
const history = computed(() => historyItems(approvals.data.value?.data ?? [], t));
</script>

<template>
  <section
    id="detail-panel"
    :aria-label="t(`docType.${props.document.docType}`)"
    class="flex flex-col gap-4 rounded-lg border border-border p-4"
  >
    <div class="flex items-start justify-between gap-2">
      <h2 class="text-lg font-semibold">
        {{
          purchaseOrder.data.value?.number ??
          leave.data.value?.number ??
          t(`docType.${props.document.docType}`)
        }}
      </h2>
      <BaseButton size="sm" variant="outline" @click="emit('close')">{{
        t('detail.close')
      }}</BaseButton>
    </div>

    <p v-if="loading" class="text-sm text-muted-foreground">{{ t('detail.loading') }}</p>
    <p v-else-if="failed" class="text-sm font-medium text-destructive">
      {{ t('detail.notFound') }}
    </p>

    <dl
      v-else-if="purchaseOrder.data.value"
      class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"
    >
      <dt class="text-muted-foreground">{{ t('detail.po.supplier') }}</dt>
      <dd>{{ purchaseOrder.data.value.supplierName }}</dd>
      <dt class="text-muted-foreground">{{ t('detail.po.status') }}</dt>
      <dd>
        <StatusBadge :tone="documentTone(purchaseOrder.data.value.status)">{{
          t(`docStatus.${purchaseOrder.data.value.status}`)
        }}</StatusBadge>
      </dd>
      <dt class="text-muted-foreground">{{ t('detail.po.deliveryDate') }}</dt>
      <dd>{{ formatDay(purchaseOrder.data.value.deliveryDate) }}</dd>
      <dt class="text-muted-foreground">{{ t('detail.po.terms') }}</dt>
      <dd>{{ purchaseOrder.data.value.terms }}</dd>
      <dt class="text-muted-foreground">{{ t('detail.po.lines') }}</dt>
      <dd>{{ t('lines', { count: purchaseOrder.data.value.lines.length }) }}</dd>
      <dt class="text-muted-foreground">{{ t('detail.po.total') }}</dt>
      <dd class="font-semibold tabular-nums">
        {{ formatVnd(purchaseOrder.data.value.grandTotal) }}
      </dd>
    </dl>

    <dl v-else-if="leave.data.value" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt class="text-muted-foreground">{{ t('detail.leave.employee') }}</dt>
      <dd>
        {{ leave.data.value.employeeName }}
        <span class="text-muted-foreground"> · {{ leave.data.value.employeeCode }}</span>
      </dd>
      <dt class="text-muted-foreground">{{ t('detail.leave.status') }}</dt>
      <dd>
        <StatusBadge :tone="documentTone(leave.data.value.status)">{{
          t(`docStatus.${leave.data.value.status}`)
        }}</StatusBadge>
      </dd>
      <dt class="text-muted-foreground">{{ t('detail.leave.type') }}</dt>
      <dd>{{ t(`leaveType.${leave.data.value.type}`) }}</dd>
      <dt class="text-muted-foreground">{{ t('detail.leave.dates') }}</dt>
      <dd>
        {{
          leave.data.value.startDate === leave.data.value.endDate
            ? formatDay(leave.data.value.startDate)
            : `${formatDay(leave.data.value.startDate)} – ${formatDay(leave.data.value.endDate)}`
        }}
      </dd>
      <dt class="text-muted-foreground">{{ t('detail.leave.days') }}</dt>
      <dd>{{ t('days', { count: leave.data.value.days }) }}</dd>
      <dt class="text-muted-foreground">{{ t('detail.leave.submitted') }}</dt>
      <dd>{{ formatDate(leave.data.value.submittedAt) }}</dd>
      <dt class="text-muted-foreground">{{ t('detail.leave.reason') }}</dt>
      <dd>{{ leave.data.value.reason }}</dd>
    </dl>

    <section class="flex flex-col gap-2">
      <h3 class="text-sm font-medium text-muted-foreground">{{ t('detail.history') }}</h3>
      <HistoryList :items="history" />
    </section>
  </section>
</template>
