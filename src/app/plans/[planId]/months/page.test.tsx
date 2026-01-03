import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MonthlyRecord, Plan } from "@/lib/domain/types";
import MonthlyListPage from "./page";

const listByPlanMock = vi.fn();
const copyFromPreviousMonthMock = vi.fn();
const deleteByYmMock = vi.fn();
const planGetMock = vi.fn();

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
    monthly: {
      listByPlan: listByPlanMock,
      copyFromPreviousMonth: copyFromPreviousMonthMock,
      deleteByYm: deleteByYmMock,
    },
  }),
}));

vi.mock("@/lib/format", () => ({
  getCurrentYearMonth: () => "2026-01",
  formatYearMonth: (ym: string) => {
    const [year, month] = ym.split("-");
    return `${year}-${month}`;
  },
  formatYen: (value: number) => `${value}yen`,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
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

const makeRecord = (planId: string, ym: string): MonthlyRecord => ({
  id: `record-${ym}`,
  planId,
  ym,
  incomeTotalYen: 100000,
  expenseTotalYen: 80000,
  assetsBalanceYen: 3000000,
  liabilitiesBalanceYen: 25000000,
  isFinalized: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-05T00:00:00.000Z",
});

describe("MonthlyListPage", () => {
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
    listByPlanMock.mockReset();
    copyFromPreviousMonthMock.mockReset();
    deleteByYmMock.mockReset();
    planGetMock.mockResolvedValue(makePlan({ id: "plan-123", name: "Plan A" }));

    const records = [
      makeRecord("plan-123", "2026-01"),
      makeRecord("plan-123", "2026-03"),
      makeRecord("plan-123", "2025-12"),
    ];

    listByPlanMock.mockImplementation(
      (_planId: string, params?: { year?: number }) => {
        if (!params?.year) return Promise.resolve(records);
        return Promise.resolve(
          records.filter(
            (record) => Number(record.ym.slice(0, 4)) === params.year,
          ),
        );
      },
    );
  });

  it("renders month list with entered count and current month highlight", async () => {
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    expect(screen.getByText("2 / 12")).toBeInTheDocument();

    const monthLabels = screen.getAllByText(/^2026-/);
    expect(monthLabels.length).toBeGreaterThanOrEqual(12);
  });

  it("filters missing months to hide entered actions", async () => {
    const user = userEvent.setup();
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[1]);

    await waitFor(() =>
      expect(screen.queryByTestId("month-actions-2026-01")).toBeNull(),
    );
  });
  it("copies previous month from the action menu", async () => {
    const user = userEvent.setup();
    copyFromPreviousMonthMock.mockResolvedValue(makeRecord("plan-123", "2026-02"));
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("month-actions-2026-02"));
    await user.click(screen.getByTestId("month-copy-2026-02"));

    await waitFor(() =>
      expect(copyFromPreviousMonthMock).toHaveBeenCalledWith(
        "plan-123",
        "2026-02",
      ),
    );
  });

  it("deletes a month after confirmation", async () => {
    const user = userEvent.setup();
    deleteByYmMock.mockResolvedValue(undefined);
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("month-actions-2026-01"));
    await user.click(screen.getByTestId("month-delete-2026-01"));
    await user.click(screen.getByTestId("confirm-delete"));

    await waitFor(() =>
      expect(deleteByYmMock).toHaveBeenCalledWith("plan-123", "2026-01"),
    );
  });
});
