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
import type { LifeEvent, Plan, PlanVersion } from "@/lib/domain/types";
import EventsPage from "./page";

const planGetMock = vi.fn();
const versionGetCurrentMock = vi.fn();
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
    event: {
      listByVersion: eventListByVersionMock,
    },
  }),
}));

vi.mock("@/lib/format", () => ({
  getCurrentYearMonth: () => "2026-01",
  formatYearMonth: (ym: string) => {
    const [year, month] = ym.split("-");
    return `${year}年${Number(month)}月`;
  },
  formatYen: (value: number) => `¥${value}`,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
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
    Pick<PlanVersion, "id" | "planId" | "versionNo">,
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

const makeEvent = (
  planVersionId: string,
  id: string,
  overrides: Partial<LifeEvent> = {},
): LifeEvent => ({
  id,
  planVersionId,
  eventType: "education",
  title: "イベントA",
  startYm: "2026-02",
  cadence: "monthly",
  amountYen: 40000,
  direction: "expense",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("EventsPage", () => {
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
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    planGetMock.mockReset();
    versionGetCurrentMock.mockReset();
    eventListByVersionMock.mockReset();

    planGetMock.mockResolvedValue(makePlan({ id: "plan-123", name: "Plan A" }));
    versionGetCurrentMock.mockResolvedValue(
      makeVersion({ id: "ver-1", planId: "plan-123", versionNo: 1 }),
    );
    eventListByVersionMock.mockResolvedValue([]);
  });

  it("shows loading state while fetching", () => {
    planGetMock.mockReturnValue(new Promise(() => {}));
    render(<EventsPage />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("shows error state when loading fails", async () => {
    planGetMock.mockRejectedValue(new Error("load error"));
    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("イベントの取得に失敗しました"),
    ).toBeInTheDocument();
  });

  it("renders events for the current version", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "event-1", { title: "入学準備" }),
    ]);

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText("入学準備").length).toBeGreaterThan(0),
    );
    expect(versionGetCurrentMock).toHaveBeenCalledWith("plan-123");
    expect(eventListByVersionMock).toHaveBeenCalledWith("ver-1", {
      scope: "all",
    });
  });

  it("filters events by time tabs", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "past", { title: "過去イベント", startYm: "2025-12" }),
      makeEvent("ver-1", "current", {
        title: "今月イベント",
        startYm: "2026-01",
      }),
      makeEvent("ver-1", "future", {
        title: "今後イベント",
        startYm: "2026-02",
      }),
    ]);

    const { container } = render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText("今後イベント").length).toBeGreaterThan(0),
    );
    expect(
      container.querySelector('a[href="/plans/plan-123/events/past/edit"]'),
    ).toBeNull();

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "過去" }));
    expect(
      container.querySelector('a[href="/plans/plan-123/events/past/edit"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/plans/plan-123/events/future/edit"]'),
    ).toBeNull();

    await user.click(screen.getByRole("tab", { name: "すべて" }));
    expect(
      container.querySelector('a[href="/plans/plan-123/events/past/edit"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/plans/plan-123/events/future/edit"]'),
    ).toBeTruthy();
  });

  it("filters events by type", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "education", {
        title: "教育イベント",
        eventType: "education",
      }),
      makeEvent("ver-1", "housing", {
        title: "住宅イベント",
        eventType: "housing",
      }),
    ]);

    const { container } = render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText("教育イベント").length).toBeGreaterThan(0),
    );

    const user = userEvent.setup();
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "教育" }));

    expect(
      container.querySelector(
        'a[href="/plans/plan-123/events/education/edit"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/plans/plan-123/events/housing/edit"]'),
    ).toBeNull();
  });

  it("filters events by cadence", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "once", {
        title: "単発イベント",
        cadence: "once",
      }),
      makeEvent("ver-1", "monthly", {
        title: "毎月イベント",
        cadence: "monthly",
      }),
    ]);

    const { container } = render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText("単発イベント").length).toBeGreaterThan(0),
    );

    const user = userEvent.setup();
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[1]);
    await user.click(screen.getByRole("option", { name: "毎月" }));

    expect(
      container.querySelector('a[href="/plans/plan-123/events/monthly/edit"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/plans/plan-123/events/once/edit"]'),
    ).toBeNull();
  });

  it("shows empty state when no events exist", async () => {
    eventListByVersionMock.mockResolvedValue([]);

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getByText("イベントがまだありません")).toBeInTheDocument(),
    );
    const links = screen.getAllByRole("link", { name: "イベントを追加" });
    expect(
      links.some(
        (link) => link.getAttribute("href") === "/plans/plan-123/events/new",
      ),
    ).toBe(true);
  });

  it("shows empty state when filters exclude all events", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "event-1", { title: "教育イベント" }),
    ]);

    render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText("教育イベント").length).toBeGreaterThan(0),
    );

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText("イベント名で検索"),
      "存在しない",
    );

    expect(
      screen.getByText("条件に合うイベントがありません"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "フィルタをリセット" }),
    ).toBeInTheDocument();
  });

  it("renders event edit links", async () => {
    eventListByVersionMock.mockResolvedValue([
      makeEvent("ver-1", "event-1", { title: "編集対象" }),
    ]);

    const { container } = render(<EventsPage />);

    await waitFor(() =>
      expect(screen.getAllByText("編集対象").length).toBeGreaterThan(0),
    );

    expect(
      container.querySelector('a[href="/plans/plan-123/events/event-1/edit"]'),
    ).toBeTruthy();
  });
});
