export type EventTypeKey =
  | "birth"
  | "education"
  | "job_change"
  | "retirement"
  | "care"
  | "housing"
  | "other";

export const EVENT_TYPE_LABELS: Record<EventTypeKey, string> = {
  birth: "出産",
  education: "教育",
  job_change: "転職",
  retirement: "退職",
  care: "介護",
  housing: "住宅",
  other: "その他",
};
