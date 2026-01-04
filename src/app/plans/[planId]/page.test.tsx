import React from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerMock = {
  push: pushMock,
  replace: replaceMock,
};
let searchParamsInstance = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123" }),
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsInstance,
  usePathname: () => "/plans/plan-123",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
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

type FormatYenOptions = {
  showDashForEmpty?: boolean;
  sign?: "always" | "never" | "auto";
};

vi.mock("@/lib/format", () => ({
  getCurrentYearMonth: () => "2026-01",
  formatYearMonth: (ym: string) => {
    const [year, month] = ym.split("-");
    return `${year}年${Number(month)}月`;
  },
  formatYen: (value: number | null | undefined, options?: FormatYenOptions) => {
    const showDash = options?.showDashForEmpty ?? true;
    if (value === null || value === undefined) {
      return showDash ? "-" : "";
    }
    const sign = options?.sign ?? "auto";
    const formatted = `${Math.abs(value)}`;
    const suffix = options?.suffix ?? "円";
    if (sign === "always") {
      return value >= 0 ? `+${formatted}${suffix}` : `-${formatted}${suffix}`;
    }
    if (sign === "never") {
      return `${formatted}${suffix}`;
    }
    return value >= 0 ? `${formatted}${suffix}` : `-${formatted}${suffix}`;
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
  partial: Partial<PlanVersion> &
    Pick<PlanVersion, "id" | "planId" | "versionNo">
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
  isSelected: boolean
): HousingAssumptions => ({
  id: `${planVersionId}-${housingType}`,
  planVersionId,
  housingType,
  isSelected,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const makeEvent = (
  planVersionId: string,
  id: string,
  overrides: Partial<LifeEvent> = {}
): LifeEvent => ({
  id,
  planVersionId,
  eventType: "education",
  title: "保育準備",
  startYm: "2026-04",
  cadence: "monthly",
  durationMonths: 12,
  amountYen: 40000,
  direction: "expense",
  note: "認可保育園",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
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
        } as MediaQueryList);
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
    pushMock.mockReset();
    replaceMock.mockReset();
    searchParamsInstance = new URLSearchParams();

    planGetMock.mockResolvedValue(makePlan({ id: "plan-123", name: "Plan A" }));
    versionGetCurrentMock.mockResolvedValue(
      makeVersion({ id: "ver-1", planId: "plan-123", versionNo: 1 })
    );
    monthlyGetByYmMock.mockResolvedValue(makeMonthly("plan-123"));
    housingListByVersionMock.mockResolvedValue([]);
    eventListByVersionMock.mockResolvedValue([]);
  });

  it("shows not found state when plan is missing", async () => {
    planGetMock.mockResolvedValue(undefined);
    const { container } = render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("プランが見つかりません")).toBeInTheDocument()
    );

    expect(container.querySelector('a[href="/"]')).toBeTruthy();
  });

  it("shows loading state while data is being fetched", () => {
    planGetMock.mockReturnValue(new Promise(() => {}));
    versionGetCurrentMock.mockReturnValue(new Promise(() => {}));

    render(<PlanDashboardPage />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("shows error state when loading fails", async () => {
    planGetMock.mockRejectedValue(new Error("load error"));
    const { container } = render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getAllByText("読み込みに失敗しました").length
      ).toBeGreaterThan(0)
    );
    expect(container.querySelector('a[href="/"]')).toBeTruthy();
  });

  it("shows onboarding card when current month data is missing", async () => {
    monthlyGetByYmMock.mockResolvedValue(undefined);
    const { container } = render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        container.querySelector('a[href="/plans/plan-123/months/current"]')
      ).toBeTruthy()
    );
  });

  it("shows monthly status as completed when record exists even if not finalized", async () => {
    monthlyGetByYmMock.mockResolvedValue({
      ...makeMonthly("plan-123"),
      isFinalized: false,
    });

    const { container } = render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("入力済み")).toBeInTheDocument()
    );
    expect(
      container.querySelector('a[href="/plans/plan-123/months/current"]')
    ).toBeTruthy();
  });

  it("shows housing setup CTA when assumptions are missing", async () => {
    housingListByVersionMock.mockResolvedValue([]);
    const { container } = render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        container.querySelector('a[href="/plans/plan-123/housing/assumptions"]')
      ).toBeTruthy()
    );
    expect(
      container.querySelector('a[href="/plans/plan-123/housing"]')
    ).toBeTruthy();
  });

  it("shows housing setup CTA when assumptions are incomplete", async () => {
    housingListByVersionMock.mockResolvedValue([
      makeHousing("ver-1", "high_performance_home", true),
      makeHousing("ver-1", "detached", false),
      makeHousing("ver-1", "condo", false),
    ]);
    const { container } = render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        container.querySelector('a[href="/plans/plan-123/housing/assumptions"]')
      ).toBeTruthy()
    );
  });

  it("shows housing selection CTA when no type is selected", async () => {
    housingListByVersionMock.mockResolvedValue([
      makeHousing("ver-1", "high_performance_home", false),
      makeHousing("ver-1", "detached", false),
      makeHousing("ver-1", "condo", false),
      makeHousing("ver-1", "rent", false),
    ]);
    const { container } = render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        container.querySelector('a[href="/plans/plan-123/housing"]')
      ).toBeTruthy()
    );
  });

  it("shows empty state and add CTA when no events exist", async () => {
    housingListByVersionMock.mockResolvedValue([
      makeHousing("ver-1", "high_performance_home", true),
      makeHousing("ver-1", "detached", false),
      makeHousing("ver-1", "condo", false),
      makeHousing("ver-1", "rent", false),
    ]);
    eventListByVersionMock.mockResolvedValue([]);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("イベントがまだありません")).toBeInTheDocument()
    );
    const eventLinks = screen.getAllByRole("link", { name: "イベントを追加" });
    expect(
      eventLinks.some(
        (link) => link.getAttribute("href") === "/plans/plan-123/events/new"
      )
    ).toBe(true);
  });

  it("shows empty state when only past events exist", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "event-1", { startYm: "2025-12" }),
    ]);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("今後のイベントがありません")).toBeInTheDocument()
    );
  });

  it("renders upcoming events sorted and limited to three", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "event-1", { title: "イベントC", startYm: "2026-05" }),
      makeEvent("ver-1", "event-2", { title: "イベントA", startYm: "2026-02" }),
      makeEvent("ver-1", "event-3", { title: "イベントB", startYm: "2026-03" }),
      makeEvent("ver-1", "event-4", { title: "イベントD", startYm: "2026-06" }),
    ]);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getAllByText("イベントA").length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText("イベントB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("イベントC").length).toBeGreaterThan(0);
    expect(screen.queryByText("イベントD")).not.toBeInTheDocument();
    const eventLinks = screen
      .getAllByRole("link", {
        name: /イベント(?:A|B|C)/,
      })
      .filter((link) => link.getAttribute("aria-label"));
    expect(
      eventLinks.map(
        (link) =>
          link.getAttribute("aria-label") ||
          link.textContent?.trim().replace(/\s+/g, " ")
      )
    ).toEqual(["イベントAを編集", "イベントBを編集", "イベントCを編集"]);
    expect(screen.getByRole("link", { name: "もっと見る" })).toHaveAttribute(
      "href",
      "/plans/plan-123/events"
    );
  });

  const makeFooterEvents = (count: number) =>
    Array.from({ length: count }, (_, idx) =>
      makeEvent("ver-1", `event-footer-${idx + 1}`, {
        title: `Footer Event ${idx + 1}`,
        startYm: `2026-${(idx + 2).toString().padStart(2, "0")}`,
      })
    );

  it.each([1, 2, 3])(
    "shows event footer without more link when there are %i upcoming events",
    async (count) => {
      eventListByVersionMock.mockResolvedValue(makeFooterEvents(count));

      render(<PlanDashboardPage />);

      await waitFor(() =>
        expect(screen.getByText("Footer Event 1")).toBeInTheDocument()
      );
      expect(
        screen.getByRole("link", { name: "イベントを追加" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "もっと見る" })
      ).not.toBeInTheDocument();
    }
  );

  it("falls back to event type label when title is empty", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "event-blank", { title: "" }),
    ]);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /教育/ })).toBeInTheDocument()
    );
  });

  it("links each upcoming event row to edit", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "event-1", { title: "編集対象" }),
    ]);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getAllByText("編集対象").length).toBeGreaterThan(0)
    );
    expect(screen.getByRole("link", { name: /編集対象/ })).toHaveAttribute(
      "href",
      "/plans/plan-123/events/event-1/edit"
    );
  });

  it("shows the events list link in the header", async () => {
    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "イベント一覧" })
      ).toHaveAttribute("href", "/plans/plan-123/events")
    );
  });

  it("shows version missing state only in the events card", async () => {
    versionGetCurrentMock.mockResolvedValue(undefined);

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("現行バージョンがありません")).toBeInTheDocument()
    );
    expect(screen.getByRole("link", { name: "改定を作成" })).toHaveAttribute(
      "href",
      "/plans/plan-123/versions/new"
    );
  });

  it("shows event fetch error alert when event listing fails", async () => {
    eventListByVersionMock.mockRejectedValue(new Error("db error"));

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText("イベントの取得に失敗しました")
      ).toBeInTheDocument()
    );
  });

  it("honors scenario query parameter for the outlook card", async () => {
    searchParamsInstance = new URLSearchParams("scenario=optimistic");

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("シナリオ: 楽観")).toBeInTheDocument()
    );
  });

  it("falls back to base scenario when an invalid scenario is specified in query parameter", async () => {
    searchParamsInstance = new URLSearchParams("scenario=invalid");

    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("シナリオ: 標準")).toBeInTheDocument()
    );
  });

  it("replaces the URL when scenario tab changes", async () => {
    const user = userEvent.setup();
    render(<PlanDashboardPage />);

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "保守" })).toBeInTheDocument()
    );

    await user.click(screen.getByRole("tab", { name: "保守" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    const calledArg =
      replaceMock.mock.calls[0]?.[0] ?? replaceMock.mock.calls[0]?.[0];
    const normalizedArg = Array.isArray(calledArg) ? calledArg[0] : calledArg;
    expect(normalizedArg).toBe("/plans/plan-123?scenario=conservative");
  });
});
