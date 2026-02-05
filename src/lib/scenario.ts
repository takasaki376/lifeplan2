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

type BuildScenarioHrefOptions = {
  scenario?: string | null;
  params?: Record<string, string>;
  includeWhenMissing?: boolean;
};

export const buildScenarioHref = (
  base: string,
  options: BuildScenarioHrefOptions = {},
): string => {
  const { scenario, params, includeWhenMissing = false } = options;
  const search = new URLSearchParams(params);
  const scenarioKey = isScenarioKey(scenario)
    ? scenario
    : includeWhenMissing
    ? DEFAULT_SCENARIO
    : undefined;

  if (scenarioKey) {
    search.set("scenario", scenarioKey);
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
};
