import { describe, expect, it } from 'vitest';
import { en, vi } from './messages';

// English has `_one` and `_other`, Vietnamese only `_other`; the languages agree when
// they define the same messages once that suffix is ignored.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const bare = (key: string) => key.replace(PLURAL_SUFFIX, '');
const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

const english: Record<string, string> = en;
const englishKeys = new Set(Object.keys(english).map(bare));
const vietnameseKeys = new Set(Object.keys(vi).map(bare));

describe('messages', () => {
  it('has every English message in Vietnamese', () => {
    expect([...englishKeys].filter((key) => !vietnameseKeys.has(key))).toEqual([]);
  });

  it('has no Vietnamese message that English lacks', () => {
    expect([...vietnameseKeys].filter((key) => !englishKeys.has(key))).toEqual([]);
  });

  it('gives each message the same placeholders in both languages', () => {
    const mismatched = Object.entries(vi)
      .filter(([key]) => english[key] !== undefined || english[`${bare(key)}_other`] !== undefined)
      .filter(([key, text]) => {
        const reference = english[key] ?? english[`${bare(key)}_other`] ?? '';
        return placeholders(reference).join() !== placeholders(text).join();
      })
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it('has no empty message', () => {
    expect(Object.entries(english).filter(([, text]) => text === '')).toEqual([]);
    expect(Object.entries(vi).filter(([, text]) => text === '')).toEqual([]);
  });
});
