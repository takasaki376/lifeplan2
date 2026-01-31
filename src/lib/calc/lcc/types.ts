import type {
  HousingAssumptions,
  HousingType,
  MoneyYen,
  ScenarioAssumptions,
  YearMonth,
} from "../../domain/types";

export type LccBreakdown = {
  initial: MoneyYen;
  loanOrRent: MoneyYen;
  tax: MoneyYen;
  repairsOrManagement: MoneyYen;
  utilities: MoneyYen;
  other: MoneyYen;
};

export type LccSummary = {
  totalNominalYen: MoneyYen;
  breakdownNominalYen: LccBreakdown;
  warnings: string[];
};

export type CashflowMonth = {
  ym: YearMonth;
  initial: MoneyYen;
  loanOrRent: MoneyYen;
  tax: MoneyYen;
  repairsOrManagement: MoneyYen;
  utilities: MoneyYen;
  other: MoneyYen;
  total: MoneyYen;
};

export type CashflowSeries = {
  months: CashflowMonth[];
};

export type CalcLccParams = {
  housing: HousingAssumptions;
  scenario?: ScenarioAssumptions;
  horizonMonths?: number;
  startYm?: YearMonth;
};

export type CalcLccResult = {
  housingType: HousingType;
  summary: LccSummary;
  series: CashflowSeries;
};
