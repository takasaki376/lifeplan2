import { describe, expect, it } from "vitest";
import { parseScenario, formatScenarioLabel, scenarioKeys, DEFAULT_SCENARIO } from "./scenario";

describe("parseScenario", () => {
  it("should return the correct scenario key for valid inputs", () => {
    scenarioKeys.forEach((key) => {
      expect(parseScenario(key)).toBe(key);
    });
  });

  it('should fall back to the default scenario for null', () => {
    expect(parseScenario(null)).toBe(DEFAULT_SCENARIO);
  });

  it('should fall back to the default scenario for undefined', () => {
    expect(parseScenario(undefined)).toBe(DEFAULT_SCENARIO);
  });

  it("should fall back to the default scenario for invalid string values", () => {
    expect(parseScenario("invalid-key")).toBe(DEFAULT_SCENARIO);
    expect(parseScenario("standard")).toBe(DEFAULT_SCENARIO);
  });

  it("should fall back to the default scenario for an empty string", () => {
    expect(parseScenario("")).toBe(DEFAULT_SCENARIO);
  });
});

describe("formatScenarioLabel", () => {
  it("should return the correct Japanese label for conservative scenario", () => {
    expect(formatScenarioLabel("conservative")).toBe("保守");
  });

  it("should return the correct Japanese label for base scenario", () => {
    expect(formatScenarioLabel("base")).toBe("標準");
  });

  it("should return the correct Japanese label for optimistic scenario", () => {
    expect(formatScenarioLabel("optimistic")).toBe("楽観");
  });

  it("should return correct labels for all scenario keys", () => {
    const expectedLabels = {
      conservative: "保守",
      base: "標準",
      optimistic: "楽観",
    };

    scenarioKeys.forEach((key) => {
      expect(formatScenarioLabel(key)).toBe(expectedLabels[key]);
    });
  });
});
