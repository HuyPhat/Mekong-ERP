import { describe, expect, it } from 'vitest';
import { countActiveFilters, type ColumnFilterConfig } from './filters';

const configs: ColumnFilterConfig[] = [
  { id: 'category', label: 'Category', type: 'enum-multiselect', options: [] },
  { id: 'price', label: 'Price', type: 'number-range' },
  { id: 'created', label: 'Created', type: 'date-range' },
];

describe('countActiveFilters', () => {
  it('counts zero when no values are set', () => {
    expect(countActiveFilters(configs, {})).toBe(0);
  });

  it('counts a set enum-multiselect value', () => {
    expect(countActiveFilters(configs, { category: 'Bánh kẹo' })).toBe(1);
  });

  it('counts a number-range as active when only one bound is set', () => {
    expect(countActiveFilters(configs, { priceMin: '1000' })).toBe(1);
    expect(countActiveFilters(configs, { priceMax: '2000' })).toBe(1);
  });

  it('counts a date-range as active when only one bound is set', () => {
    expect(countActiveFilters(configs, { createdFrom: '2026-01-01' })).toBe(1);
  });

  it('does not double count a range filter with both bounds set', () => {
    expect(countActiveFilters(configs, { priceMin: '1000', priceMax: '2000' })).toBe(1);
  });

  it('counts multiple distinct active filters', () => {
    expect(countActiveFilters(configs, { category: 'Gia vị', priceMin: '1000' })).toBe(2);
  });

  it('ignores empty-string values', () => {
    expect(countActiveFilters(configs, { category: '' })).toBe(0);
  });
});
