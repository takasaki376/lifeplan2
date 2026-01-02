import type { ScenarioAssumptions, ScenarioKey } from "../types";

export type ScenarioDefaultsInput = Omit<
  ScenarioAssumptions,
  "id" | "planVersionId" | "createdAt"
>;

export const DEFAULT_SCENARIO_SET: Record<ScenarioKey, ScenarioDefaultsInput> = {
  conservative: {
    scenarioKey: "conservative",
    wageGrowthRate: 0.03,
    inflationRate: 0.03,
    investmentReturnRate: 0.03,
  },
  base: {
    scenarioKey: "base",
    wageGrowthRate: 0.02,
    inflationRate: 0.02,
    investmentReturnRate: 0.02,
  },
  optimistic: {
    scenarioKey: "optimistic",
    wageGrowthRate: 0.01,
    inflationRate: 0.01,
    investmentReturnRate: 0.01,
  },
};
