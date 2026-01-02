import { DB_NAME, DB_VERSION, StoreName, upgradeDb } from "./schema";

let dbPromise: Promise<IDBDatabase> | null = null;

type ListOptions = {
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
};

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const txDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

export const openDb = () => {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("indexedDB is not available in this environment."),
    );
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const tx = req.transaction;
      if (!tx) return;
      upgradeDb(db, tx);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
};

const getStore = async (storeName: StoreName, mode: IDBTransactionMode) => {
  const db = await openDb();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { store, tx };
};

export const get = async <T>(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<T | undefined> => {
  const { store, tx } = await getStore(storeName, "readonly");
  const result = await requestToPromise<T | undefined>(store.get(key));
  await txDone(tx);
  return result;
};

export const put = async <T>(
  storeName: StoreName,
  value: T,
): Promise<IDBValidKey> => {
  const { store, tx } = await getStore(storeName, "readwrite");
  const key = await requestToPromise<IDBValidKey>(store.put(value as any));
  await txDone(tx);
  return key;
};

export const del = async (
  storeName: StoreName,
  key: IDBValidKey,
): Promise<void> => {
  const { store, tx } = await getStore(storeName, "readwrite");
  await requestToPromise(store.delete(key));
  await txDone(tx);
};

export const listAll = async <T>(
  storeName: StoreName,
  options: ListOptions = {},
): Promise<T[]> => {
  const { store, tx } = await getStore(storeName, "readonly");
  const results: T[] = [];
  const req = store.openCursor(options.range, options.direction);
  await new Promise<void>((resolve, reject) => {
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve();
        return;
      }
      results.push(cursor.value as T);
      if (options.limit && results.length >= options.limit) {
        resolve();
        return;
      }
      cursor.continue();
    };
  });
  await txDone(tx);
  return results;
};

export const getByIndex = async <T>(
  storeName: StoreName,
  indexName: string,
  key: IDBValidKey,
): Promise<T | undefined> => {
  const { store, tx } = await getStore(storeName, "readonly");
  const index = store.index(indexName);
  const result = await requestToPromise<T | undefined>(index.get(key));
  await txDone(tx);
  return result;
};

export const listByIndex = async <T>(
  storeName: StoreName,
  indexName: string,
  options: ListOptions & { key?: IDBValidKey } = {},
): Promise<T[]> => {
  const { store, tx } = await getStore(storeName, "readonly");
  const index = store.index(indexName);
  const results: T[] = [];
  const range = options.range ?? (options.key ? IDBKeyRange.only(options.key) : undefined);
  const req = index.openCursor(range, options.direction);
  await new Promise<void>((resolve, reject) => {
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve();
        return;
      }
      results.push(cursor.value as T);
      if (options.limit && results.length >= options.limit) {
        resolve();
        return;
      }
      cursor.continue();
    };
  });
  await txDone(tx);
  return results;
};

export const withTx = async <T>(
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> => {
  const db = await openDb();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const tx = db.transaction(names, mode);
  const result = await Promise.resolve(fn(tx));
  await txDone(tx);
  return result;
};
