import type {
  HousingAssumptions,
  Id,
  LifeEvent,
  MonthlyItem,
  MonthlyRecord,
  Plan,
  PlanVersion,
  ScenarioAssumptions,
} from "../../domain/types";
import { get, put, txDel, txGet, txPut } from "../../db";
import { STORES } from "../../db/schema";
import type { DbTx } from "../../db";
import type {
  PlanCreateInput,
  PlanListParams,
  PlanUpdateInput,
  RepoContext,
} from "../types";
import { RepoError, RepoNotFoundError } from "../types";
import {
  createId,
  nowIso,
  txListAll,
  txListByIndex,
  withOptionalTx,
} from "./utils";

const sortPlans = (plans: Plan[], sort?: PlanListParams["sort"]) => {
  const key = sort ?? "updatedAtDesc";
  if (key === "createdAtDesc") {
    return [...plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const applyQuery = (plans: Plan[], query?: string) => {
  if (!query) return plans;
  const lowered = query.toLowerCase();
  return plans.filter((plan) => plan.name.toLowerCase().includes(lowered));
};

export class IndexedDbPlanRepository {
  async list(params?: PlanListParams, ctx?: RepoContext): Promise<Plan[]> {
    const userId = params?.userId;
    const status = params?.status;
    const query = params?.query;

    const plans = await withOptionalTx(
      ctx?.tx,
      STORES.plans,
      "readonly",
      async (tx) => {
        if (userId && status) {
          return txListByIndex<Plan>(tx, STORES.plans, "by_userId_status", {
            key: [userId, status],
          });
        }

        if (userId) {
          return txListByIndex<Plan>(tx, STORES.plans, "by_userId_updatedAt", {
            range: IDBKeyRange.bound([userId, ""], [userId, "\uffff"]),
            direction: "prev",
          });
        }

        if (status) {
          return txListByIndex<Plan>(tx, STORES.plans, "by_status", {
            key: status,
          });
        }

        return txListAll<Plan>(tx, STORES.plans, { direction: "prev" });
      },
    );

    const filtered = applyQuery(plans, query);
    return sortPlans(filtered, params?.sort);
  }

  async get(planId: Id, ctx?: RepoContext): Promise<Plan | undefined> {
    if (ctx?.tx) {
      return txGet<Plan>(ctx.tx, STORES.plans, planId);
    }
    return get<Plan>(STORES.plans, planId);
  }

  async create(input: PlanCreateInput, ctx?: RepoContext): Promise<Plan> {
    const now = nowIso();
    const plan: Plan = {
      id: createId(),
      userId: input.userId,
      name: input.name,
      householdType: input.householdType,
      note: input.note,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    if (ctx?.tx) {
      await txPut(ctx.tx, STORES.plans, plan);
      return plan;
    }

    await putPlan(plan);
    return plan;
  }

  async update(input: PlanUpdateInput, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(ctx?.tx, STORES.plans, "readwrite", async (tx) => {
      const existing = await txGet<Plan>(tx, STORES.plans, input.id);
      if (!existing) {
        throw new RepoNotFoundError("Plan", { planId: input.id });
      }
      const updated: Plan = {
        ...existing,
        ...input,
        updatedAt: nowIso(),
      };
      await txPut(tx, STORES.plans, updated);
    });
  }

  async archive(planId: Id, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(ctx?.tx, STORES.plans, "readwrite", async (tx) => {
      const existing = await txGet<Plan>(tx, STORES.plans, planId);
      if (!existing) {
        throw new RepoNotFoundError("Plan", { planId });
      }
      const now = nowIso();
      await txPut(tx, STORES.plans, {
        ...existing,
        status: "archived",
        archivedAt: now,
        updatedAt: now,
      });
    });
  }

  async restore(planId: Id, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(ctx?.tx, STORES.plans, "readwrite", async (tx) => {
      const existing = await txGet<Plan>(tx, STORES.plans, planId);
      if (!existing) {
        throw new RepoNotFoundError("Plan", { planId });
      }
      const now = nowIso();
      await txPut(tx, STORES.plans, {
        ...existing,
        status: "active",
        archivedAt: undefined,
        updatedAt: now,
      });
    });
  }

  async delete(planId: Id, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(
      ctx?.tx,
      [
        STORES.plans,
        STORES.planVersions,
        STORES.scenarioAssumptions,
        STORES.lifeEvents,
        STORES.housingAssumptions,
        STORES.monthlyRecords,
        STORES.monthlyItems,
      ],
      "readwrite",
      async (tx: DbTx<"readwrite">) => {
        const plan = await txGet<Plan>(tx, STORES.plans, planId);
        if (!plan) {
          throw new RepoNotFoundError("Plan", { planId });
        }

        const versions = await txListByIndex<PlanVersion>(
          tx,
          STORES.planVersions,
          "by_planId",
          { key: planId },
        );

        for (const version of versions) {
          await deleteVersionRelated(tx, version.id);
          await txDel(tx, STORES.planVersions, version.id);
        }

        const records = await txListByIndex<MonthlyRecord>(
          tx,
          STORES.monthlyRecords,
          "by_planId",
          { key: planId },
        );
        for (const record of records) {
          const items = await txListByIndex<MonthlyItem>(
            tx,
            STORES.monthlyItems,
            "by_monthlyRecordId",
            { key: record.id },
          );
          for (const item of items) {
            await txDel(tx, STORES.monthlyItems, item.id);
          }
          await txDel(tx, STORES.monthlyRecords, record.id);
        }

        await txDel(tx, STORES.plans, planId);
      },
    );
  }
}

const putPlan = async (plan: Plan) => {
  try {
    await put(STORES.plans, plan);
  } catch (error) {
    throw new RepoError("plan_create", { entity: "Plan", cause: error });
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
