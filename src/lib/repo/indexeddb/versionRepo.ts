import type {
  HousingAssumptions,
  Id,
  LifeEvent,
  Plan,
  PlanVersion,
  ScenarioAssumptions,
  ScenarioKey,
} from "../../domain/types";
import {
  get,
  txDel,
  txGet,
  txPut,
} from "../../db";
import { STORES } from "../../db/schema";
import type { DbTx } from "../../db";
import { DEFAULT_SCENARIO_SET } from "../../domain/defaults/scenario";
import type {
  RepoContext,
  ScenarioAssumptionsSet,
  ScenarioAssumptionsSetInput,
  VersionCreateInput,
} from "../types";
import { RepoError, RepoNotFoundError } from "../types";
import {
  createId,
  nowIso,
  txGetByIndex,
  txListByIndex,
  withOptionalTx,
} from "./utils";

const SCENARIO_KEYS: ScenarioKey[] = ["conservative", "base", "optimistic"];

export class IndexedDbVersionRepository {
  async listByPlan(planId: Id, ctx?: RepoContext): Promise<PlanVersion[]> {
    return withOptionalTx(
      ctx?.tx,
      STORES.planVersions,
      "readonly",
      (tx) =>
        txListByIndex<PlanVersion>(tx, STORES.planVersions, "by_planId_versionNo", {
          range: IDBKeyRange.bound([planId, 0], [planId, Number.MAX_SAFE_INTEGER]),
          direction: "prev",
        }),
    );
  }

  async get(versionId: Id, ctx?: RepoContext): Promise<PlanVersion | undefined> {
    if (ctx?.tx) {
      return txGet<PlanVersion>(ctx.tx, STORES.planVersions, versionId);
    }
    return get<PlanVersion>(STORES.planVersions, versionId);
  }

  async getCurrent(planId: Id, ctx?: RepoContext): Promise<PlanVersion | undefined> {
    return withOptionalTx(
      ctx?.tx,
      [STORES.plans, STORES.planVersions],
      "readonly",
      async (tx) => {
        const plan = await txGet<Plan>(tx, STORES.plans, planId);
        if (!plan || !plan.currentVersionId) {
          const versions = await txListByIndex<PlanVersion>(
            tx,
            STORES.planVersions,
            "by_planId",
            { key: planId },
          );
          return versions.find((item) => item.isCurrent);
        }
        return txGet<PlanVersion>(tx, STORES.planVersions, plan.currentVersionId);
      },
    );
  }

  async createInitial(
    planId: Id,
    input?: VersionCreateInput,
    ctx?: RepoContext,
  ): Promise<PlanVersion> {
    return withOptionalTx(
      ctx?.tx,
      [STORES.plans, STORES.planVersions],
      "readwrite",
      async (tx) => {
        const plan = await txGet<Plan>(tx, STORES.plans, planId);
        if (!plan) {
          throw new RepoNotFoundError("Plan", { planId });
        }

        const existing = await txListByIndex<PlanVersion>(
          tx,
          STORES.planVersions,
          "by_planId",
          { key: planId, limit: 1 },
        );
        if (existing.length > 0) {
          throw new RepoError("version_create_initial", {
            entity: "PlanVersion",
            meta: { planId },
          });
        }

        const now = nowIso();
        const version: PlanVersion = {
          id: createId(),
          planId,
          versionNo: 1,
          title: input?.title,
          changeNote: input?.changeNote,
          incomeMonthlyYen: input?.incomeMonthlyYen,
          assetsBalanceYen: input?.assetsBalanceYen,
          liabilitiesBalanceYen: input?.liabilitiesBalanceYen,
          isCurrent: true,
          createdAt: now,
        };

        await txPut(tx, STORES.planVersions, version);
        await txPut(tx, STORES.plans, {
          ...plan,
          currentVersionId: version.id,
          updatedAt: now,
        });

        return version;
      },
    );
  }

  async createFromCurrent(
    planId: Id,
    changeNote?: string,
    ctx?: RepoContext,
  ): Promise<PlanVersion> {
    return withOptionalTx(
      ctx?.tx,
      [
        STORES.plans,
        STORES.planVersions,
        STORES.scenarioAssumptions,
        STORES.lifeEvents,
        STORES.housingAssumptions,
      ],
      "readwrite",
      async (tx) => {
        const plan = await txGet<Plan>(tx, STORES.plans, planId);
        if (!plan || !plan.currentVersionId) {
          throw new RepoNotFoundError("Plan", { planId });
        }
        const current = await txGet<PlanVersion>(
          tx,
          STORES.planVersions,
          plan.currentVersionId,
        );
        if (!current) {
          throw new RepoNotFoundError("PlanVersion", {
            planId,
            versionId: plan.currentVersionId,
          });
        }

        const versionNo = current.versionNo + 1;
        const existing = await txGetByIndex<PlanVersion>(
          tx,
          STORES.planVersions,
          "by_planId_versionNo",
          [planId, versionNo],
        );
        if (existing) {
          throw new RepoError("version_create_from_current", {
            entity: "PlanVersion",
            meta: { planId, versionNo },
          });
        }

        const now = nowIso();
        const version: PlanVersion = {
          id: createId(),
          planId,
          versionNo,
          title: current.title,
          changeNote,
          incomeMonthlyYen: current.incomeMonthlyYen,
          assetsBalanceYen: current.assetsBalanceYen,
          liabilitiesBalanceYen: current.liabilitiesBalanceYen,
          isCurrent: false,
          createdAt: now,
        };

        await txPut(tx, STORES.planVersions, version);
        await copyVersionRelated(tx, current.id, version.id, now);

        return version;
      },
    );
  }

  async setCurrent(planId: Id, versionId: Id, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(
      ctx?.tx,
      [STORES.plans, STORES.planVersions],
      "readwrite",
      async (tx) => {
        const plan = await txGet<Plan>(tx, STORES.plans, planId);
        if (!plan) {
          throw new RepoNotFoundError("Plan", { planId });
        }
        const version = await txGet<PlanVersion>(tx, STORES.planVersions, versionId);
        if (!version || version.planId !== planId) {
          throw new RepoNotFoundError("PlanVersion", { planId, versionId });
        }

        const now = nowIso();
        if (plan.currentVersionId && plan.currentVersionId !== versionId) {
          const current = await txGet<PlanVersion>(
            tx,
            STORES.planVersions,
            plan.currentVersionId,
          );
          if (current) {
            await txPut(tx, STORES.planVersions, {
              ...current,
              isCurrent: false,
            });
          }
        }

        await txPut(tx, STORES.planVersions, {
          ...version,
          isCurrent: true,
        });
        await txPut(tx, STORES.plans, {
          ...plan,
          currentVersionId: versionId,
          updatedAt: now,
        });
      },
    );
  }

  async delete(versionId: Id, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(
      ctx?.tx,
      [
        STORES.plans,
        STORES.planVersions,
        STORES.scenarioAssumptions,
        STORES.lifeEvents,
        STORES.housingAssumptions,
      ],
      "readwrite",
      async (tx) => {
        const version = await txGet<PlanVersion>(tx, STORES.planVersions, versionId);
        if (!version) {
          throw new RepoNotFoundError("PlanVersion", { versionId });
        }
        const plan = await txGet<Plan>(tx, STORES.plans, version.planId);
        if (plan?.currentVersionId === versionId) {
          throw new RepoError("version_delete_current", {
            entity: "PlanVersion",
            meta: { planId: version.planId, versionId },
          });
        }

        await deleteVersionRelated(tx, version.id);
        await txDel(tx, STORES.planVersions, versionId);
      },
    );
  }

  async getScenarioSet(
    versionId: Id,
    ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet> {
    return withOptionalTx(
      ctx?.tx,
      STORES.scenarioAssumptions,
      "readonly",
      async (tx) => {
        const scenarios = await txListByIndex<ScenarioAssumptions>(
          tx,
          STORES.scenarioAssumptions,
          "by_versionId",
          { key: versionId },
        );
        return toScenarioSet(scenarios);
      },
    );
  }

  async upsertScenarioSet(
    versionId: Id,
    set: ScenarioAssumptionsSetInput,
    ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet> {
    return withOptionalTx(
      ctx?.tx,
      STORES.scenarioAssumptions,
      "readwrite",
      async (tx) => {
        const now = nowIso();
        for (const key of Object.keys(set) as ScenarioKey[]) {
          const input = set[key];
          if (!input) continue;
          const { scenarioKey: _scenarioKey, ...rest } = input;
          const existing = await txGetByIndex<ScenarioAssumptions>(
            tx,
            STORES.scenarioAssumptions,
            "by_versionId_scenarioKey",
            [versionId, key],
          );
          if (existing) {
            await txPut(tx, STORES.scenarioAssumptions, {
              ...existing,
              ...rest,
              scenarioKey: key,
            });
          } else {
            await txPut(tx, STORES.scenarioAssumptions, {
              id: createId(),
              planVersionId: versionId,
              scenarioKey: key,
              createdAt: now,
              ...rest,
            });
          }
        }

        const scenarios = await txListByIndex<ScenarioAssumptions>(
          tx,
          STORES.scenarioAssumptions,
          "by_versionId",
          { key: versionId },
        );
        return toScenarioSet(scenarios);
      },
    );
  }

  async ensureScenarioSet(
    versionId: Id,
    ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet> {
    return withOptionalTx(
      ctx?.tx,
      STORES.scenarioAssumptions,
      "readwrite",
      async (tx) => {
        const existing = await txListByIndex<ScenarioAssumptions>(
          tx,
          STORES.scenarioAssumptions,
          "by_versionId",
          { key: versionId },
        );
        const byKey = new Map(existing.map((item) => [item.scenarioKey, item]));
        const now = nowIso();

        for (const key of SCENARIO_KEYS) {
          if (byKey.has(key)) continue;
          const defaults = DEFAULT_SCENARIO_SET[key];
          await txPut(tx, STORES.scenarioAssumptions, {
            id: createId(),
            planVersionId: versionId,
            createdAt: now,
            ...defaults,
          });
        }

        const scenarios = await txListByIndex<ScenarioAssumptions>(
          tx,
          STORES.scenarioAssumptions,
          "by_versionId",
          { key: versionId },
        );
        return toScenarioSet(scenarios);
      },
    );
  }
}

const toScenarioSet = (
  scenarios: ScenarioAssumptions[],
): ScenarioAssumptionsSet => {
  const base: ScenarioAssumptionsSet = {
    conservative: undefined,
    base: undefined,
    optimistic: undefined,
  };
  for (const scenario of scenarios) {
    base[scenario.scenarioKey] = scenario;
  }
  return base;
};

const copyVersionRelated = async (
  tx: DbTx<"readwrite">,
  sourceVersionId: Id,
  targetVersionId: Id,
  now: string,
) => {
  const scenarios = await txListByIndex<ScenarioAssumptions>(
    tx,
    STORES.scenarioAssumptions,
    "by_versionId",
    { key: sourceVersionId },
  );
  for (const scenario of scenarios) {
    await txPut(tx, STORES.scenarioAssumptions, {
      ...scenario,
      id: createId(),
      planVersionId: targetVersionId,
      createdAt: now,
    });
  }

  const events = await txListByIndex<LifeEvent>(
    tx,
    STORES.lifeEvents,
    "by_versionId",
    { key: sourceVersionId },
  );
  for (const event of events) {
    await txPut(tx, STORES.lifeEvents, {
      ...event,
      id: createId(),
      planVersionId: targetVersionId,
      createdAt: now,
      updatedAt: now,
    });
  }

  const housing = await txListByIndex<HousingAssumptions>(
    tx,
    STORES.housingAssumptions,
    "by_versionId",
    { key: sourceVersionId },
  );
  for (const item of housing) {
    await txPut(tx, STORES.housingAssumptions, {
      ...item,
      id: createId(),
      planVersionId: targetVersionId,
      createdAt: now,
      updatedAt: now,
    });
  }
};

const deleteVersionRelated = async (tx: DbTx<"readwrite">, versionId: Id) => {
  const scenarios = await txListByIndex<ScenarioAssumptions>(
    tx,
    STORES.scenarioAssumptions,
    "by_versionId",
    { key: versionId },
  );
  for (const scenario of scenarios) {
    await txDel(tx, STORES.scenarioAssumptions, scenario.id);
  }

  const events = await txListByIndex<LifeEvent>(
    tx,
    STORES.lifeEvents,
    "by_versionId",
    { key: versionId },
  );
  for (const event of events) {
    await txDel(tx, STORES.lifeEvents, event.id);
  }

  const housing = await txListByIndex<HousingAssumptions>(
    tx,
    STORES.housingAssumptions,
    "by_versionId",
    { key: versionId },
  );
  for (const item of housing) {
    await txDel(tx, STORES.housingAssumptions, item.id);
  }
};
