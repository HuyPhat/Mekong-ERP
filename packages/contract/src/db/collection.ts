import { idbBulkPut, idbClear, idbGetAll, idbPut } from './indexed-db';

interface Identified {
  id: string;
}

export class Collection<T extends Identified> {
  private items = new Map<string, T>();
  private loaded = false;

  constructor(private readonly storeName: string) {}

  /** Loads persisted rows into memory. Returns true if any existed. */
  async hydrate(): Promise<boolean> {
    if (this.loaded) return this.items.size > 0;
    const rows = await idbGetAll<T>(this.storeName);
    this.items = new Map(rows.map((row) => [row.id, row]));
    this.loaded = true;
    return rows.length > 0;
  }

  async seed(items: T[]): Promise<void> {
    this.items = new Map(items.map((item) => [item.id, item]));
    this.loaded = true;
    await idbBulkPut(this.storeName, items);
  }

  list(): T[] {
    return [...this.items.values()];
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  async put(item: T): Promise<void> {
    this.items.set(item.id, item);
    await idbPut(this.storeName, item);
  }

  async clear(): Promise<void> {
    this.items.clear();
    this.loaded = false;
    await idbClear(this.storeName);
  }
}
