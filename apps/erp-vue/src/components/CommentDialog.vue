<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useI18n } from '../i18n';
import BaseButton from './BaseButton.vue';

const props = defineProps<{
  open: boolean;
  kind: 'changes' | 'reject';
  number: string;
  busy: boolean;
}>();
const emit = defineEmits<{ submit: [comment: string]; cancel: [] }>();

const { t } = useI18n();
const dialog = ref<HTMLDialogElement | null>(null);
const field = ref<HTMLTextAreaElement | null>(null);
const comment = ref('');
const missing = ref(false);

// A native <dialog> opened with showModal() traps focus, makes the page behind it
// inert and closes on Escape, which is most of what an accessible modal needs.
watch(
  () => props.open,
  async (open) => {
    if (open) {
      comment.value = '';
      missing.value = false;
      dialog.value?.showModal();
      await nextTick();
      field.value?.focus();
    } else if (dialog.value?.open) {
      dialog.value.close();
    }
  },
);

function submit(): void {
  if (!comment.value.trim()) {
    missing.value = true;
    field.value?.focus();
    return;
  }
  emit('submit', comment.value.trim());
}
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="comment-dialog-title"
    class="m-auto w-[28rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-6 text-foreground shadow-lg backdrop:bg-black/50"
    @cancel.prevent="emit('cancel')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <h2 id="comment-dialog-title" class="text-lg font-semibold">
        {{
          t(props.kind === 'reject' ? 'dialog.rejectTitle' : 'dialog.changesTitle', {
            number: props.number,
          })
        }}
      </h2>
      <div class="flex flex-col gap-1">
        <label for="comment-field" class="text-sm font-medium">{{
          t('dialog.commentLabel')
        }}</label>
        <textarea
          id="comment-field"
          ref="field"
          v-model="comment"
          rows="4"
          :placeholder="t('dialog.commentPlaceholder')"
          :aria-invalid="missing"
          :aria-describedby="missing ? 'comment-error' : undefined"
          class="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        />
        <p v-if="missing" id="comment-error" class="text-sm font-medium text-destructive">
          {{ t('dialog.commentRequired') }}
        </p>
      </div>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" @click="emit('cancel')">{{ t('dialog.cancel') }}</BaseButton>
        <BaseButton type="submit" :disabled="props.busy">{{ t('dialog.submit') }}</BaseButton>
      </div>
    </form>
  </dialog>
</template>
