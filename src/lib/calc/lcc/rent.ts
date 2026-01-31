import type { MoneyYen } from "../../domain/types";

export type RentSeriesParams = {
  rentMonthlyYen: MoneyYen;
  rentIncreaseRateAnnual: number;
  renewalFeeYen: MoneyYen;
  renewalCycleYears: number;
  movingCostYen: MoneyYen;
  horizonMonths: number;
};

export type RentSeries = {
  loanOrRent: MoneyYen[];
  other: MoneyYen[];
};

const roundYen = (value: number) => Math.round(value);

export const calcRentSeries = (params: RentSeriesParams): RentSeries => {
  const {
    rentMonthlyYen,
    rentIncreaseRateAnnual,
    renewalFeeYen,
    renewalCycleYears,
    movingCostYen,
    horizonMonths,
  } = params;

  const loanOrRent: MoneyYen[] = [];
  const other: MoneyYen[] = [];
  const increaseFactor = 1 + rentIncreaseRateAnnual;

  for (let m = 0; m < horizonMonths; m += 1) {
    const yearIndex = Math.floor(m / 12);
    const rent = rentMonthlyYen * Math.pow(increaseFactor, yearIndex);
    loanOrRent.push(roundYen(rent));

    let otherCost = 0;
    if (m === 0 && movingCostYen > 0) {
      otherCost += movingCostYen;
    }
    if (renewalFeeYen > 0 && renewalCycleYears > 0) {
      const cycleMonths = renewalCycleYears * 12;
      if (m > 0 && m % cycleMonths === 0) {
        otherCost += renewalFeeYen;
      }
    }
    other.push(roundYen(otherCost));
  }

  return { loanOrRent, other };
};
