import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MonthlyRecord, Plan } from "@/lib/domain/types";
import { RepoNotFoundError } from "@/lib/repo/types";
import { toast } from "sonner";
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

const toastMock = vi.mocked(toast);

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
    toastMock.error.mockReset();
    toastMock.info.mockReset();
    toastMock.success.mockReset();
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

    const monthLabel = screen.getByText("2026-01");
    const labelContainer = monthLabel.parentElement;
    expect(labelContainer).not.toBeNull();
    expect(within(labelContainer as HTMLElement).getByText("今月")).toBeInTheDocument();

    const monthLabels = screen.getAllByText(/^2026-/);
    expect(monthLabels.length).toBeGreaterThanOrEqual(12);
  });

  it("switches year selection and reloads records", async () => {
    const user = userEvent.setup();
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "2025" }));

    await waitFor(() =>
      expect(listByPlanMock).toHaveBeenLastCalledWith("plan-123", {
        year: 2025,
        sort: "ymAsc",
      }),
    );
    expect(screen.getByText("2025-12")).toBeInTheDocument();
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

  it("filters entered months and shows edit actions", async () => {
    const user = userEvent.setup();
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[2]);

    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: "編集" }).length,
      ).toBeGreaterThan(0),
    );
    expect(screen.queryByText("入力する")).toBeNull();
  });

  it("shows input/edit/detail actions for each month", async () => {
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    const inputLinks = screen.getAllByRole("link", { name: "入力する" });
    expect(inputLinks.some((link) => link.getAttribute("href") === "/plans/plan-123/months/2026-02")).toBe(true);

    const editLinks = screen.getAllByRole("link", { name: "編集" });
    expect(editLinks.some((link) => link.getAttribute("href") === "/plans/plan-123/months/2026-01")).toBe(true);

    const detailLinks = screen.getAllByRole("link", { name: "詳細" });
    expect(detailLinks.some((link) => link.getAttribute("href") === "/plans/plan-123/months/2026-01/detail")).toBe(true);
  });

  it("shows toast on list load failure", async () => {
    listByPlanMock.mockRejectedValueOnce(new Error("load error"));
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument(),
    );
    expect(toastMock.error).toHaveBeenCalledWith(
      "月次データの読み込みに失敗しました",
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
    expect(toastMock.success).toHaveBeenCalledWith("前月コピーが完了しました");
  });

  it("shows toast when previous month copy fails", async () => {
    const user = userEvent.setup();
    copyFromPreviousMonthMock.mockRejectedValueOnce(new Error("copy error"));
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("month-actions-2026-02"));
    await user.click(screen.getByTestId("month-copy-2026-02"));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("前月コピーに失敗しました"),
    );
  });

  it("shows info toast when previous month data is missing", async () => {
    const user = userEvent.setup();
    copyFromPreviousMonthMock.mockRejectedValueOnce(
      new RepoNotFoundError("monthly_copy_source", "missing"),
    );
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("month-actions-2026-02"));
    await user.click(screen.getByTestId("month-copy-2026-02"));

    await waitFor(() =>
      expect(toastMock.info).toHaveBeenCalledWith("前月のデータが見つかりません"),
    );
  });

  it("updates list after copying previous month", async () => {
    const user = userEvent.setup();
    const records = [
      makeRecord("plan-123", "2026-01"),
      makeRecord("plan-123", "2026-03"),
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
    copyFromPreviousMonthMock.mockImplementation(async () => {
      records.push(makeRecord("plan-123", "2026-02"));
    });

    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("month-actions-2026-02"));
    await user.click(screen.getByTestId("month-copy-2026-02"));

    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: "編集" }).some(
          (link) => link.getAttribute("href") === "/plans/plan-123/months/2026-02",
        ),
      ).toBe(true),
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
    expect(toastMock.success).toHaveBeenCalledWith("月次データを削除しました");
  });

  it("shows toast when delete fails", async () => {
    const user = userEvent.setup();
    deleteByYmMock.mockRejectedValueOnce(new Error("delete error"));
    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("month-actions-2026-01"));
    await user.click(screen.getByTestId("month-delete-2026-01"));
    await user.click(screen.getByTestId("confirm-delete"));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "月次データの削除に失敗しました",
      ),
    );
  });

  it("updates list after delete and reflects filters", async () => {
    const user = userEvent.setup();
    const records = [
      makeRecord("plan-123", "2026-01"),
      makeRecord("plan-123", "2026-03"),
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
    deleteByYmMock.mockImplementation(async (_planId: string, ym: string) => {
      const index = records.findIndex((record) => record.ym === ym);
      if (index >= 0) records.splice(index, 1);
    });

    render(<MonthlyListPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("month-actions-2026-01"));
    await user.click(screen.getByTestId("month-delete-2026-01"));
    await user.click(screen.getByTestId("confirm-delete"));

    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: "入力する" }).some(
          (link) => link.getAttribute("href") === "/plans/plan-123/months/2026-01",
        ),
      ).toBe(true),
    );

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[1]);
    await waitFor(() =>
      expect(screen.getByText("2026-01")).toBeInTheDocument(),
    );
  });
});
