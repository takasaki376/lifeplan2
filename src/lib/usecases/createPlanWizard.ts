import type { HouseholdType, HousingType, Id } from "../domain/types";
import { withTx } from "../db";
import { STORES } from "../db/schema";
import type { Repositories } from "../repo/factory";
import type { RepoContext } from "../repo/types";
import { initializePlanVersionDefaults } from "./initializePlanVersionDefaults";

type PlanWizardInput = {
  name: string;
  householdType?: HouseholdType;
  note?: string;
  housingType: HousingType;
  incomeMonthlyYen?: number;
  assetsBalanceYen?: number;
  liabilitiesBalanceYen?: number;
};

type PlanWizardResult = {
  planId: Id;
  versionId: Id;
};

type CreatePlanWizardParams = {
  repos: Repositories;
  input: PlanWizardInput;
};

export const createPlanWizard = async (
  params: CreatePlanWizardParams,
): Promise<PlanWizardResult> => {
  const { repos, input } = params;
  const storeNames = [
    STORES.plans,
    STORES.planVersions,
    STORES.scenarioAssumptions,
    STORES.housingAssumptions,
  ];

  return withTx(storeNames, "readwrite", async (tx) => {
    const ctx: RepoContext = { tx };
    const plan = await repos.plan.create(
      {
        name: input.name,
        householdType: input.householdType,
        note: input.note,
      },
      ctx,
    );

    const version = await repos.version.createInitial(
      plan.id,
      {
        title: "v1",
        changeNote: "初期作成",
        incomeMonthlyYen: input.incomeMonthlyYen,
        assetsBalanceYen: input.assetsBalanceYen,
        liabilitiesBalanceYen: input.liabilitiesBalanceYen,
      },
      ctx,
    );

    await initializePlanVersionDefaults({
      repos,
      planVersionId: version.id,
      selectedHousingType: input.housingType,
      ctx,
    });

    return { planId: plan.id, versionId: version.id };
  });
};
