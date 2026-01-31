import type { MoneyYen, RepaymentType } from "../../domain/types";

export type LoanSchedule = {
  payments: MoneyYen[];
};

const roundYen = (value: number) => Math.round(value);

const calcAnnuityPayment = (
  principal: number,
  rateAnnual: number,
  termMonths: number,
): number => {
  if (termMonths <= 0 || principal <= 0) return 0;
  const rateMonthly = rateAnnual / 12;
  if (rateMonthly === 0) return principal / termMonths;
  const pow = Math.pow(1 + rateMonthly, termMonths);
  return (principal * rateMonthly * pow) / (pow - 1);
};

export const calcLoanSchedule = (
  principal: MoneyYen,
  rateAnnual: number,
  termMonths: number,
  repaymentType: RepaymentType,
): LoanSchedule => {
  if (principal <= 0 || termMonths <= 0) {
    return { payments: [] };
  }

  if (repaymentType === "equal_principal") {
    const rateMonthly = rateAnnual / 12;
    const principalMonthly = principal / termMonths;
    const payments: MoneyYen[] = [];
    for (let i = 0; i < termMonths; i += 1) {
      const remaining = principal - principalMonthly * i;
      const interest = remaining * rateMonthly;
      payments.push(roundYen(principalMonthly + interest));
    }
    return { payments };
  }

  const monthly = roundYen(calcAnnuityPayment(principal, rateAnnual, termMonths));
  return { payments: Array.from({ length: termMonths }, () => monthly) };
};

export const calcLoanMonthlyPayment = (
  principal: MoneyYen,
  rateAnnual: number,
  termMonths: number,
): MoneyYen => roundYen(calcAnnuityPayment(principal, rateAnnual, termMonths));
