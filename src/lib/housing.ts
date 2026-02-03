import type { HousingType } from "./domain/types";

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  high_performance_home: "高性能住宅",
  detached: "一般戸建",
  condo: "分譲マンション",
  rent: "賃貸",
};

export const getHousingTypeLabel = (type: HousingType | string) => {
  if (type in HOUSING_TYPE_LABELS) {
    return HOUSING_TYPE_LABELS[type as HousingType];
  }
  return type;
};
