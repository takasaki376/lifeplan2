import { beforeEach, describe, expect, it } from "vitest";

import { getByIndex, listByIndex, put } from "../../db";
import { STORES } from "../../db/schema";
import type { MonthlyItem, MonthlyRecord } from "../../domain/types";
import { IndexedDbMonthlyRepository } from "./monthlyRepo";
import { clearAllStores, nowIso } from "./testUtils";

const repo = new IndexedDbMonthlyRepository();

beforeEach(async () => {
  await clearAllStores();
});

describe("IndexedDbMonthlyRepository", () => {
  it("upserts and lists records", async () => {
    const created = await repo.upsert({
      planId: "plan-1",
      ym: "2025-01",
      isFinalized: false,
    });
    expect(created.id).toBeTruthy();

    const updated = await repo.upsert({
      id: created.id,
      planId: "plan-1",
      ym: "2025-01",
      isFinalized: true,
    });
    expect(updated.isFinalized).toBe(true);

    const list = await repo.listByPlan("plan-1", { sort: "ymDesc" });
    expect(list).toHaveLength(1);
  });

  it("upsertByYm creates and patches", async () => {
    const created = await repo.upsertByYm("plan-1", "2025-02", {
      incomeTotalYen: 1000,
    });
    expect(created.incomeTotalYen).toBe(1000);

    const patched = await repo.upsertByYm("plan-1", "2025-02", {
      incomeTotalYen: 2000,
    });
    expect(patched.incomeTotalYen).toBe(2000);
  });

  it("copyFromPreviousMonth throws when previous record is missing", async () => {
    await expect(
      repo.copyFromPreviousMonth("plan-1", "2025-03"),
    ).rejects.toThrowError();
  });

  it("copyFromPreviousMonth clones previous record", async () => {
    const now = nowIso();
    const record: MonthlyRecord = {
      id: "mr-1",
      planId: "plan-1",
      ym: "2025-04",
      isFinalized: false,
      createdAt: now,
      updatedAt: now,
      incomeTotalYen: 500,
    };
    await put(STORES.monthlyRecords, record);

    const copied = await repo.copyFromPreviousMonth("plan-1", "2025-05");
    expect(copied.ym).toBe("2025-05");
    expect(copied.incomeTotalYen).toBe(500);
  });

  it("replaces items and deletes by record", async () => {
    const now = nowIso();
    const record: MonthlyRecord = {
      id: "mr-1",
      planId: "plan-1",
      ym: "2025-06",
      isFinalized: false,
      createdAt: now,
      updatedAt: now,
    };
    await put(STORES.monthlyRecords, record);

    await repo.replaceItems(record.id, [
      {
        kind: "income",
        category: "salary",
        amountYen: 1000,
      },
    ]);
    let items = await listByIndex<MonthlyItem>(
      STORES.monthlyItems,
      "by_monthlyRecordId",
      { key: record.id },
    );
    expect(items).toHaveLength(1);

    await repo.replaceItems(record.id, [
      {
        kind: "expense",
        category: "rent",
        amountYen: 700,
      },
      {
        kind: "expense",
        category: "food",
        amountYen: 300,
      },
    ]);
    items = await listByIndex<MonthlyItem>(
      STORES.monthlyItems,
      "by_monthlyRecordId",
      { key: record.id },
    );
    expect(items).toHaveLength(2);

    await repo.deleteItemsByRecord(record.id);
    items = await listByIndex<MonthlyItem>(
      STORES.monthlyItems,
      "by_monthlyRecordId",
      { key: record.id },
    );
    expect(items).toHaveLength(0);
  });

  it("deleteByYm removes record and items", async () => {
    const now = nowIso();
    const record: MonthlyRecord = {
      id: "mr-1",
      planId: "plan-1",
      ym: "2025-07",
      isFinalized: false,
      createdAt: now,
      updatedAt: now,
    };
    await put(STORES.monthlyRecords, record);
    const item: MonthlyItem = {
      id: "mi-1",
      monthlyRecordId: record.id,
      kind: "income",
      category: "salary",
      amountYen: 1000,
    };
    await put(STORES.monthlyItems, item);

    await repo.deleteByYm("plan-1", "2025-07");

    const stored = await getByIndex<MonthlyRecord>(
      STORES.monthlyRecords,
      "by_planId_ym",
      ["plan-1", "2025-07"],
    );
    expect(stored).toBeUndefined();

    const items = await listByIndex<MonthlyItem>(
      STORES.monthlyItems,
      "by_monthlyRecordId",
      { key: record.id },
    );
    expect(items).toHaveLength(0);
  });
});
