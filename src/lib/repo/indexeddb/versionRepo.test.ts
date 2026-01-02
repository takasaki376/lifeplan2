import { beforeEach, describe, expect, it } from "vitest";

import { get, listByIndex, put } from "../../db";
import { STORES } from "../../db/schema";
import type {
  HousingAssumptions,
  LifeEvent,
  Plan,
  PlanVersion,
  ScenarioAssumptions,
} from "../../domain/types";
import { DEFAULT_SCENARIO_SET } from "../../domain/defaults/scenario";
import { IndexedDbVersionRepository } from "./versionRepo";
import { clearAllStores, nowIso } from "./testUtils";

const repo = new IndexedDbVersionRepository();

beforeEach(async () => {
  await clearAllStores();
});

describe("IndexedDbVersionRepository", () => {
  it("createInitial sets current and updates plan", async () => {
    const now = nowIso();
    const plan: Plan = {
      id: "plan-1",
      name: "Plan",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await put(STORES.plans, plan);

    const created = await repo.createInitial(plan.id, { title: "v1" });
    expect(created.versionNo).toBe(1);
    expect(created.isCurrent).toBe(true);

    const storedPlan = await get<Plan>(STORES.plans, plan.id);
    expect(storedPlan?.currentVersionId).toBe(created.id);
  });

  it("ensureScenarioSet seeds three scenarios with defaults", async () => {
    const now = nowIso();
    const plan: Plan = {
      id: "plan-1",
      name: "Plan",
      status: "active",
      createdAt: now,
      updatedAt: now,
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

    const set = await repo.ensureScenarioSet(version.id);
    expect(set.base?.scenarioKey).toBe("base");
    expect(set.conservative?.inflationRate).toBe(
      DEFAULT_SCENARIO_SET.conservative.inflationRate,
    );
    expect(set.optimistic?.wageGrowthRate).toBe(
      DEFAULT_SCENARIO_SET.optimistic.wageGrowthRate,
    );
  });

  it("createFromCurrent clones related data", async () => {
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
      inflationRate: 0.02,
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

    const cloned = await repo.createFromCurrent(plan.id, "note");
    expect(cloned.versionNo).toBe(2);
    expect(cloned.isCurrent).toBe(false);

    const scenarios = await listByIndex<ScenarioAssumptions>(
      STORES.scenarioAssumptions,
      "by_versionId",
      { key: cloned.id },
    );
    expect(scenarios).toHaveLength(1);

    const events = await listByIndex<LifeEvent>(
      STORES.lifeEvents,
      "by_versionId",
      { key: cloned.id },
    );
    expect(events).toHaveLength(1);

    const housingItems = await listByIndex<HousingAssumptions>(
      STORES.housingAssumptions,
      "by_versionId",
      { key: cloned.id },
    );
    expect(housingItems).toHaveLength(1);
  });

  it("setCurrent updates plan and versions", async () => {
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
    const version1: PlanVersion = {
      id: "ver-1",
      planId: plan.id,
      versionNo: 1,
      isCurrent: true,
      createdAt: now,
    };
    const version2: PlanVersion = {
      id: "ver-2",
      planId: plan.id,
      versionNo: 2,
      isCurrent: false,
      createdAt: now,
    };
    await put(STORES.planVersions, version1);
    await put(STORES.planVersions, version2);

    await repo.setCurrent(plan.id, version2.id);

    const updatedPlan = await get<Plan>(STORES.plans, plan.id);
    expect(updatedPlan?.currentVersionId).toBe(version2.id);

    const stored1 = await get<PlanVersion>(STORES.planVersions, version1.id);
    const stored2 = await get<PlanVersion>(STORES.planVersions, version2.id);
    expect(stored1?.isCurrent).toBe(false);
    expect(stored2?.isCurrent).toBe(true);
  });

  it("prevents deleting current version", async () => {
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

    await expect(repo.delete(version.id)).rejects.toThrowError();
  });
});
