import type {
  HousingAssumptions,
  HousingType,
  MoneyYen,
  YearMonth,
} from "../../domain/types";
import { getCurrentYearMonth } from "../../format";
import type { CalcLccParams, CalcLccResult, LccBreakdown } from "./types";
import { calcLoanSchedule } from "./loan";
import { calcManagementSeries } from "./management";
import { calcRepairsSeries } from "./repairs";
import { calcRentSeries } from "./rent";
import { calcTaxSeries } from "./tax";
import { calcUtilitiesSeries } from "./utilities";

const DEFAULT_HORIZON_MONTHS = 420;
const MONTH_MIN = 1;
const MONTH_MAX = 12;

const roundYen = (value: number) => Math.round(value);

const parseYearMonth = (ym: YearMonth, warnings: string[]) => {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) {
    warnings.push(`Invalid YearMonth format: ${ym}; treated as 0000-01.`);
    return { year: 0, month: 1 };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < MONTH_MIN ||
    month > MONTH_MAX
  ) {
    warnings.push(`Invalid YearMonth range: ${ym} (month must be 01-12); treated as 0000-01.`);
    return { year: 0, month: 1 };
  }
  return { year, month };
};

const addMonths = (ym: YearMonth, offset: number, warnings: string[]): YearMonth => {
  const { year, month } = parseYearMonth(ym, warnings);
  const date = new Date(year, month - 1 + offset, 1);
  const nextYear = date.getFullYear();
  const nextMonth = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${nextYear}-${nextMonth}` as YearMonth;
};

const getInflationRate = (params: CalcLccParams) =>
  params.scenario?.inflationRate ?? 0;

const getNumber = (
  value: number | undefined,
  warnings: string[],
  label: string,
): number => {
  if (value === undefined || value === null) {
    warnings.push(`Missing ${label}; treated as 0.`);
    return 0;
  }
  return value;
};

const calcInitialCost = (
  housing: HousingAssumptions,
  warnings: string[],
): MoneyYen => {
  const downPayment = getNumber(housing.downPaymentYen, warnings, "downPaymentYen");
  const closingCost = getNumber(housing.closingCostYen, warnings, "closingCostYen");
  const initialCost = housing.initialCostYen ?? 0;

  if (downPayment === 0 && closingCost === 0 && initialCost > 0) {
    return roundYen(initialCost);
  }

  return roundYen(downPayment + closingCost + initialCost);
};

const calcRentInitial = (
  housing: HousingAssumptions,
  warnings: string[],
): MoneyYen => {
  const rentAssumptions = housing.typeSpecific ?? {};

  let deposit: number;
  if ("depositYen" in rentAssumptions) {
    // Use getNumber to handle undefined/null with a warning.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deposit = getNumber((rentAssumptions as any).depositYen, warnings, "depositYen");
  } else {
    warnings.push("Missing depositYen; treated as 0.");
    deposit = 0;
  }

  let keyMoney: number;
  if ("keyMoneyYen" in rentAssumptions) {
    // Use getNumber to handle undefined/null with a warning.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyMoney = getNumber((rentAssumptions as any).keyMoneyYen, warnings, "keyMoneyYen");
  } else {
    warnings.push("Missing keyMoneyYen; treated as 0.");
    keyMoney = 0;
  }

  const initialCost = housing.initialCostYen ?? 0;
  return roundYen(deposit + keyMoney + initialCost);
};

const emptySeries = (length: number): MoneyYen[] =>
  Array.from({ length }, () => 0);

const sumSeries = (series: MoneyYen[]) =>
  series.reduce((total, value) => total + value, 0);

const buildBreakdown = (params: {
  initial: MoneyYen;
  loanOrRent: MoneyYen[];
  tax: MoneyYen[];
  repairsOrManagement: MoneyYen[];
  utilities: MoneyYen[];
  other: MoneyYen[];
}): LccBreakdown => ({
  initial: params.initial,
  loanOrRent: sumSeries(params.loanOrRent),
  tax: sumSeries(params.tax),
  repairsOrManagement: sumSeries(params.repairsOrManagement),
  utilities: sumSeries(params.utilities),
  other: sumSeries(params.other),
});

const buildMonthTotals = (
  horizonMonths: number,
  startYm: YearMonth,
  series: {
    initial: MoneyYen;
    loanOrRent: MoneyYen[];
    tax: MoneyYen[];
    repairsOrManagement: MoneyYen[];
    utilities: MoneyYen[];
    other: MoneyYen[];
  },
  warnings: string[],
) => {
  const months = [];
  for (let m = 0; m < horizonMonths; m += 1) {
    const initial = m === 0 ? series.initial : 0;
    const loanOrRent = series.loanOrRent[m] ?? 0;
    const tax = series.tax[m] ?? 0;
    const repairsOrManagement = series.repairsOrManagement[m] ?? 0;
    const utilities = series.utilities[m] ?? 0;
    const other = series.other[m] ?? 0;
    const total = roundYen(
      initial + loanOrRent + tax + repairsOrManagement + utilities + other,
    );
    months.push({
      ym: addMonths(startYm, m, warnings),
      initial: roundYen(initial),
      loanOrRent: roundYen(loanOrRent),
      tax: roundYen(tax),
      repairsOrManagement: roundYen(repairsOrManagement),
      utilities: roundYen(utilities),
      other: roundYen(other),
      total,
    });
  }
  return months;
};

export const calcLcc = (params: CalcLccParams): CalcLccResult => {
  const { housing } = params;
  const horizonMonths = params.horizonMonths ?? DEFAULT_HORIZON_MONTHS;
  const startYm = params.startYm ?? getCurrentYearMonth();
  const warnings: string[] = [];

  const inflationRate = getInflationRate(params);
  const utilitiesBase = getNumber(
    housing.utilitiesBaseMonthlyYen,
    warnings,
    "utilitiesBaseMonthlyYen",
  );
  const utilitiesFactor = getNumber(
    housing.utilitiesFactor,
    warnings,
    "utilitiesFactor",
  );
  const utilitiesIncreaseRate =
    params.scenario?.utilitiesIncreaseRateAnnual ?? inflationRate;
  const utilities = calcUtilitiesSeries({
    baseMonthlyYen: utilitiesBase,
    utilitiesFactor,
    inflationRateAnnual: utilitiesIncreaseRate,
    horizonMonths,
  });

  if (housing.housingType === "rent") {
    const rentSpec = housing.typeSpecific ?? {};
    const rentMonthly = getNumber(rentSpec.rentMonthlyYen, warnings, "rentMonthlyYen");
    const renewalFee = getNumber(rentSpec.renewalFeeYen, warnings, "renewalFeeYen");
    const renewalCycleYears = getNumber(
      rentSpec.renewalCycleYears,
      warnings,
      "renewalCycleYears",
    );
    const movingCost = getNumber(rentSpec.movingCostYen, warnings, "movingCostYen");
    const rentSeries = calcRentSeries({
      rentMonthlyYen: rentMonthly ?? 0,
      rentIncreaseRateAnnual: inflationRate,
      renewalFeeYen: renewalFee ?? 0,
      renewalCycleYears: renewalCycleYears ?? 0,
      movingCostYen: movingCost ?? 0,
      horizonMonths,
    });

    const breakdown = buildBreakdown({
      initial: calcRentInitial(housing, warnings),
      loanOrRent: rentSeries.loanOrRent,
      tax: emptySeries(horizonMonths),
      repairsOrManagement: emptySeries(horizonMonths),
      utilities,
      other: rentSeries.other,
    });

    const months = buildMonthTotals(horizonMonths, startYm, {
      initial: breakdown.initial,
      loanOrRent: rentSeries.loanOrRent,
      tax: emptySeries(horizonMonths),
      repairsOrManagement: emptySeries(horizonMonths),
      utilities,
      other: rentSeries.other,
    }, warnings);

    return {
      housingType: housing.housingType,
      summary: {
        totalNominalYen:
          breakdown.initial +
          breakdown.loanOrRent +
          breakdown.tax +
          breakdown.repairsOrManagement +
          breakdown.utilities +
          breakdown.other,
        breakdownNominalYen: breakdown,
        warnings,
      },
      series: { months },
    };
  }

  const initial = calcInitialCost(housing, warnings);
  const loanPrincipal = getNumber(
    housing.loanPrincipalYen,
    warnings,
    "loanPrincipalYen",
  );
  const loanRate = getNumber(
    housing.loanInterestRate,
    warnings,
    "loanInterestRate",
  );
  const loanTerm = getNumber(
    housing.loanTermMonths,
    warnings,
    "loanTermMonths",
  );
  const repaymentType = housing.repaymentType ?? "annuity";
  if (housing.repaymentType === undefined) {
    warnings.push("Missing repaymentType; treated as annuity.");
  }

  const loanSchedule = calcLoanSchedule(
    loanPrincipal,
    loanRate,
    loanTerm,
    repaymentType,
  );
  const loanOrRent = emptySeries(horizonMonths).map((_, idx) =>
    loanSchedule.payments[idx] ?? 0,
  );

  const tax = calcTaxSeries({
    propertyTaxAnnualYen: getNumber(
      housing.propertyTaxAnnualYen,
      warnings,
      "propertyTaxAnnualYen",
    ),
    inflationRateAnnual: inflationRate,
    horizonMonths,
  });

  let repairsOrManagement: MoneyYen[];
  if (housing.housingType === "condo") {
    const typeSpec = housing.typeSpecific ?? {};
    const managementFee = getNumber(
      typeSpec.managementFeeMonthlyYen,
      warnings,
      "managementFeeMonthlyYen",
    );
    const repairReserve = getNumber(
      typeSpec.repairReserveMonthlyYen,
      warnings,
      "repairReserveMonthlyYen",
    );
    const parking = getNumber(
      typeSpec.parkingFeeMonthlyYen,
      warnings,
      "parkingFeeMonthlyYen",
    );
    repairsOrManagement = calcManagementSeries({
      managementFeeMonthlyYen: managementFee ?? 0,
      repairReserveMonthlyYen: repairReserve ?? 0,
      parkingFeeMonthlyYen: parking ?? 0,
      inflationRateAnnual: inflationRate,
      horizonMonths,
    });
  } else {
    const repairsSchedule = housing.repairsSchedule ?? [];
    if (housing.repairsSchedule === undefined) {
      warnings.push("Missing repairsSchedule; treated as empty.");
    }
    repairsOrManagement = calcRepairsSeries({
      repairsSchedule,
      inflationRateAnnual: inflationRate,
      horizonMonths,
    });
  }

  const other = emptySeries(horizonMonths);
  const breakdown = buildBreakdown({
    initial,
    loanOrRent,
    tax,
    repairsOrManagement,
    utilities,
    other,
  });

  const months = buildMonthTotals(horizonMonths, startYm, {
    initial,
    loanOrRent,
    tax,
    repairsOrManagement,
    utilities,
    other,
  }, warnings);

  return {
    housingType: housing.housingType,
    summary: {
      totalNominalYen:
        breakdown.initial +
        breakdown.loanOrRent +
        breakdown.tax +
        breakdown.repairsOrManagement +
        breakdown.utilities +
        breakdown.other,
      breakdownNominalYen: breakdown,
      warnings,
    },
    series: { months },
  };
};

export const calcLccForHousingType = (
  housing: HousingAssumptions,
  params: Omit<CalcLccParams, "housing">,
): CalcLccResult => calcLcc({ housing, ...params });

export const calcLccForAllTypes = (
  items: HousingAssumptions[],
  params: Omit<CalcLccParams, "housing">,
): Partial<Record<HousingType, CalcLccResult>> => {
  const map: Partial<Record<HousingType, CalcLccResult>> = {};
  for (const item of items) {
    map[item.housingType] = calcLcc({ housing: item, ...params });
  }
  return map;
};
