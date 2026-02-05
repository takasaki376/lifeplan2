import { describe, expect, it } from "vitest";
import { calcTaxSeries } from "./tax";

describe("tax series", () => {
  it("splits annual tax into monthly values", () => {
    const series = calcTaxSeries({
      propertyTaxAnnualYen: 120000,
      inflationRateAnnual: 0,
      horizonMonths: 3,
    });

    expect(series).toEqual([10000, 10000, 10000]);
  });

  it("applies inflation per year index", () => {
    const series = calcTaxSeries({
      propertyTaxAnnualYen: 120000,
      inflationRateAnnual: 0.02,
      horizonMonths: 25,
    });

    expect(series[0]).toBe(10000);
    expect(series[11]).toBe(10000);
    expect(series[12]).toBe(Math.round(10000 * 1.02));
    expect(series[24]).toBe(Math.round(10000 * Math.pow(1.02, 2)));
  });

  it("returns empty series for zero horizon", () => {
    const series = calcTaxSeries({
      propertyTaxAnnualYen: 120000,
      inflationRateAnnual: 0.02,
      horizonMonths: 0,
    });

    expect(series).toEqual([]);
  });
});
