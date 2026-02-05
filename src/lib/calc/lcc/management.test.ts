import { describe, expect, it } from "vitest";
import { calcManagementSeries } from "./management";

describe("management series", () => {
  it("returns base monthly sum with no inflation", () => {
    const series = calcManagementSeries({
      managementFeeMonthlyYen: 10000,
      repairReserveMonthlyYen: 5000,
      parkingFeeMonthlyYen: 3000,
      inflationRateAnnual: 0,
      horizonMonths: 3,
    });

    expect(series).toEqual([18000, 18000, 18000]);
  });

  it("applies inflation per year index", () => {
    const series = calcManagementSeries({
      managementFeeMonthlyYen: 10000,
      repairReserveMonthlyYen: 5000,
      parkingFeeMonthlyYen: 3000,
      inflationRateAnnual: 0.02,
      horizonMonths: 25,
    });

    const base = 18000;
    expect(series[0]).toBe(base);
    expect(series[11]).toBe(base);
    expect(series[12]).toBe(Math.round(base * 1.02));
    expect(series[24]).toBe(Math.round(base * Math.pow(1.02, 2)));
  });

  it("returns empty series for zero horizon", () => {
    const series = calcManagementSeries({
      managementFeeMonthlyYen: 10000,
      repairReserveMonthlyYen: 5000,
      parkingFeeMonthlyYen: 3000,
      inflationRateAnnual: 0.02,
      horizonMonths: 0,
    });

    expect(series).toEqual([]);
  });
});
