import type { MoneyYen, RepairsScheduleItem } from "../../domain/types";

export type RepairsSeriesParams = {
  repairsSchedule: RepairsScheduleItem[];
  inflationRateAnnual: number;
  horizonMonths: number;
};

const roundYen = (value: number) => Math.round(value);

export const calcRepairsSeries = (
  params: RepairsSeriesParams,
): MoneyYen[] => {
  const { repairsSchedule, inflationRateAnnual, horizonMonths } = params;
  const series: MoneyYen[] = Array.from({ length: horizonMonths }, () => 0);
  const factor = 1 + inflationRateAnnual;

  for (const item of repairsSchedule) {
    if (!item.cycleYears || item.cycleYears <= 0) continue;
    const cycleMonths = item.cycleYears * 12;
    for (let m = cycleMonths; m < horizonMonths; m += cycleMonths) {
      const yearIndex = Math.floor(m / 12);
      const cost = item.amountYen * Math.pow(factor, yearIndex);
      series[m] = roundYen(series[m] + cost);
    }
  }

  return series;
};
