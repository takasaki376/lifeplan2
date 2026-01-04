import { describe, expect, it } from "vitest";
import { parseScenario, scenarioKeys, DEFAULT_SCENARIO } from "./scenario";

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
