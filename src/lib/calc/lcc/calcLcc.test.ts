import { describe, expect, it } from "vitest";
import type { HousingAssumptions } from "../../domain/types";
import { calcLcc, calcLoanMonthlyPayment } from "./";

describe("lcc calc", () => {
  it("calculates annuity loan monthly payment", () => {
    const payment = calcLoanMonthlyPayment(30000000, 0.012, 420);
    expect(payment).toBeGreaterThan(0);
  });

  it("applies rent increase and renewal fee", () => {
    const housing: HousingAssumptions = {
      id: "h-1",
      planVersionId: "v-1",
      housingType: "rent",
      isSelected: false,
      utilitiesBaseMonthlyYen: 0,
      utilitiesFactor: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      typeSpecific: {
        rentMonthlyYen: 100000,
        renewalFeeYen: 100000,
        renewalCycleYears: 2,
        movingCostYen: 0,
      },
    };

    const result = calcLcc({
      housing,
      horizonMonths: 25,
      startYm: "2026-01",
      scenario: {
        id: "s-1",
        planVersionId: "v-1",
        scenarioKey: "base",
        inflationRate: 0.02,
        createdAt: "2026-01-01",
      },
    });
    const month0 = result.series.months[0];
    const month12 = result.series.months[12];
    expect(month12.loanOrRent).toBeGreaterThan(month0.loanOrRent);
    const month24 = result.series.months[24];
    expect(result.series.months[23].other).toBe(0);
    expect(month24.other).toBe(100000);
  });

  it("counts repairs schedule events", () => {
    const housing: HousingAssumptions = {
      id: "h-2",
      planVersionId: "v-2",
      housingType: "detached",
      isSelected: false,
      loanPrincipalYen: 0,
      loanInterestRate: 0,
      loanTermMonths: 0,
      repaymentType: "annuity",
      propertyTaxAnnualYen: 0,
      utilitiesBaseMonthlyYen: 0,
      utilitiesFactor: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      repairsSchedule: [{ cycleYears: 10, amountYen: 1000000 }],
    };

    const result = calcLcc({ housing, horizonMonths: 121, startYm: "2026-01" });
    const month120 = result.series.months[120];
    expect(month120.repairsOrManagement).toBe(1000000);
  });

  it("validates YearMonth and adds warning for invalid month range", () => {
    const housing: HousingAssumptions = {
      id: "h-3",
      planVersionId: "v-3",
      housingType: "rent",
      isSelected: false,
      utilitiesBaseMonthlyYen: 0,
      utilitiesFactor: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      typeSpecific: {
        rentMonthlyYen: 100000,
        renewalFeeYen: 0,
        renewalCycleYears: 2,
        movingCostYen: 0,
      },
    };

    // Test with invalid month (99)
    const result = calcLcc({
      housing,
      horizonMonths: 3,
      startYm: "2026-99" as any,
    });
    
    // Should have a warning about invalid month range
    expect(result.summary.warnings).toContain(
      "Invalid YearMonth range: 2026-99 (month must be 01-12); treated as 0000-01."
    );
  });

  it("validates YearMonth and adds warning for invalid format", () => {
    const housing: HousingAssumptions = {
      id: "h-4",
      planVersionId: "v-4",
      housingType: "rent",
      isSelected: false,
      utilitiesBaseMonthlyYen: 0,
      utilitiesFactor: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      typeSpecific: {
        rentMonthlyYen: 100000,
        renewalFeeYen: 0,
        renewalCycleYears: 2,
        movingCostYen: 0,
      },
    };

    // Test with invalid format
    const result = calcLcc({
      housing,
      horizonMonths: 3,
      startYm: "invalid" as any,
    });
    
    // Should have a warning about invalid format
    expect(result.summary.warnings).toContain(
      "Invalid YearMonth format: invalid; treated as 0000-01."
    );
  });
});
