import type { SortingState } from '@tanstack/react-table';
import { parseSort } from '@mekong-erp/contract';

export function sortingToParam(sorting: SortingState): string | undefined {
  if (sorting.length === 0) return undefined;
  return sorting.map((entry) => `${entry.id}:${entry.desc ? 'desc' : 'asc'}`).join(',');
}

export function paramToSorting(sort: string | undefined): SortingState {
  if (!sort) return [];
  return parseSort(sort).map((entry) => ({ id: entry.field, desc: entry.direction === 'desc' }));
}
