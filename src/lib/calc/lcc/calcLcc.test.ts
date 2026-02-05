import { describe, expect, it } from "vitest";
import type { HousingAssumptions, YearMonth } from "../../domain/types";
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

  it("uses custom rent increase rate when provided", () => {
    const housing: HousingAssumptions = {
      id: "h-1b",
      planVersionId: "v-1",
      housingType: "rent",
      isSelected: false,
      utilitiesBaseMonthlyYen: 0,
      utilitiesFactor: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      typeSpecific: {
        rentMonthlyYen: 100000,
        rentIncreaseRateAnnual: 0.05,
        renewalFeeYen: 0,
        renewalCycleYears: 2,
        movingCostYen: 0,
      },
    };

    const result = calcLcc({
      housing,
      horizonMonths: 13,
      startYm: "2026-01",
      scenario: {
        id: "s-1b",
        planVersionId: "v-1",
        scenarioKey: "base",
        inflationRate: 0.01,
        createdAt: "2026-01-01",
      },
    });

    const month0 = result.series.months[0];
    const month12 = result.series.months[12];
    expect(month0.loanOrRent).toBe(100000);
    expect(month12.loanOrRent).toBe(Math.round(100000 * 1.05));
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
      startYm: "2026-99" as unknown as YearMonth,
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
      startYm: "invalid" as unknown as YearMonth,
    });
    
    // Should have a warning about invalid format
    expect(result.summary.warnings).toContain(
      "Invalid YearMonth format: invalid; treated as 0000-01."
    );
  });

  it("reflects condo management fees monthly with inflation", () => {
    const housing: HousingAssumptions = {
      id: "h-5",
      planVersionId: "v-5",
      housingType: "condo",
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
      typeSpecific: {
        managementFeeMonthlyYen: 10000,
        repairReserveMonthlyYen: 5000,
        parkingFeeMonthlyYen: 3000,
      },
    };

    const result = calcLcc({
      housing,
      horizonMonths: 25,
      startYm: "2026-01",
      scenario: {
        id: "s-1",
        planVersionId: "v-5",
        scenarioKey: "base",
        inflationRate: 0.02,
        createdAt: "2026-01-01",
      },
    });

    // Month 0: base fees (10000 + 5000 + 3000 = 18000)
    const month0 = result.series.months[0];
    expect(month0.repairsOrManagement).toBe(18000);

    // Month 12: should have inflation applied (year 1)
    const month12 = result.series.months[12];
    const expectedMonth12 = Math.round(18000 * 1.02);
    expect(month12.repairsOrManagement).toBe(expectedMonth12);

    // Month 24: should have inflation applied twice (year 2)
    const month24 = result.series.months[24];
    const expectedMonth24 = Math.round(18000 * Math.pow(1.02, 2));
    expect(month24.repairsOrManagement).toBe(expectedMonth24);
  });

  it("splits annual property tax into 12 months with inflation", () => {
    const housing: HousingAssumptions = {
      id: "h-6",
      planVersionId: "v-6",
      housingType: "detached",
      isSelected: false,
      loanPrincipalYen: 0,
      loanInterestRate: 0,
      loanTermMonths: 0,
      repaymentType: "annuity",
      propertyTaxAnnualYen: 120000, // 120,000 yen per year
      utilitiesBaseMonthlyYen: 0,
      utilitiesFactor: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      repairsSchedule: [],
    };

    const result = calcLcc({
      housing,
      horizonMonths: 25,
      startYm: "2026-01",
      scenario: {
        id: "s-1",
        planVersionId: "v-6",
        scenarioKey: "base",
        inflationRate: 0.02,
        createdAt: "2026-01-01",
      },
    });

    // Month 0: 120,000 / 12 = 10,000 yen per month
    const month0 = result.series.months[0];
    expect(month0.tax).toBe(10000);

    // Month 12: should have inflation applied (year 1)
    const month12 = result.series.months[12];
    const expectedMonth12 = Math.round((120000 / 12) * 1.02);
    expect(month12.tax).toBe(expectedMonth12);

    // Month 24: should have inflation applied twice (year 2)
    const month24 = result.series.months[24];
    const expectedMonth24 = Math.round((120000 / 12) * Math.pow(1.02, 2));
    expect(month24.tax).toBe(expectedMonth24);
  });

  it("stops loan payments after loan term expires", () => {
    const housing: HousingAssumptions = {
      id: "h-7",
      planVersionId: "v-7",
      housingType: "detached",
      isSelected: false,
      loanPrincipalYen: 30000000,
      loanInterestRate: 0.01,
      loanTermMonths: 24, // 2 years loan
      repaymentType: "annuity",
      propertyTaxAnnualYen: 0,
      utilitiesBaseMonthlyYen: 0,
      utilitiesFactor: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      repairsSchedule: [],
    };

    const result = calcLcc({
      housing,
      horizonMonths: 30,
      startYm: "2026-01",
    });

    // Months 0-23 should have loan payments
    const month0 = result.series.months[0];
    expect(month0.loanOrRent).toBeGreaterThan(0);

    const month23 = result.series.months[23];
    expect(month23.loanOrRent).toBeGreaterThan(0);

    // Month 24 and beyond should have 0 loan payments
    const month24 = result.series.months[24];
    expect(month24.loanOrRent).toBe(0);

    const month29 = result.series.months[29];
    expect(month29.loanOrRent).toBe(0);
  });
});
