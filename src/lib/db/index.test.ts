import { beforeEach, describe, expect, it } from "vitest";

import {
  del,
  get,
  getByIndex,
  listAll,
  listByIndex,
  put,
  txDel,
  txGet,
  txPut,
  withTx,
} from "./index";
import { STORES, type StoreName } from "./schema";

const allStores = Object.values(STORES) as StoreName[];

const clearAllStores = async () => {
  await withTx(allStores, "readwrite", async (tx) => {
    await Promise.all(
      allStores.map((storeName) => tx.objectStore(storeName).clear()),
    );
  });
};

beforeEach(async () => {
  await clearAllStores();
});

describe("IndexedDB wrapper", () => {
  it("supports put/get/del/listAll", async () => {
    const now = new Date().toISOString();
    const plan = {
      id: "plan-1",
      name: "Plan 1",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    const storedKey = await put(STORES.plans, plan);
    expect(storedKey).toBe(plan.id);

    const fetched = await get<typeof plan>(STORES.plans, plan.id);
    expect(fetched).toEqual(plan);

    const listed = await listAll<typeof plan>(STORES.plans);
    expect(listed).toHaveLength(1);

    await del(STORES.plans, plan.id);
    const missing = await get<typeof plan>(STORES.plans, plan.id);
    expect(missing).toBeUndefined();
  });

  it("supports getByIndex and listByIndex", async () => {
    const records = [
      { id: "mr-1", planId: "plan-1", ym: "2025-01" },
      { id: "mr-2", planId: "plan-1", ym: "2025-02" },
      { id: "mr-3", planId: "plan-2", ym: "2025-01" },
    ];

    await Promise.all(
      records.map((record) => put(STORES.monthlyRecords, record)),
    );

    const byCompound = await getByIndex<typeof records[0]>(
      STORES.monthlyRecords,
      "by_planId_ym",
      ["plan-1", "2025-02"],
    );
    expect(byCompound?.id).toBe("mr-2");

    const byPlan = await listByIndex<typeof records[0]>(
      STORES.monthlyRecords,
      "by_planId",
      { key: "plan-1" },
    );
    expect(byPlan).toHaveLength(2);
  });

  it("supports withTx and tx helpers", async () => {
    const item = {
      id: "mi-1",
      monthlyRecordId: "mr-1",
      kind: "income",
      category: "salary",
      amount: 1000,
    };

    await withTx(STORES.monthlyItems, "readwrite", async (tx) => {
      await txPut(tx, STORES.monthlyItems, item);
      const fetched = await txGet<typeof item>(
        tx,
        STORES.monthlyItems,
        item.id,
      );
      expect(fetched?.id).toBe(item.id);

      await txDel(tx, STORES.monthlyItems, item.id);
      const missing = await txGet<typeof item>(
        tx,
        STORES.monthlyItems,
        item.id,
      );
      expect(missing).toBeUndefined();
    });
  });
});
