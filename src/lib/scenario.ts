import type { ScenarioKey as DomainScenarioKey } from "./domain/types";

export const scenarioKeys = ["conservative", "base", "optimistic"] as const;
export type ScenarioKey = DomainScenarioKey;

export const DEFAULT_SCENARIO: ScenarioKey = "base";

const scenarioLabelMap: Record<ScenarioKey, string> = {
  conservative: "保守",
  base: "標準",
  optimistic: "楽観",
};

const isScenarioKey = (value: unknown): value is ScenarioKey => {
  return typeof value === "string" && scenarioKeys.includes(value as ScenarioKey);
};

export const parseScenario = (value: string | null | undefined): ScenarioKey => {
  if (isScenarioKey(value)) {
    return value;
  }
  return DEFAULT_SCENARIO;
};

export const formatScenarioLabel = (key: ScenarioKey): string => {
  return scenarioLabelMap[key];
};
