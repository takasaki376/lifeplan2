export type LifeEventDraft = {
  title?: string;
  startYm?: string;
  amountYen?: string | number;
  direction?: "expense" | "income";
  cadence?: "once" | "monthly";
  durationMonths?: string | number;
};

export type LifeEventDraftField =
  | "title"
  | "startYm"
  | "amountYen"
  | "direction"
  | "cadence"
  | "durationMonths";

export type LifeEventDraftErrors = Partial<Record<LifeEventDraftField, string>>;

export const isValidYearMonth = (ym: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);

const parseNumberInput = (value: string | number | undefined) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const validateLifeEventDraft = (draft: LifeEventDraft) => {
  const errors: LifeEventDraftErrors = {};

  const title = draft.title?.trim() ?? "";
  if (!title) {
    errors.title = "イベント名を入力してください";
  }

  const startYm = draft.startYm?.trim() ?? "";
  if (!startYm) {
    errors.startYm = "発生月を選択してください";
  } else if (!isValidYearMonth(startYm)) {
    errors.startYm = "YYYY-MM 形式で入力してください";
  }

  if (!draft.direction) {
    errors.direction = "収支区分を選択してください";
  } else if (draft.direction !== "expense" && draft.direction !== "income") {
    errors.direction = "収支区分を選択してください";
  }

  if (!draft.cadence) {
    errors.cadence = "形態を選択してください";
  } else if (draft.cadence !== "once" && draft.cadence !== "monthly") {
    errors.cadence = "形態を選択してください";
  }

  const amount = parseNumberInput(draft.amountYen);
  if (amount === undefined) {
    errors.amountYen = "金額を入力してください";
  } else if (!Number.isInteger(amount)) {
    errors.amountYen = "金額は整数で入力してください";
  } else if (amount <= 0) {
    errors.amountYen = "金額は1円以上で入力してください";
  }

  if (draft.cadence === "monthly") {
    const duration = parseNumberInput(draft.durationMonths);
    if (duration === undefined) {
      errors.durationMonths = "期間（月数）を入力してください";
    } else if (!Number.isInteger(duration)) {
      errors.durationMonths = "期間（月数）は整数で入力してください";
    } else if (duration < 1) {
      errors.durationMonths = "期間（月数）は1以上で入力してください";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
