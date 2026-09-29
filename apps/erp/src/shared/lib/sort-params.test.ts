import { describe, expect, it } from 'vitest';
import { paramToSorting, sortingToParam } from './sort-params';

describe('sortingToParam', () => {
  it('returns undefined for an empty sorting state', () => {
    expect(sortingToParam([])).toBeUndefined();
  });

  it('encodes a single ascending sort', () => {
    expect(sortingToParam([{ id: 'name', desc: false }])).toBe('name:asc');
  });

  it('encodes a single descending sort', () => {
    expect(sortingToParam([{ id: 'salePrice', desc: true }])).toBe('salePrice:desc');
  });

  it('encodes multiple sorts in order, comma-separated', () => {
    expect(
      sortingToParam([
        { id: 'category', desc: false },
        { id: 'salePrice', desc: true },
      ]),
    ).toBe('category:asc,salePrice:desc');
  });
});

describe('paramToSorting', () => {
  it('returns an empty array for undefined or empty input', () => {
    expect(paramToSorting(undefined)).toEqual([]);
    expect(paramToSorting('')).toEqual([]);
  });

  it('decodes a single field into SortingState', () => {
    expect(paramToSorting('name:asc')).toEqual([{ id: 'name', desc: false }]);
  });

  it('decodes multiple comma-separated fields', () => {
    expect(paramToSorting('category:asc,salePrice:desc')).toEqual([
      { id: 'category', desc: false },
      { id: 'salePrice', desc: true },
    ]);
  });

  it('round-trips through sortingToParam', () => {
    const original = [
      { id: 'category', desc: false },
      { id: 'salePrice', desc: true },
    ];
    expect(paramToSorting(sortingToParam(original))).toEqual(original);
  });
});
