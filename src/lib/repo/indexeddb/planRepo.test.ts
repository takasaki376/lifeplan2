import { beforeEach, describe, expect, it } from "vitest";

import {
  get,
  getByIndex,
  listByIndex,
  put,
} from "../../db";
import { STORES } from "../../db/schema";
import type {
  HousingAssumptions,
  LifeEvent,
  MonthlyItem,
  MonthlyRecord,
  Plan,
  PlanVersion,
  ScenarioAssumptions,
} from "../../domain/types";
import { IndexedDbPlanRepository } from "./planRepo";
import { clearAllStores, nowIso } from "./testUtils";

const repo = new IndexedDbPlanRepository();

beforeEach(async () => {
  await clearAllStores();
});

describe("IndexedDbPlanRepository", () => {
  it("creates, updates, archives, and restores plans", async () => {
    const plan = await repo.create({ name: "My Plan", userId: "user-1" });
    expect(plan.id).toBeTruthy();
    expect(plan.status).toBe("active");

    await repo.update({ id: plan.id, name: "Updated" });
    const updated = await repo.get(plan.id);
    expect(updated?.name).toBe("Updated");

    await repo.archive(plan.id);
    const archived = await repo.get(plan.id);
    expect(archived?.status).toBe("archived");
    expect(archived?.archivedAt).toBeTruthy();

    await repo.restore(plan.id);
    const restored = await repo.get(plan.id);
    expect(restored?.status).toBe("active");
    expect(restored?.archivedAt).toBeUndefined();
  });

  it("lists with filters and sort", async () => {
    const base = nowIso();
    const plans: Plan[] = [
      {
        id: "plan-1",
        userId: "user-1",
        name: "Alpha",
        status: "active",
        createdAt: base,
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "plan-2",
        userId: "user-1",
        name: "Beta",
        status: "archived",
        createdAt: base,
        updatedAt: "2025-02-01T00:00:00.000Z",
        archivedAt: base,
      },
      {
        id: "plan-3",
        userId: "user-2",
        name: "Gamma",
        status: "active",
        createdAt: base,
        updatedAt: "2025-03-01T00:00:00.000Z",
      },
    ];

    await Promise.all(plans.map((plan) => put(STORES.plans, plan)));

    const byUser = await repo.list({ userId: "user-1" });
    expect(byUser.map((p) => p.id)).toEqual(["plan-2", "plan-1"]);

    const active = await repo.list({ status: "active" });
    expect(active.map((p) => p.id)).toEqual(["plan-3", "plan-1"]);

    const query = await repo.list({ query: "alp" });
    expect(query).toHaveLength(1);
    expect(query[0].id).toBe("plan-1");
  });

  it("deletes a plan and related records", async () => {
    const now = nowIso();
    const plan: Plan = {
      id: "plan-1",
      name: "Plan",
      status: "active",
      createdAt: now,
      updatedAt: now,
      currentVersionId: "ver-1",
    };
    await put(STORES.plans, plan);

    const version: PlanVersion = {
      id: "ver-1",
      planId: plan.id,
      versionNo: 1,
      isCurrent: true,
      createdAt: now,
    };
    await put(STORES.planVersions, version);

    const scenario: ScenarioAssumptions = {
      id: "sc-1",
      planVersionId: version.id,
      scenarioKey: "base",
      createdAt: now,
    };
    await put(STORES.scenarioAssumptions, scenario);

    const event: LifeEvent = {
      id: "ev-1",
      planVersionId: version.id,
      eventType: "test",
      startYm: "2025-01",
      cadence: "once",
      durationMonths: 1,
      amountYen: 1000,
      direction: "expense",
      createdAt: now,
      updatedAt: now,
    };
    await put(STORES.lifeEvents, event);

    const housing: HousingAssumptions = {
      id: "hs-1",
      planVersionId: version.id,
      housingType: "rent",
      isSelected: true,
      createdAt: now,
      updatedAt: now,
    };
    await put(STORES.housingAssumptions, housing);

    const record: MonthlyRecord = {
      id: "mr-1",
      planId: plan.id,
      ym: "2025-01",
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

    await repo.delete(plan.id);

    const missing = await repo.get(plan.id);
    expect(missing).toBeUndefined();

    const versions = await listByIndex<PlanVersion>(
      STORES.planVersions,
      "by_planId",
      { key: plan.id },
    );
    expect(versions).toHaveLength(0);

    const scenarios = await listByIndex<ScenarioAssumptions>(
      STORES.scenarioAssumptions,
      "by_versionId",
      { key: version.id },
    );
    expect(scenarios).toHaveLength(0);

    const events = await listByIndex<LifeEvent>(
      STORES.lifeEvents,
      "by_versionId",
      { key: version.id },
    );
    expect(events).toHaveLength(0);

    const housingItems = await listByIndex<HousingAssumptions>(
      STORES.housingAssumptions,
      "by_versionId",
      { key: version.id },
    );
    expect(housingItems).toHaveLength(0);

    const recordCheck = await getByIndex<MonthlyRecord>(
      STORES.monthlyRecords,
      "by_planId_ym",
      [plan.id, "2025-01"],
    );
    expect(recordCheck).toBeUndefined();

    const items = await listByIndex<MonthlyItem>(
      STORES.monthlyItems,
      "by_monthlyRecordId",
      { key: record.id },
    );
    expect(items).toHaveLength(0);
  });
});
