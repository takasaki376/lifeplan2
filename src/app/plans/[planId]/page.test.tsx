import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type {
  HousingAssumptions,
  LifeEvent,
  MonthlyRecord,
  Plan,
  PlanVersion,
} from "@/lib/domain/types";
import PlanDashboardPage from "./page";

const planGetMock = vi.fn();
const versionGetCurrentMock = vi.fn();
const monthlyGetByYmMock = vi.fn();
const housingListByVersionMock = vi.fn();
const eventListByVersionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123" }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/repo/factory", () => ({
  createRepositories: () => ({
    plan: {
      get: planGetMock,
    },
    version: {
      getCurrent: versionGetCurrentMock,
    },
    monthly: {
      getByYm: monthlyGetByYmMock,
    },
    housing: {
      listByVersion: housingListByVersionMock,
    },
    event: {
      listByVersion: eventListByVersionMock,
    },
  }),
}));

vi.mock("@/lib/format", () => ({
  getCurrentYearMonth: () => "2026-01",
  formatYearMonth: (ym: string) => {
    const [year, month] = ym.split("-");
    return `${year}年${month}月`;
  },
}));

const makePlan = (partial: Partial<Plan> & Pick<Plan, "id" | "name">): Plan => {
  const now = "2026-01-02T00:00:00.000Z";
  return {
    id: partial.id,
    name: partial.name,
    status: partial.status ?? "active",
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    householdType: partial.householdType,
    note: partial.note,
    userId: partial.userId,
    currentVersionId: partial.currentVersionId,
    archivedAt: partial.archivedAt,
  };
};

const makeVersion = (
  partial: Partial<PlanVersion> & Pick<PlanVersion, "id" | "planId" | "versionNo">,
): PlanVersion => ({
  id: partial.id,
  planId: partial.planId,
  versionNo: partial.versionNo,
  title: partial.title,
  changeNote: partial.changeNote,
  incomeMonthlyYen: partial.incomeMonthlyYen,
  assetsBalanceYen: partial.assetsBalanceYen,
  liabilitiesBalanceYen: partial.liabilitiesBalanceYen,
  isCurrent: partial.isCurrent ?? true,
  createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
});

const makeMonthly = (planId: string): MonthlyRecord => ({
  id: "monthly-1",
  planId,
  ym: "2026-01",
  incomeTotalYen: 400000,
  expenseTotalYen: 350000,
  assetsBalanceYen: 2000000,
  liabilitiesBalanceYen: 15000000,
  isFinalized: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

const makeHousing = (
  planVersionId: string,
  housingType: HousingAssumptions["housingType"],
  isSelected: boolean,
): HousingAssumptions => ({
  id: `${planVersionId}-${housingType}`,
  planVersionId,
  housingType,
  isSelected,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const makeEvent = (planVersionId: string, id: string): LifeEvent => ({
  id,
  planVersionId,
  eventType: "education",
  title: "保育料",
  startYm: "2026-04",
  cadence: "monthly",
  durationMonths: 12,
  amountYen: 40000,
  direction: "expense",
  note: "認可保育園",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("PlanDashboardPage", () => {
  beforeAll(() => {
    if (!("ResizeObserver" in globalThis)) {
      class ResizeObserverMock {
        observe(_target: Element) {}
        unobserve(_target: Element) {}
        disconnect() {}
      }
      globalThis.ResizeObserver =
        ResizeObserverMock as unknown as typeof ResizeObserver;
    }
    if (!window.matchMedia) {
      window.matchMedia = () =>
        ({
          matches: false,
          media: "",
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList;
    }
  });

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    planGetMock.mockReset();
    versionGetCurrentMock.mockReset();
    monthlyGetByYmMock.mockReset();
    housingListByVersionMock.mockReset();
    eventListByVersionMock.mockReset();

    planGetMock.mockResolvedValue(makePlan({ id: "plan-123", name: "Plan A" }));
    versionGetCurrentMock.mockResolvedValue(
      makeVersion({ id: "ver-1", planId: "plan-123", versionNo: 1 }),
    );
    monthlyGetByYmMock.mockResolvedValue(makeMonthly("plan-123"));
    housingListByVersionMock.mockResolvedValue([]);
    eventListByVersionMock.mockResolvedValue([]);
  });

  it("shows not found state when plan is missing", async () => {
    planGetMock.mockResolvedValue(undefined);
    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText("プランが見つかりません"),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole("link", { name: "プラン一覧へ戻る" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows onboarding card when current month data is missing", async () => {
    monthlyGetByYmMock.mockResolvedValue(undefined);
    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText("まずは今月の合計を入力しましょう"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "今月を入力" })).toHaveAttribute(
      "href",
      "/plans/plan-123/months/current",
    );
  });

  it("shows housing setup CTA when assumptions are missing", async () => {
    housingListByVersionMock.mockResolvedValue([]);
    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText("住宅LCC比較を使うには前提の設定が必要です"),
      ).toBeInTheDocument(),
    );
  });

  it("shows housing selection CTA when no type is selected", async () => {
    housingListByVersionMock.mockResolvedValue([
      makeHousing("ver-1", "high_performance_home", false),
      makeHousing("ver-1", "detached", false),
      makeHousing("ver-1", "condo", false),
      makeHousing("ver-1", "rent", false),
    ]);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText("比較する住宅タイプを選択しましょう"),
      ).toBeInTheDocument(),
    );
  });

  it("shows events CTA when no events exist", async () => {
    housingListByVersionMock.mockResolvedValue([
      makeHousing("ver-1", "high_performance_home", true),
      makeHousing("ver-1", "detached", false),
      makeHousing("ver-1", "condo", false),
      makeHousing("ver-1", "rent", false),
    ]);
    eventListByVersionMock.mockResolvedValue([]);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText("イベントを追加すると見通しが良くなります"),
      ).toBeInTheDocument(),
    );
  });

  it("renders upcoming events when data is ready", async () => {
    housingListByVersionMock.mockResolvedValue([
      makeHousing("ver-1", "high_performance_home", true),
      makeHousing("ver-1", "detached", false),
      makeHousing("ver-1", "condo", false),
      makeHousing("ver-1", "rent", false),
    ]);
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "event-1"),
      makeEvent("ver-1", "event-2"),
    ]);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getAllByText("保育料").length).toBeGreaterThan(0),
    );
    expect(
      screen.queryByText("まずは今月の合計を入力しましょう"),
    ).toBeNull();
  });
});
