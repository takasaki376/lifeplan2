import { describe, expect, it } from "vitest";
import { calcRepairsSeries } from "./repairs";

describe("repairs series", () => {
  it("adds repairs at cycle months and skips month 0", () => {
    const series = calcRepairsSeries({
      repairsSchedule: [{ cycleYears: 1, amountYen: 100000 }],
      inflationRateAnnual: 0,
      horizonMonths: 25,
    });

    expect(series[0]).toBe(0);
    expect(series[11]).toBe(0);
    expect(series[12]).toBe(100000);
    expect(series[24]).toBe(100000);
  });

  it("applies inflation by year index", () => {
    const series = calcRepairsSeries({
      repairsSchedule: [{ cycleYears: 1, amountYen: 100000 }],
      inflationRateAnnual: 0.02,
      horizonMonths: 25,
    });

    expect(series[12]).toBe(Math.round(100000 * 1.02));
    expect(series[24]).toBe(Math.round(100000 * Math.pow(1.02, 2)));
  });

  it("sums multiple schedules at the same month", () => {
    const series = calcRepairsSeries({
      repairsSchedule: [
        { cycleYears: 1, amountYen: 100000 },
        { cycleYears: 2, amountYen: 50000 },
      ],
      inflationRateAnnual: 0,
      horizonMonths: 25,
    });

    expect(series[12]).toBe(100000);
    expect(series[24]).toBe(150000);
  });

  it("ignores invalid cycle years", () => {
    const series = calcRepairsSeries({
      repairsSchedule: [
        { cycleYears: 0, amountYen: 100000 },
        { cycleYears: -1, amountYen: 100000 },
      ],
      inflationRateAnnual: 0,
      horizonMonths: 25,
    });

    expect(series.every((value) => value === 0)).toBe(true);
  });
});
