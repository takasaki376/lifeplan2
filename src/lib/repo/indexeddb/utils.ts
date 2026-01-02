import type { DbTx } from "../../db";
import { withTx } from "../../db";
import type { StoreName } from "../../db/schema";

type ListOptions = {
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
  key?: IDBValidKey;
};

export const nowIso = () => new Date().toISOString();

export const createId = () => {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("crypto.randomUUID is not available in this environment.");
  }
  return globalThis.crypto.randomUUID();
};

export const withOptionalTx = async <T, M extends IDBTransactionMode>(
  tx: DbTx | undefined,
  storeNames: StoreName | StoreName[],
  mode: M,
  fn: (activeTx: DbTx<M>) => Promise<T>,
): Promise<T> => {
  if (tx) {
    return fn(tx as DbTx<M>);
  }
  return withTx(storeNames, mode, fn);
};

export const txGetByIndex = async <T>(
  tx: DbTx,
  storeName: StoreName,
  indexName: string,
  key: IDBValidKey,
): Promise<T | undefined> => {
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);
  return (await index.get(key)) as T | undefined;
};

export const txListAll = async <T>(
  tx: DbTx,
  storeName: StoreName,
  options: ListOptions = {},
): Promise<T[]> => {
  const store = tx.objectStore(storeName);
  const results: T[] = [];
  let cursor = await store.openCursor(options.range, options.direction);
  while (cursor) {
    results.push(cursor.value as T);
    if (options.limit && results.length >= options.limit) {
      break;
    }
    cursor = await cursor.continue();
  }
  return results;
};

export const txListByIndex = async <T>(
  tx: DbTx,
  storeName: StoreName,
  indexName: string,
  options: ListOptions = {},
): Promise<T[]> => {
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);
  const range =
    options.range ?? (options.key ? IDBKeyRange.only(options.key) : undefined);
  const results: T[] = [];
  let cursor = await index.openCursor(range, options.direction);
  while (cursor) {
    results.push(cursor.value as T);
    if (options.limit && results.length >= options.limit) {
      break;
    }
    cursor = await cursor.continue();
  }
  return results;
};
