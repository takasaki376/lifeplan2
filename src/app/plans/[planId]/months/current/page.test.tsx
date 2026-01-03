import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MonthlyRecord, Plan } from "@/lib/domain/types";
import MonthlyInputSimplePage from "./page";

const planGetMock = vi.fn();
const monthlyGetByYmMock = vi.fn();
const monthlyUpsertByYmMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123" }),
  useRouter: () => ({ push: pushMock }),
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
      getByYm: monthlyGetByYmMock,
      upsertByYm: monthlyUpsertByYmMock,
    },
  }),
}));

vi.mock("@/lib/format", async () => {
  const actual = await vi.importActual<typeof import("@/lib/format")>(
    "@/lib/format",
  );
  return {
    ...actual,
    getCurrentYearMonth: () => "2026-01",
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
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

const makeRecord = (planId: string, ym = "2026-01"): MonthlyRecord => ({
  id: `record-${planId}`,
  planId,
  ym,
  incomeTotalYen: 100000,
  expenseTotalYen: 80000,
  assetsBalanceYen: 3000000,
  liabilitiesBalanceYen: 25000000,
  isFinalized: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-05T00:00:00.000Z",
});

describe("MonthlyInputSimplePage (current)", () => {
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
    monthlyGetByYmMock.mockReset();
    monthlyUpsertByYmMock.mockReset();
    pushMock.mockReset();
    planGetMock.mockResolvedValue(makePlan({ id: "plan-123", name: "テスト" }));
  });

  it("shows existing record values and status for current month", async () => {
    monthlyGetByYmMock.mockResolvedValue(makeRecord("plan-123"));

    render(<MonthlyInputSimplePage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "テスト" })).toBeInTheDocument(),
    );

    expect(screen.getByText("入力済み")).toBeInTheDocument();

    const inputs = screen.getAllByPlaceholderText("0");
    expect((inputs[0] as HTMLInputElement).value).toBe("100,000");
    expect((inputs[1] as HTMLInputElement).value).toBe("80,000");
    expect((inputs[2] as HTMLInputElement).value).toBe("3,000,000");
    expect((inputs[3] as HTMLInputElement).value).toBe("25,000,000");
  });

  it("saves input via upsertByYm for current month and navigates back", async () => {
    const user = userEvent.setup();
    monthlyGetByYmMock.mockResolvedValue(undefined);
    monthlyUpsertByYmMock.mockResolvedValue(makeRecord("plan-123"));

    render(<MonthlyInputSimplePage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "テスト" })).toBeInTheDocument(),
    );

    const inputs = screen.getAllByPlaceholderText("0");
    await user.type(inputs[0], "120000");
    await user.type(inputs[1], "90000");
    await user.type(inputs[2], "3500000");
    await user.type(inputs[3], "24000000");

    const saveButtons = screen.getAllByRole("button", { name: "保存して戻る" });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(monthlyUpsertByYmMock).toHaveBeenCalledWith(
        "plan-123",
        "2026-01",
        {
          incomeTotalYen: 120000,
          expenseTotalYen: 90000,
          assetsBalanceYen: 3500000,
          liabilitiesBalanceYen: 24000000,
          isFinalized: true,
        },
      );
    });

    expect(pushMock).toHaveBeenCalledWith("/plans/plan-123");
  });
});
