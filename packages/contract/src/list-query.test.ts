import { describe, expect, it } from 'vitest';
import {
  applySort,
  buildListQuery,
  matchesSearch,
  paginate,
  parseListParams,
  parseSort,
} from './list-query';

describe('parseSort', () => {
  it('returns an empty array for null or empty input', () => {
    expect(parseSort(null)).toEqual([]);
    expect(parseSort('')).toEqual([]);
  });

  it('parses a single field:direction pair', () => {
    expect(parseSort('name:desc')).toEqual([{ field: 'name', direction: 'desc' }]);
  });

  it('defaults to ascending when direction is missing or unrecognized', () => {
    expect(parseSort('name')).toEqual([{ field: 'name', direction: 'asc' }]);
    expect(parseSort('name:sideways')).toEqual([{ field: 'name', direction: 'asc' }]);
  });

  it('parses multiple comma-separated fields in order', () => {
    expect(parseSort('category:asc,salePrice:desc')).toEqual([
      { field: 'category', direction: 'asc' },
      { field: 'salePrice', direction: 'desc' },
    ]);
  });

  it('drops empty segments from stray commas', () => {
    expect(parseSort('name:asc,,category:desc')).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'category', direction: 'desc' },
    ]);
  });
});

describe('applySort', () => {
  const rows = [
    { id: '1', name: 'Banana', price: 20 },
    { id: '2', name: 'Apple', price: 30 },
    { id: '3', name: 'Cherry', price: 10 },
  ];

  it('returns the original order when there are no sort specs', () => {
    expect(applySort(rows, [])).toEqual(rows);
  });

  it('sorts ascending by a string field', () => {
    const sorted = applySort(rows, [{ field: 'name', direction: 'asc' }]);
    expect(sorted.map((row) => row.name)).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sorts descending by a numeric field', () => {
    const sorted = applySort(rows, [{ field: 'price', direction: 'desc' }]);
    expect(sorted.map((row) => row.price)).toEqual([30, 20, 10]);
  });

  it('does not mutate the input array', () => {
    const copy = [...rows];
    applySort(rows, [{ field: 'name', direction: 'asc' }]);
    expect(rows).toEqual(copy);
  });

  it('breaks ties using a secondary sort field', () => {
    const tied = [
      { group: 'a', order: 2 },
      { group: 'a', order: 1 },
      { group: 'b', order: 1 },
    ];
    const sorted = applySort(tied, [
      { field: 'group', direction: 'asc' },
      { field: 'order', direction: 'asc' },
    ]);
    expect(sorted).toEqual([
      { group: 'a', order: 1 },
      { group: 'a', order: 2 },
      { group: 'b', order: 1 },
    ]);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, index) => index + 1);

  it('slices the requested page', () => {
    const result = paginate(items, 2, 10);
    expect(result.data).toEqual(Array.from({ length: 10 }, (_, index) => index + 11));
    expect(result.meta).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 });
  });

  it('clamps a page number beyond the last page', () => {
    const result = paginate(items, 99, 10);
    expect(result.meta.page).toBe(3);
    expect(result.data).toEqual([21, 22, 23, 24, 25]);
  });

  it('clamps a page number below 1', () => {
    const result = paginate(items, 0, 10);
    expect(result.meta.page).toBe(1);
  });

  it('reports one total page for an empty collection', () => {
    const result = paginate([], 1, 10);
    expect(result).toEqual({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } });
  });
});

describe('matchesSearch', () => {
  const product = { name: 'Trà đào Mekong 500ml', sku: 'SKU-00042' };

  it('matches when the query is empty', () => {
    expect(matchesSearch(product, '', ['name', 'sku'])).toBe(true);
  });

  it('matches case-insensitively on any listed field', () => {
    expect(matchesSearch(product, 'mekong', ['name', 'sku'])).toBe(true);
    expect(matchesSearch(product, 'sku-00042', ['name', 'sku'])).toBe(true);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(matchesSearch(product, '  đào  ', ['name', 'sku'])).toBe(true);
  });

  it('returns false when no listed field contains the query', () => {
    expect(matchesSearch(product, 'nonexistent', ['name', 'sku'])).toBe(false);
  });
});

describe('parseListParams', () => {
  const defaults = [{ field: 'createdAt', direction: 'desc' as const }];

  it('falls back to page 1, size 50, the default sort and no query', () => {
    expect(parseListParams(new URL('http://x/api/things'), defaults)).toEqual({
      page: 1,
      pageSize: 50,
      sort: defaults,
      q: '',
    });
  });

  it('reads explicit params and prefers a requested sort over the default', () => {
    const url = new URL('http://x/api/things?page=3&pageSize=25&sort=name:asc&q=tea');
    expect(parseListParams(url, defaults)).toEqual({
      page: 3,
      pageSize: 25,
      sort: [{ field: 'name', direction: 'asc' }],
      q: 'tea',
    });
  });

  it('ignores non-numeric paging instead of producing NaN', () => {
    const parsed = parseListParams(new URL('http://x/api?page=abc&pageSize=zzz'), defaults);
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(50);
  });
});

describe('buildListQuery', () => {
  it('always sends page and pageSize', () => {
    expect(buildListQuery({ page: 2, pageSize: 10 })).toBe('page=2&pageSize=10');
  });

  it('adds sort, search and filter[...] params, skipping empty filters', () => {
    const query = buildListQuery({
      page: 1,
      pageSize: 50,
      sort: 'name:asc',
      q: 'tra xanh',
      filters: { status: 'approved', supplierId: undefined, category: '' },
    });
    const params = new URLSearchParams(query);
    expect(params.get('sort')).toBe('name:asc');
    expect(params.get('q')).toBe('tra xanh');
    expect(params.get('filter[status]')).toBe('approved');
    expect(params.has('filter[supplierId]')).toBe(false);
    expect(params.has('filter[category]')).toBe(false);
  });
});
