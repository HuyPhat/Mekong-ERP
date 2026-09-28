import { z } from 'zod';

export const ListMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type ListMeta = z.infer<typeof ListMetaSchema>;

export function listResponseSchema<Item extends z.ZodTypeAny>(item: Item) {
  return z.object({
    data: z.array(item),
    meta: ListMetaSchema,
  });
}

export interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}

export function parseSort(sort: string | null): SortSpec[] {
  if (!sort) return [];
  return sort
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): SortSpec => {
      const [field, direction] = part.split(':');
      return {
        field: field ?? '',
        direction: direction === 'desc' ? 'desc' : 'asc',
      };
    })
    .filter((entry) => entry.field.length > 0);
}

export function applySort<T>(items: T[], sorts: SortSpec[]): T[] {
  if (sorts.length === 0) return items;
  return [...items].sort((a, b) => {
    for (const { field, direction } of sorts) {
      const left = (a as Record<string, unknown>)[field];
      const right = (b as Record<string, unknown>)[field];
      const compared = compareValues(left, right);
      if (compared !== 0) return direction === 'asc' ? compared : -compared;
    }
    return 0;
  });
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { data: T[]; meta: ListMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page: safePage, pageSize, total, totalPages },
  };
}

export function matchesSearch<T>(item: T, query: string, fields: (keyof T)[]): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) =>
    String(item[field] ?? '')
      .toLowerCase()
      .includes(needle),
  );
}
