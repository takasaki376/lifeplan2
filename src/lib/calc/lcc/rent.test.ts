import { describe, expect, it } from "vitest";
import { calcRentSeries } from "./rent";

describe("rent series", () => {
  it("applies annual rent increase by year index", () => {
    const result = calcRentSeries({
      rentMonthlyYen: 100000,
      rentIncreaseRateAnnual: 0.02,
      renewalFeeYen: 0,
      renewalCycleYears: 2,
      movingCostYen: 0,
      horizonMonths: 13,
    });

    expect(result.loanOrRent[0]).toBe(100000);
    expect(result.loanOrRent[11]).toBe(100000);
    expect(result.loanOrRent[12]).toBe(Math.round(100000 * 1.02));
  });

  it("adds renewal fee on cycle months (excluding month 0)", () => {
    const result = calcRentSeries({
      rentMonthlyYen: 100000,
      rentIncreaseRateAnnual: 0,
      renewalFeeYen: 50000,
      renewalCycleYears: 1,
      movingCostYen: 0,
      horizonMonths: 25,
    });

    expect(result.other[0]).toBe(0);
    expect(result.other[11]).toBe(0);
    expect(result.other[12]).toBe(50000);
    expect(result.other[24]).toBe(50000);
  });

  it("adds moving cost only on month 0", () => {
    const result = calcRentSeries({
      rentMonthlyYen: 100000,
      rentIncreaseRateAnnual: 0,
      renewalFeeYen: 0,
      renewalCycleYears: 2,
      movingCostYen: 300000,
      horizonMonths: 3,
    });

    expect(result.other[0]).toBe(300000);
    expect(result.other[1]).toBe(0);
    expect(result.other[2]).toBe(0);
  });

  it("returns arrays matching horizon length", () => {
    const result = calcRentSeries({
      rentMonthlyYen: 100000,
      rentIncreaseRateAnnual: 0,
      renewalFeeYen: 0,
      renewalCycleYears: 2,
      movingCostYen: 0,
      horizonMonths: 5,
    });

    expect(result.loanOrRent).toHaveLength(5);
    expect(result.other).toHaveLength(5);
  });
});
