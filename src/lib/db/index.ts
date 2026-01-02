import { openDB, type IDBPDatabase, type IDBPTransaction } from "idb";
import { DB_NAME, DB_VERSION, StoreName, upgradeDb } from "./schema";

type DbInstance = IDBPDatabase<unknown>;
type DbTx<M extends IDBTransactionMode = IDBTransactionMode> = IDBPTransaction<
  unknown,
  StoreName[],
  M
>;

let dbPromise: Promise<DbInstance> | null = null;

type ListOptions = {
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
};

export const openDb = () => {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("indexedDB is not available in this environment."),
    );
  }

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade: (db, _oldVersion, _newVersion, tx) => {
      upgradeDb(db as unknown as IDBDatabase, tx as unknown as IDBTransaction);
    },
  });

  return dbPromise;
};

const getStore = async <M extends IDBTransactionMode>(
  storeName: StoreName,
  mode: M,
) => {
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
  const result = (await store.get(key)) as T | undefined;
  await tx.done;
  return result;
};

export const put = async <T>(
  storeName: StoreName,
  value: T,
  key?: IDBValidKey,
): Promise<IDBValidKey> => {
  const { store, tx } = await getStore(storeName, "readwrite");
  const storedKey = await store.put(value as T, key);
  await tx.done;
  return storedKey;
};

export const del = async (
  storeName: StoreName,
  key: IDBValidKey,
): Promise<void> => {
  const { store, tx } = await getStore(storeName, "readwrite");
  await store.delete(key);
  await tx.done;
};

export const listAll = async <T>(
  storeName: StoreName,
  options: ListOptions = {},
): Promise<T[]> => {
  const { store, tx } = await getStore(storeName, "readonly");
  const results: T[] = [];
  let cursor = await store.openCursor(options.range, options.direction);
  while (cursor) {
    results.push(cursor.value as T);
    if (options.limit && results.length >= options.limit) {
      break;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return results;
};

export const getByIndex = async <T>(
  storeName: StoreName,
  indexName: string,
  key: IDBValidKey,
): Promise<T | undefined> => {
  const { store, tx } = await getStore(storeName, "readonly");
  const index = store.index(indexName);
  const result = (await index.get(key)) as T | undefined;
  await tx.done;
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
  const range =
    options.range ?? (options.key ? IDBKeyRange.only(options.key) : undefined);
  let cursor = await index.openCursor(range, options.direction);
  while (cursor) {
    results.push(cursor.value as T);
    if (options.limit && results.length >= options.limit) {
      break;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return results;
};

export const withTx = async <T, M extends IDBTransactionMode>(
  storeNames: StoreName | StoreName[],
  mode: M,
  fn: (tx: DbTx<M>) => Promise<T> | T,
): Promise<T> => {
  const db = await openDb();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const tx = db.transaction(names, mode);
  try {
    const result = await Promise.resolve(fn(tx));
    await tx.done;
    return result;
  } catch (error) {
    tx.abort();
    throw error;
  }
};

export const txGet = async <T>(
  tx: DbTx,
  storeName: StoreName,
  key: IDBValidKey,
): Promise<T | undefined> => {
  const store = tx.objectStore(storeName);
  return (await store.get(key)) as T | undefined;
};

export const txPut = async <T>(
  tx: DbTx<"readwrite">,
  storeName: StoreName,
  value: T,
  key?: IDBValidKey,
): Promise<IDBValidKey> => {
  const store = tx.objectStore(storeName);
  return store.put(value as T, key);
};

export const txDel = async (
  tx: DbTx<"readwrite">,
  storeName: StoreName,
  key: IDBValidKey,
): Promise<void> => {
  const store = tx.objectStore(storeName);
  await store.delete(key);
};
