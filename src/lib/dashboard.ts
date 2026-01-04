import type {
  MonthlyRecord,
  HousingAssumptions,
  PlanVersion,
} from "./domain/types";

export const REQUIRED_HOUSING_TYPES = 4;

export interface NextAction {
  key: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
  secondaryCta?: {
    label: string;
    href: string;
  };
}

interface ComputeNextActionsArgs {
  currentMonthly: MonthlyRecord | null | undefined;
  housingAssumptions: HousingAssumptions[];
  eventCount: number;
  currentVersion: PlanVersion | null;
  planId: string;
}

export const computeNextActions = ({
  currentMonthly,
  housingAssumptions,
  eventCount,
  currentVersion,
  planId,
}: ComputeNextActionsArgs): NextAction[] => {
  const actions: NextAction[] = [];

  // Item A: 今月の家計を入力
  const isMonthlyDone = currentMonthly !== null && currentMonthly !== undefined;
  actions.push({
    key: "monthly",
    label: "今月の家計を入力",
    done: isMonthlyDone,
    href: `/plans/${planId}/months/current`,
    cta: isMonthlyDone ? "今月の家計を編集" : "今月の家計を入力",
  });

  // Item B: 住宅前提を設定
  const hasHousingAssumptions =
    housingAssumptions.length >= REQUIRED_HOUSING_TYPES;
  actions.push({
    key: "housing-assumptions",
    label: "住宅前提を設定",
    done: hasHousingAssumptions,
    href: `/plans/${planId}/housing/assumptions`,
    cta: "住宅前提を設定",
  });

  // Item C: 住宅タイプを選択
  const hasSelectedHousing =
    hasHousingAssumptions && housingAssumptions.some((item) => item.isSelected);
  if (hasHousingAssumptions) {
    actions.push({
      key: "housing-selection",
      label: "住宅タイプを選択",
      done: hasSelectedHousing,
      href: `/plans/${planId}/housing`,
      cta: "住宅LCC比較へ",
    });
  }

  // Item D: イベントを追加
  const hasEvents = eventCount > 0;
  actions.push({
    key: "events",
    label: "イベントを追加",
    done: hasEvents,
    href: `/plans/${planId}/events/new`,
    cta: "イベントを追加",
    secondaryCta: {
      label: "イベント一覧",
      href: `/plans/${planId}/events`,
    },
  });

  // Item E: 改定メモを残す
  if (currentVersion) {
    const hasRevisionMemo = Boolean(currentVersion.changeNote);
    actions.push({
      key: "revision-memo",
      label: "改定メモを残す",
      done: hasRevisionMemo,
      href: `/plans/${planId}/versions`,
      cta: "改定履歴を見る",
    });
  }

  // Sort and limit
  const sortedActions = actions.sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    return 0;
  });

  return sortedActions.slice(0, 3);
};
