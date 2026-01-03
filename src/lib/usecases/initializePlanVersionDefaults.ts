import type { HousingType, Id } from "../domain/types";
import type { Repositories } from "../repo/factory";
import type { RepoContext } from "../repo/types";

const HOUSING_TYPES: HousingType[] = [
  "high_performance_home",
  "detached",
  "condo",
  "rent",
];

type InitializePlanVersionDefaultsParams = {
  repos: Repositories;
  planVersionId: Id;
  selectedHousingType: HousingType;
  ctx?: RepoContext;
};

export const initializePlanVersionDefaults = async (
  params: InitializePlanVersionDefaultsParams,
) => {
  const { repos, planVersionId, selectedHousingType, ctx } = params;

  await repos.version.ensureScenarioSet(planVersionId, ctx);

  for (const housingType of HOUSING_TYPES) {
    await repos.housing.applyPreset(
      planVersionId,
      housingType,
      "base",
      ctx,
    );
  }

  await repos.housing.setSelected(planVersionId, selectedHousingType, ctx);
};
