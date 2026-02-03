import type { MoneyYen } from "../../domain/types";

export type TaxSeriesParams = {
  propertyTaxAnnualYen: MoneyYen;
  inflationRateAnnual: number;
  horizonMonths: number;
};

const roundYen = (value: number) => Math.round(value);

export const calcTaxSeries = (params: TaxSeriesParams): MoneyYen[] => {
  const { propertyTaxAnnualYen, inflationRateAnnual, horizonMonths } = params;
  const factor = 1 + inflationRateAnnual;
  const monthlyBase = propertyTaxAnnualYen / 12;
  const series: MoneyYen[] = [];
  for (let m = 0; m < horizonMonths; m += 1) {
    const yearIndex = Math.floor(m / 12);
    const monthly = monthlyBase * Math.pow(factor, yearIndex);
    series.push(roundYen(monthly));
  }
  return series;
};
