import { beforeEach, describe, expect, it } from "vitest";

import { listByIndex, put } from "../../db";
import { STORES } from "../../db/schema";
import type { LifeEvent, YearMonth } from "../../domain/types";
import { IndexedDbEventRepository } from "./eventRepo";
import { clearAllStores, nowIso } from "./testUtils";

const repo = new IndexedDbEventRepository();

const currentYm = (): YearMonth => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${mm}` as YearMonth;
};

beforeEach(async () => {
  await clearAllStores();
});

describe("IndexedDbEventRepository", () => {
  it("creates, updates, duplicates, and deletes events", async () => {
    const created = await repo.create({
      planVersionId: "ver-1",
      eventType: "bonus",
      startYm: "2025-01",
      cadence: "once",
      amountYen: 1000,
      direction: "income",
    });
    expect(created.id).toBeTruthy();

    await repo.update({ id: created.id, title: "Updated" });
    const updated = await repo.get(created.id);
    expect(updated?.title).toBe("Updated");

    const duplicated = await repo.duplicate(created.id);
    expect(duplicated.id).not.toBe(created.id);

    await repo.delete(created.id);
    const missing = await repo.get(created.id);
    expect(missing).toBeUndefined();
  });

  it("lists with filters and scope", async () => {
    const now = nowIso();
    const ym = currentYm();
    const pastYm = `${Number(ym.slice(0, 4)) - 1}-${ym.slice(5, 7)}` as YearMonth;
    const futureYm = `${Number(ym.slice(0, 4)) + 1}-${ym.slice(5, 7)}` as YearMonth;

    const events: LifeEvent[] = [
      {
        id: "ev-1",
        planVersionId: "ver-1",
        eventType: "salary",
        startYm: pastYm,
        cadence: "monthly",
        amountYen: 1000,
        direction: "income",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "ev-2",
        planVersionId: "ver-1",
        eventType: "rent",
        startYm: futureYm,
        cadence: "monthly",
        amountYen: 800,
        direction: "expense",
        createdAt: now,
        updatedAt: now,
      },
    ];
    await Promise.all(events.map((event) => put(STORES.lifeEvents, event)));

    const upcoming = await repo.listByVersion("ver-1", { scope: "upcoming" });
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe("ev-2");

    const past = await repo.listByVersion("ver-1", { scope: "past" });
    expect(past).toHaveLength(1);
    expect(past[0].id).toBe("ev-1");

    const filtered = await repo.listByVersion("ver-1", {
      direction: "expense",
      eventType: "rent",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("ev-2");
  });

  it("filters by range", async () => {
    const now = nowIso();
    const events: LifeEvent[] = [
      {
        id: "ev-1",
        planVersionId: "ver-1",
        eventType: "one",
        startYm: "2025-01",
        cadence: "once",
        amountYen: 1000,
        direction: "expense",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "ev-2",
        planVersionId: "ver-1",
        eventType: "two",
        startYm: "2025-06",
        cadence: "once",
        amountYen: 1000,
        direction: "expense",
        createdAt: now,
        updatedAt: now,
      },
    ];
    await Promise.all(events.map((event) => put(STORES.lifeEvents, event)));

    const ranged = await repo.listByVersion("ver-1", {
      fromYm: "2025-02",
      toYm: "2025-12",
    });
    expect(ranged).toHaveLength(1);
    expect(ranged[0].id).toBe("ev-2");

    const listed = await listByIndex<LifeEvent>(
      STORES.lifeEvents,
      "by_versionId",
      { key: "ver-1" },
    );
    expect(listed).toHaveLength(2);
  });
});
