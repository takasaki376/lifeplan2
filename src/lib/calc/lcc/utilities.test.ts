import { describe, expect, it } from "vitest";
import { calcUtilitiesSeries } from "./utilities";

describe("utilities series", () => {
  it("applies base * factor with no inflation", () => {
    const series = calcUtilitiesSeries({
      baseMonthlyYen: 12000,
      utilitiesFactor: 0.85,
      inflationRateAnnual: 0,
      horizonMonths: 3,
    });

    const expected = Math.round(12000 * 0.85);
    expect(series).toEqual([expected, expected, expected]);
  });

  it("applies inflation per year index", () => {
    const series = calcUtilitiesSeries({
      baseMonthlyYen: 12000,
      utilitiesFactor: 1,
      inflationRateAnnual: 0.02,
      horizonMonths: 25,
    });

    expect(series[0]).toBe(12000);
    expect(series[11]).toBe(12000);
    expect(series[12]).toBe(Math.round(12000 * 1.02));
    expect(series[24]).toBe(Math.round(12000 * Math.pow(1.02, 2)));
  });

  it("returns empty series for zero horizon", () => {
    const series = calcUtilitiesSeries({
      baseMonthlyYen: 12000,
      utilitiesFactor: 1,
      inflationRateAnnual: 0.02,
      horizonMonths: 0,
    });

    expect(series).toEqual([]);
  });
});
