const DB_NAME = 'mekong-erp';
const DB_VERSION = 2;
const STORE_NAMES = [
  'warehouses',
  'products',
  'stockLevels',
  'stockMovements',
  'suppliers',
  'purchaseOrders',
  'goodsReceipts',
  'vendorBills',
  'approvals',
  'approvalRules',
  'auditLogEntries',
  'journalEntries',
] as const;

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error as Error);
    };
  });
  return dbPromise;
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = run(store);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(request.error as Error);
        };
      }),
  );
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  return runTransaction<T[]>(storeName, 'readonly', (store) => store.getAll() as IDBRequest<T[]>);
}

export async function idbPut<T>(storeName: string, item: T): Promise<void> {
  await runTransaction(storeName, 'readwrite', (store) => store.put(item));
}

export async function idbBulkPut<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) store.put(item);
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error as Error);
    };
  });
}

export async function idbClear(storeName: string): Promise<void> {
  await runTransaction(storeName, 'readwrite', (store) => store.clear());
}
