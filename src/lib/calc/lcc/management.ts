import type { MoneyYen } from "../../domain/types";

export type ManagementSeriesParams = {
  managementFeeMonthlyYen: MoneyYen;
  repairReserveMonthlyYen: MoneyYen;
  parkingFeeMonthlyYen: MoneyYen;
  inflationRateAnnual: number;
  horizonMonths: number;
};

const roundYen = (value: number) => Math.round(value);

export const calcManagementSeries = (
  params: ManagementSeriesParams,
): MoneyYen[] => {
  const {
    managementFeeMonthlyYen,
    repairReserveMonthlyYen,
    parkingFeeMonthlyYen,
    inflationRateAnnual,
    horizonMonths,
  } = params;

  const base =
    managementFeeMonthlyYen + repairReserveMonthlyYen + parkingFeeMonthlyYen;
  const factor = 1 + inflationRateAnnual;
  const series: MoneyYen[] = [];
  for (let m = 0; m < horizonMonths; m += 1) {
    const yearIndex = Math.floor(m / 12);
    const monthly = base * Math.pow(factor, yearIndex);
    series.push(roundYen(monthly));
  }
  return series;
};
