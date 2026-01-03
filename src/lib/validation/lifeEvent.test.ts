import { describe, expect, it } from "vitest";
import { validateLifeEventDraft } from "./lifeEvent";

const makeValidDraft = () => ({
  title: "教育イベント",
  startYm: "2026-04",
  amountYen: 1000,
  direction: "expense" as const,
  cadence: "monthly" as const,
  durationMonths: 12,
});

describe("validateLifeEventDraft", () => {
  it("accepts a valid monthly draft", () => {
    const result = validateLifeEventDraft(makeValidDraft());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("rejects missing required fields", () => {
    const result = validateLifeEventDraft({
      title: "",
      startYm: "",
      amountYen: "",
      direction: undefined,
      cadence: undefined,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeTruthy();
    expect(result.errors.startYm).toBeTruthy();
    expect(result.errors.amountYen).toBeTruthy();
    expect(result.errors.direction).toBeTruthy();
    expect(result.errors.cadence).toBeTruthy();
  });

  it("rejects amount <= 0", () => {
    const zeroAmount = validateLifeEventDraft({
      ...makeValidDraft(),
      amountYen: 0,
    });
    expect(zeroAmount.valid).toBe(false);
    expect(zeroAmount.errors.amountYen).toBeTruthy();

    const negativeAmount = validateLifeEventDraft({
      ...makeValidDraft(),
      amountYen: -1,
    });
    expect(negativeAmount.valid).toBe(false);
    expect(negativeAmount.errors.amountYen).toBeTruthy();
  });

  it("rejects invalid year-month format", () => {
    const result = validateLifeEventDraft({
      ...makeValidDraft(),
      startYm: "2026-4",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.startYm).toBeTruthy();
  });

  it("requires durationMonths >= 1 for monthly cadence", () => {
    const result = validateLifeEventDraft({
      ...makeValidDraft(),
      durationMonths: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.durationMonths).toBeTruthy();
  });

  it("does not require durationMonths for once cadence", () => {
    const result = validateLifeEventDraft({
      ...makeValidDraft(),
      cadence: "once",
      durationMonths: undefined,
    });
    expect(result.valid).toBe(true);
  });
});
