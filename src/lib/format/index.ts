export type YearMonth = `${number}-${string}`;

const EMPTY_VALUE = "?";
const MONTH_MIN = 1;
const MONTH_MAX = 12;
const COMPACT_UNIT = 10000;

const yenFormatter = new Intl.NumberFormat("ja-JP");
const yenCompactFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const percentFormatters = new Map<number, Intl.NumberFormat>();

type EmptyOptions = {
  showDashForEmpty?: boolean;
};

export type FormatYenOptions = EmptyOptions & {
  compact?: boolean;
  suffix?: string;
  sign?: "auto" | "always" | "never";
  zeroAsEmpty?: boolean;
};

export type FormatPercentOptions = EmptyOptions & {
  digits?: number;
};

const isEmptyValue = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value);

const formatCompactYen = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= COMPACT_UNIT) {
    return `${sign}${yenCompactFormatter.format(abs / COMPACT_UNIT)}万`;
  }
  return `${sign}${yenFormatter.format(abs)}`;
};

const getPercentFormatter = (digits: number) => {
  const safeDigits = Number.isFinite(digits) ? Math.max(0, digits) : 0;
  const cached = percentFormatters.get(safeDigits);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat("ja-JP", {
    style: "percent",
    minimumFractionDigits: safeDigits,
    maximumFractionDigits: safeDigits,
  });
  percentFormatters.set(safeDigits, formatter);
  return formatter;
};

export const formatYen = (
  value: number | null | undefined,
  options: FormatYenOptions = {}
) => {
  const {
    compact = false,
    suffix = "円",
    sign = "auto",
    showDashForEmpty = true,
    zeroAsEmpty = false,
  } = options;

  if (isEmptyValue(value) || (zeroAsEmpty && value === 0) || !value) {
    return showDashForEmpty ? EMPTY_VALUE : "";
  }

  let valueToFormat = value;
  let signPrefix = "";

  if (sign === "never") {
    valueToFormat = Math.abs(value);
  } else if (sign === "always") {
    if (value > 0) signPrefix = "+";
    if (value < 0) signPrefix = "-";
    valueToFormat = Math.abs(value);
  }

  const formatted = compact
    ? formatCompactYen(valueToFormat)
    : yenFormatter.format(valueToFormat);
  return `${signPrefix}${formatted}${suffix}`;
};

export const formatPercent = (
  value: number | null | undefined,
  options: FormatPercentOptions = {}
) => {
  const { digits = 1, showDashForEmpty = true } = options;

  if (isEmptyValue(value) || !value) {
    return showDashForEmpty ? EMPTY_VALUE : "";
  }

  return getPercentFormatter(digits).format(value);
};

export const formatYearMonth = (
  ym: string | null | undefined,
  options: EmptyOptions = {}
) => {
  const { showDashForEmpty = true } = options;

  if (!ym) {
    return showDashForEmpty ? EMPTY_VALUE : "";
  }

  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) {
    return showDashForEmpty ? EMPTY_VALUE : "";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < MONTH_MIN ||
    month > MONTH_MAX
  ) {
    return showDashForEmpty ? EMPTY_VALUE : "";
  }

  return `${year}年${month}月`;
};

export const toYearMonth = (date: Date): YearMonth => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
};

export const getCurrentYearMonth = () => toYearMonth(new Date());

export const prevYearMonth = (ym: YearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < MONTH_MIN ||
    month > MONTH_MAX
  ) {
    return undefined;
  }

  const prev = new Date(year, month - 2, 1);
  return toYearMonth(prev);
};

export const nextYearMonth = (ym: YearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < MONTH_MIN ||
    month > MONTH_MAX
  ) {
    return undefined;
  }

  const next = new Date(year, month, 1);
  return toYearMonth(next);
};

export const parseYenInput = (text: string) => {
  const normalized = text
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )
    .replace(/[，,]/g, "")
    .replace(/\s+/g, "")
    .replace(/円/g, "")
    .trim();

  if (!normalized) return undefined;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
};
