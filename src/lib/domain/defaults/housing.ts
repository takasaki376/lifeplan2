import type { HousingAssumptions, HousingType, ScenarioPreset } from "../types";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type HousingDefaultsInput = DistributiveOmit<
  HousingAssumptions,
  "id" | "planVersionId" | "createdAt" | "updatedAt"
>;

const baseHousingDefaults: Record<HousingType, HousingDefaultsInput> = {
  high_performance_home: {
    housingType: "high_performance_home",
    isSelected: false,
    initialCostYen: 35000000,
    downPaymentYen: 3500000,
    closingCostYen: 800000,
    loanPrincipalYen: 31500000,
    loanInterestRate: 0.012,
    loanTermMonths: 420,
    repaymentType: "annuity",
    propertyTaxAnnualYen: 140000,
    utilitiesBaseMonthlyYen: 14000,
    utilitiesFactor: 0.85,
    typeSpecific: {
      insulationGrade: "G2",
      solarCapacityKw: 4,
    },
    repairsSchedule: [
      { cycleYears: 20, amountYen: 1200000 },
      { cycleYears: 40, amountYen: 1500000 },
    ],
  },
  detached: {
    housingType: "detached",
    isSelected: false,
    initialCostYen: 32000000,
    downPaymentYen: 3000000,
    closingCostYen: 700000,
    loanPrincipalYen: 29000000,
    loanInterestRate: 0.012,
    loanTermMonths: 420,
    repaymentType: "annuity",
    propertyTaxAnnualYen: 120000,
    utilitiesBaseMonthlyYen: 15000,
    utilitiesFactor: 1,
    typeSpecific: {
      landCostYen: 12000000,
      buildCostYen: 20000000,
    },
    repairsSchedule: [
      { cycleYears: 10, amountYen: 1500000 },
      { cycleYears: 20, amountYen: 1500000 },
      { cycleYears: 30, amountYen: 2500000 },
    ],
  },
  condo: {
    housingType: "condo",
    isSelected: false,
    initialCostYen: 30000000,
    downPaymentYen: 3000000,
    closingCostYen: 600000,
    loanPrincipalYen: 27000000,
    loanInterestRate: 0.012,
    loanTermMonths: 420,
    repaymentType: "annuity",
    propertyTaxAnnualYen: 100000,
    utilitiesBaseMonthlyYen: 12000,
    utilitiesFactor: 0.95,
    typeSpecific: {
      managementFeeMonthlyYen: 18000,
      repairReserveMonthlyYen: 12000,
      parkingFeeMonthlyYen: 0,
    },
  },
  rent: {
    housingType: "rent",
    isSelected: false,
    utilitiesBaseMonthlyYen: 12000,
    utilitiesFactor: 1,
    typeSpecific: {
      rentMonthlyYen: 130000,
      renewalFeeYen: 130000,
      renewalCycleYears: 2,
      movingCostYen: 300000,
      depositYen: 90000,
      keyMoneyYen: 90000,
    },
  },
};

export const DEFAULT_HOUSING_PRESETS: Record<
  ScenarioPreset,
  Record<HousingType, HousingDefaultsInput>
> = {
  conservative: baseHousingDefaults,
  base: baseHousingDefaults,
  optimistic: baseHousingDefaults,
};
