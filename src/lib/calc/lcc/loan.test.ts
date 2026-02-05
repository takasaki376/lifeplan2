import { describe, expect, it } from "vitest";
import { calcLoanMonthlyPayment, calcLoanSchedule } from "./loan";

describe("loan calc", () => {
  it("returns 0 monthly payment when principal or term is non-positive", () => {
    expect(calcLoanMonthlyPayment(0, 0.01, 360)).toBe(0);
    expect(calcLoanMonthlyPayment(1000000, 0.01, 0)).toBe(0);
    expect(calcLoanMonthlyPayment(-1000000, 0.01, 360)).toBe(0);
  });

  it("calculates annuity monthly payment for zero rate as principal/term", () => {
    const payment = calcLoanMonthlyPayment(1200000, 0, 12);
    expect(payment).toBe(100000);
  });

  it("returns constant payments for annuity schedule", () => {
    const schedule = calcLoanSchedule(3000000, 0.012, 24, "annuity");
    expect(schedule.payments.length).toBe(24);
    expect(schedule.payments[0]).toBe(schedule.payments[23]);
  });

  it("returns decreasing payments for equal principal schedule", () => {
    const schedule = calcLoanSchedule(1200000, 0.012, 12, "equal_principal");
    expect(schedule.payments.length).toBe(12);
    expect(schedule.payments[0]).toBeGreaterThan(schedule.payments[11]);
  });

  it("handles zero rate for equal principal schedule", () => {
    const schedule = calcLoanSchedule(1200000, 0, 12, "equal_principal");
    expect(schedule.payments.length).toBe(12);
    expect(schedule.payments[0]).toBe(schedule.payments[11]);
    expect(schedule.payments[0]).toBe(100000);
  });

  it("returns empty schedule when principal or term is non-positive", () => {
    expect(calcLoanSchedule(0, 0.01, 360, "annuity").payments).toHaveLength(0);
    expect(calcLoanSchedule(1000000, 0.01, 0, "annuity").payments).toHaveLength(0);
  });
});
