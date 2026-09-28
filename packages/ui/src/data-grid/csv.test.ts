import { describe, expect, it } from 'vitest';
import { sanitizeCsvValue, validateImportRows } from './csv';

describe('sanitizeCsvValue', () => {
  it('passes ordinary text through unchanged', () => {
    expect(sanitizeCsvValue('Trà đào Mekong')).toBe('Trà đào Mekong');
  });

  it('renders null and undefined as an empty string', () => {
    expect(sanitizeCsvValue(null)).toBe('');
    expect(sanitizeCsvValue(undefined)).toBe('');
  });

  it('stringifies non-string values', () => {
    expect(sanitizeCsvValue(42)).toBe('42');
  });

  it.each(['=cmd', '+1+1', '-2+3', '@SUM(A1)'])(
    'prefixes a leading formula trigger with an apostrophe: %s',
    (value) => {
      expect(sanitizeCsvValue(value)).toBe(`'${value}`);
    },
  );

  it('does not flag a formula character that is not in the leading position', () => {
    expect(sanitizeCsvValue('SKU-00042=1')).toBe('SKU-00042=1');
  });
});

describe('validateImportRows', () => {
  it('numbers rows starting at 2 (accounting for the header row)', () => {
    const results = validateImportRows([{ a: '1' }, { a: '2' }], (raw) => ({ data: raw.a }));
    expect(results.map((row) => row.rowNumber)).toEqual([2, 3]);
  });

  it('carries parsed data through on success', () => {
    const results = validateImportRows([{ sku: 'SKU-1' }], (raw) => ({ data: raw.sku }));
    expect(results[0]).toMatchObject({ rowNumber: 2, data: 'SKU-1' });
    expect(results[0]?.errors).toBeUndefined();
  });

  it('carries validation errors through on failure', () => {
    const results = validateImportRows([{ sku: '' }], () => ({ errors: ['sku is required'] }));
    expect(results[0]).toMatchObject({ rowNumber: 2, errors: ['sku is required'] });
    expect(results[0]?.data).toBeUndefined();
  });

  it('keeps the raw row alongside the parsed outcome', () => {
    const raw = { sku: 'SKU-1', name: 'Widget' };
    const results = validateImportRows([raw], (row) => ({ data: row }));
    expect(results[0]?.raw).toEqual(raw);
  });
});
