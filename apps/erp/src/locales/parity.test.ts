import { describe, expect, it } from 'vitest';
import en from './en/common.json';
import vi from './vi/common.json';

// i18next picks a plural form by suffix, and languages differ in how many they
// need: English has `_one` and `_other`, Vietnamese only `_other`. Two locales are
// in step when they define the same keys once that suffix is ignored.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function entriesOf(value: unknown, prefix = ''): [string, unknown][] {
  if (typeof value !== 'object' || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) =>
    entriesOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

const keysOf = (locale: unknown) =>
  new Set(entriesOf(locale).map(([key]) => key.replace(PLURAL_SUFFIX, '')));

const emptyKeys = (locale: unknown) =>
  entriesOf(locale)
    .filter(([, text]) => text === '')
    .map(([key]) => key);

describe('locales', () => {
  const english = keysOf(en);
  const vietnamese = keysOf(vi);

  it('has every English key in Vietnamese', () => {
    expect([...english].filter((key) => !vietnamese.has(key))).toEqual([]);
  });

  it('has no Vietnamese key that English lacks', () => {
    expect([...vietnamese].filter((key) => !english.has(key))).toEqual([]);
  });

  it('has no empty strings', () => {
    expect(emptyKeys(en)).toEqual([]);
    expect(emptyKeys(vi)).toEqual([]);
  });
});
