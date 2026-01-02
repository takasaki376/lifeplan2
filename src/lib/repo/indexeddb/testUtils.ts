import { withTx } from "../../db";
import { STORES, type StoreName } from "../../db/schema";

const allStores = Object.values(STORES) as StoreName[];

export const clearAllStores = async () => {
  await withTx(allStores, "readwrite", async (tx) => {
    await Promise.all(
      allStores.map((storeName) => tx.objectStore(storeName).clear()),
    );
  });
};

export const nowIso = () => new Date().toISOString();
