import { useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

export interface WizardDraftState {
  hasDraft: boolean;
  draftSavedAt: string | null;
  resumeDraft: () => void;
  discardDraft: () => void;
}

export interface UseWizardDraftOptions {
  debounceMs?: number;
  enabled?: boolean;
}

interface StoredDraft<TFieldValues> {
  values: Partial<TFieldValues>;
  savedAt: string;
}

function draftStorageKey(key: string): string {
  return `mekong-erp:wizard-draft:${key}`;
}

function readDraft<TFieldValues>(storageKey: string): StoredDraft<TFieldValues> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredDraft<TFieldValues>) : null;
  } catch {
    return null;
  }
}

function writeDraft<TFieldValues>(storageKey: string, values: Partial<TFieldValues>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ values, savedAt: new Date().toISOString() }));
  } catch {
    // localStorage unavailable — the draft just won't survive a reload.
  }
}

function clearDraft(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

// Debounced autosave of in-progress wizard form state to localStorage, plus
// a one-shot "resume?" prompt read once at mount. This is draft convenience
// for an unsubmitted form, not entity data — it never touches IndexedDB.
export function useWizardDraft<TFieldValues extends FieldValues>(
  key: string,
  form: Pick<UseFormReturn<TFieldValues>, 'watch' | 'reset'>,
  options: UseWizardDraftOptions = {},
): WizardDraftState {
  const { debounceMs = 800, enabled = true } = options;
  const storageKey = draftStorageKey(key);

  const [stored, setStored] = useState<StoredDraft<TFieldValues> | null>(() =>
    readDraft<TFieldValues>(storageKey),
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return undefined;

    const subscription = form.watch((values) => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
      // RHF's watch callback hands back a work-in-progress, possibly-partial
      // snapshot on every keystroke — that partiality is exactly what a
      // mid-wizard draft is, so it's stored as-is and re-validated by Zod
      // like any other submission once the user actually submits.
      timeoutRef.current = setTimeout(() => {
        writeDraft<TFieldValues>(storageKey, values as Partial<TFieldValues>);
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, storageKey, debounceMs, enabled]);

  return {
    hasDraft: stored !== null,
    draftSavedAt: stored?.savedAt ?? null,
    resumeDraft: () => {
      if (stored) {
        form.reset(stored.values as TFieldValues);
      }
      setStored(null);
    },
    discardDraft: () => {
      clearDraft(storageKey);
      setStored(null);
    },
  };
}
