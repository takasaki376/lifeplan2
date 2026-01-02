export type Id = string; // uuid string
export type ISODate = string; // ISO-8601 date or datetime
export type YearMonth = `${number}-${string}`; // e.g. "2026-01"
export type MoneyYen = number; // MVP: integer yen

export type ScenarioKey = "conservative" | "base" | "optimistic";
export type HouseholdType = "single" | "couple" | "couple_kids" | "other";

export interface Plan {
  id: Id;
  userId?: Id;
  name: string;
  householdType?: HouseholdType;
  note?: string;
  status: "active" | "archived";
  createdAt: ISODate;
  updatedAt: ISODate;
  archivedAt?: ISODate;
  currentVersionId?: Id; // convenience pointer
}

export interface PlanVersion {
  id: Id;
  planId: Id;
  versionNo: number;
  title?: string;
  changeNote?: string;
  isCurrent: boolean;
  createdAt: ISODate;
}

export interface ScenarioAssumptions {
  id: Id;
  planVersionId: Id;
  scenarioKey: ScenarioKey;
  wageGrowthRate?: number; // 0.02
  inflationRate?: number; // 0.01
  investmentReturnRate?: number; // 0.03
  createdAt: ISODate;
}

export interface MonthlyRecord {
  id: Id;
  planId: Id;
  ym: YearMonth;
  incomeTotalYen?: MoneyYen;
  incomeMainYen?: MoneyYen;
  incomeSideYen?: MoneyYen;
  expenseTotalYen?: MoneyYen;
  expenseFixedYen?: MoneyYen;
  expenseVariableYen?: MoneyYen;
  assetsBalanceYen?: MoneyYen;
  liabilitiesBalanceYen?: MoneyYen;
  memo?: string;
  isFinalized: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type MonthlyItemKind = "income" | "expense";

export interface MonthlyItem {
  id: Id;
  monthlyRecordId: Id;
  kind: MonthlyItemKind;
  category: string;
  amountYen: MoneyYen;
  note?: string;
  sortOrder?: number;
}

export type EventCadence = "once" | "monthly";
export type EventDirection = "expense" | "income";

export interface LifeEvent {
  id: Id;
  planVersionId: Id;
  eventType: string;
  title?: string;
  startYm: YearMonth;
  cadence: EventCadence;
  durationMonths?: number;
  amountYen: MoneyYen;
  direction: EventDirection;
  note?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type HousingType = "high_performance_home" | "detached" | "condo" | "rent";
export type RepaymentType = "annuity" | "equal_principal";

export interface HousingCommonAssumptions {
  id: Id;
  planVersionId: Id;
  housingType: HousingType;
  isSelected: boolean;

  initialCostYen?: MoneyYen;
  downPaymentYen?: MoneyYen;
  closingCostYen?: MoneyYen;

  loanPrincipalYen?: MoneyYen;
  loanInterestRate?: number;
  loanTermMonths?: number;
  repaymentType?: RepaymentType;

  propertyTaxAnnualYen?: MoneyYen;

  utilitiesBaseMonthlyYen?: MoneyYen;
  utilitiesFactor?: number;

  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface RepairsScheduleItem {
  cycleYears: number;
  amountYen: MoneyYen;
}

export interface HighPerformanceHomeAssumptions
  extends HousingCommonAssumptions {
  housingType: "high_performance_home";
  typeSpecific?: {
    insulationGrade?: string;
    solarCapacityKw?: number;
  };
  repairsSchedule?: RepairsScheduleItem[];
}

export interface DetachedAssumptions extends HousingCommonAssumptions {
  housingType: "detached";
  typeSpecific?: {
    landCostYen?: MoneyYen;
    buildCostYen?: MoneyYen;
  };
  repairsSchedule?: RepairsScheduleItem[];
}

export interface CondoAssumptions extends HousingCommonAssumptions {
  housingType: "condo";
  typeSpecific?: {
    managementFeeMonthlyYen?: MoneyYen;
    repairReserveMonthlyYen?: MoneyYen;
  };
}

export interface RentAssumptions extends HousingCommonAssumptions {
  housingType: "rent";
  typeSpecific?: {
    rentMonthlyYen?: MoneyYen;
    renewalFeeYen?: MoneyYen;
    depositYen?: MoneyYen;
    keyMoneyYen?: MoneyYen;
  };
}

export type HousingAssumptions =
  | HighPerformanceHomeAssumptions
  | DetachedAssumptions
  | CondoAssumptions
  | RentAssumptions;
