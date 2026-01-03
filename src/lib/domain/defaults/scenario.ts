import type { ScenarioAssumptions, ScenarioKey } from "../types";

export type ScenarioDefaultsInput = Omit<
  ScenarioAssumptions,
  "id" | "planVersionId" | "createdAt"
>;

export const DEFAULT_SCENARIO_SET: Record<ScenarioKey, ScenarioDefaultsInput> =
  {
    conservative: {
      // 保守的シナリオ
      scenarioKey: "conservative",
      wageGrowthRate: 0.01, // 賃金上昇率
      inflationRate: 0.03, // インフレ率
      investmentReturnRate: 0.04, // 投資リターン率
    },
    base: {
      // 基本シナリオ
      scenarioKey: "base",
      wageGrowthRate: 0.02, // 賃金上昇率
      inflationRate: 0.03, // インフレ率
      investmentReturnRate: 0.07, // 投資リターン率
    },
    optimistic: {
      // 楽観的シナリオ
      scenarioKey: "optimistic",
      wageGrowthRate: 0.03, // 賃金上昇率
      inflationRate: 0.03, // インフレ率
      investmentReturnRate: 0.01, // 投資リターン率
    },
  };
