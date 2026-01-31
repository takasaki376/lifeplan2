import type { MoneyYen } from "../../domain/types";

export type UtilitiesSeriesParams = {
  baseMonthlyYen: MoneyYen;
  utilitiesFactor: number;
  inflationRateAnnual: number;
  horizonMonths: number;
};

const roundYen = (value: number) => Math.round(value);

export const calcUtilitiesSeries = (
  params: UtilitiesSeriesParams,
): MoneyYen[] => {
  const { baseMonthlyYen, utilitiesFactor, inflationRateAnnual, horizonMonths } =
    params;
  const factor = 1 + inflationRateAnnual;
  const series: MoneyYen[] = [];
  for (let m = 0; m < horizonMonths; m += 1) {
    const yearIndex = Math.floor(m / 12);
    const monthly = baseMonthlyYen * utilitiesFactor * Math.pow(factor, yearIndex);
    series.push(roundYen(monthly));
  }
  return series;
};
