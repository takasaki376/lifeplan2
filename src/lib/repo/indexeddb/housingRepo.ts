import type {
  HousingAssumptions,
  HousingType,
  Id,
  ScenarioPreset,
} from "../../domain/types";
import { getByIndex, txPut } from "../../db";
import type { DbTx } from "../../db";
import { STORES } from "../../db/schema";
import {
  DEFAULT_HOUSING_PRESETS,
  type HousingDefaultsInput,
} from "../../domain/defaults/housing";
import type { HousingAssumptionsInput, RepoContext } from "../types";
import { RepoError, RepoNotFoundError } from "../types";
import {
  createId,
  nowIso,
  txGetByIndex,
  txListByIndex,
  withOptionalTx,
} from "./utils";

const cloneDefaults = (input: HousingDefaultsInput) => {
  const base = {
    ...input,
    typeSpecific: input.typeSpecific ? { ...input.typeSpecific } : undefined,
  };
  if ("repairsSchedule" in input) {
    return {
      ...base,
      repairsSchedule: input.repairsSchedule
        ? input.repairsSchedule.map((item) => ({ ...item }))
        : undefined,
    };
  }
  return base;
};

export class IndexedDbHousingRepository {
  async listByVersion(
    planVersionId: Id,
    ctx?: RepoContext,
  ): Promise<HousingAssumptions[]> {
    return withOptionalTx(
      ctx?.tx,
      STORES.housingAssumptions,
      "readonly",
      (tx) =>
        txListByIndex<HousingAssumptions>(
          tx,
          STORES.housingAssumptions,
          "by_versionId",
          { key: planVersionId },
        ),
    );
  }

  async getByType(
    planVersionId: Id,
    housingType: HousingType,
    ctx?: RepoContext,
  ): Promise<HousingAssumptions | undefined> {
    if (ctx?.tx) {
      return txGetByIndex<HousingAssumptions>(
        ctx.tx,
        STORES.housingAssumptions,
        "by_versionId_type",
        [planVersionId, housingType],
      );
    }
    return getByIndex<HousingAssumptions>(
      STORES.housingAssumptions,
      "by_versionId_type",
      [planVersionId, housingType],
    );
  }

  async upsert(
    assumptions: HousingAssumptionsInput,
    ctx?: RepoContext,
  ): Promise<void> {
    await withOptionalTx(
      ctx?.tx,
      STORES.housingAssumptions,
      "readwrite",
      async (tx) => {
        const existing = await txGetByIndex<HousingAssumptions>(
          tx,
          STORES.housingAssumptions,
          "by_versionId_type",
          [assumptions.planVersionId, assumptions.housingType],
        );

        if (assumptions.isSelected) {
          await clearSelected(tx, assumptions.planVersionId);
        }

        const now = nowIso();
        if (existing) {
          await txPut(tx, STORES.housingAssumptions, {
            ...existing,
            ...assumptions,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: now,
          });
          return;
        }

        await txPut(tx, STORES.housingAssumptions, {
          ...assumptions,
          id: assumptions.id ?? createId(),
          createdAt: now,
          updatedAt: now,
        });
      },
    );
  }

  async setSelected(
    planVersionId: Id,
    housingType: HousingType,
    ctx?: RepoContext,
  ): Promise<void> {
    await withOptionalTx(
      ctx?.tx,
      STORES.housingAssumptions,
      "readwrite",
      async (tx) => {
        const target = await txGetByIndex<HousingAssumptions>(
          tx,
          STORES.housingAssumptions,
          "by_versionId_type",
          [planVersionId, housingType],
        );
        if (!target) {
          throw new RepoNotFoundError("HousingAssumptions", {
            planVersionId,
            housingType,
          });
        }

        await clearSelected(tx, planVersionId, target.id);
        await txPut(tx, STORES.housingAssumptions, {
          ...target,
          isSelected: true,
          updatedAt: nowIso(),
        });
      },
    );
  }

  async applyPreset(
    planVersionId: Id,
    housingType: HousingType,
    preset: ScenarioPreset,
    ctx?: RepoContext,
  ): Promise<void> {
    const presetMap = DEFAULT_HOUSING_PRESETS[preset];
    if (!presetMap) {
      throw new RepoError("housing_apply_preset", {
        entity: "HousingAssumptions",
        meta: { preset },
      });
    }

    await withOptionalTx(
      ctx?.tx,
      STORES.housingAssumptions,
      "readwrite",
      async (tx) => {
        const existing = await txGetByIndex<HousingAssumptions>(
          tx,
          STORES.housingAssumptions,
          "by_versionId_type",
          [planVersionId, housingType],
        );
        if (existing) return;

        const existingAll = await txListByIndex<HousingAssumptions>(
          tx,
          STORES.housingAssumptions,
          "by_versionId",
          { key: planVersionId, limit: 1 },
        );
        const shouldSelect = existingAll.length === 0;

        const defaults = cloneDefaults(presetMap[housingType]);
        const now = nowIso();
        await txPut(tx, STORES.housingAssumptions, {
          ...defaults,
          id: createId(),
          planVersionId,
          housingType,
          isSelected: shouldSelect,
          createdAt: now,
          updatedAt: now,
        });
      },
    );
  }
}

const clearSelected = async (
  tx: DbTx<"readwrite">,
  planVersionId: Id,
  keepId?: Id,
) => {
  const items = await txListByIndex<HousingAssumptions>(
    tx,
    STORES.housingAssumptions,
    "by_versionId",
    { key: planVersionId },
  );
  for (const item of items) {
    if (keepId && item.id === keepId) continue;
    if (!item.isSelected) continue;
    await txPut(tx, STORES.housingAssumptions, {
      ...item,
      isSelected: false,
      updatedAt: nowIso(),
    });
  }
};
