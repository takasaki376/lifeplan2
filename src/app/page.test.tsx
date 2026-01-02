import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MonthlyRecord, Plan } from "@/lib/domain/types";
import PlansListPage from "./page";

const listMock = vi.fn();
const getByYmMock = vi.fn();
const archiveMock = vi.fn();
const restoreMock = vi.fn();

vi.mock("@/lib/repo/factory", () => ({
  createRepositories: () => ({
    plan: {
      list: listMock,
      archive: archiveMock,
      restore: restoreMock,
    },
    monthly: {
      getByYm: getByYmMock,
    },
  }),
}));

vi.mock("@/lib/format", () => ({
  getCurrentYearMonth: () => "2026-01",
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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
  isFinalized: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("PlansListPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    listMock.mockReset();
    getByYmMock.mockReset();
    archiveMock.mockReset();
    restoreMock.mockReset();
    listMock.mockResolvedValue([
      makePlan({ id: "plan-a", name: "Plan Alpha", status: "active" }),
      makePlan({ id: "plan-b", name: "Plan Beta", status: "archived" }),
      makePlan({
        id: "plan-c",
        name: "Plan Gamma",
        status: "active",
        updatedAt: "2026-01-03T00:00:00.000Z",
      }),
    ]);
    getByYmMock.mockImplementation((planId: string) => {
      if (planId === "plan-a") return Promise.resolve(makeRecord(planId));
      return Promise.resolve(undefined);
    });
  });

  const headingCount = (name: string) =>
    screen.queryAllByRole("heading", { name }).length;

  it("renders active plans by default", async () => {
    render(<PlansListPage />);

    await waitFor(() =>
      expect(headingCount("Plan Alpha")).toBeGreaterThan(0),
    );

    expect(headingCount("Plan Gamma")).toBeGreaterThan(0);
    expect(headingCount("Plan Beta")).toBe(0);
  });

  it("filters by search query (name only)", async () => {
    const user = userEvent.setup();
    render(<PlansListPage />);

    await waitFor(() =>
      expect(headingCount("Plan Alpha")).toBeGreaterThan(0),
    );

    const searchBox = screen.getAllByRole("searchbox")[0];
    await user.type(searchBox, "Gamma");

    await waitFor(() => expect(headingCount("Plan Gamma")).toBeGreaterThan(0));
    await waitFor(() => expect(headingCount("Plan Alpha")).toBe(0));
  });

  it("filters pending tab by needsInput", async () => {
    const user = userEvent.setup();
    render(<PlansListPage />);

    await waitFor(() =>
      expect(headingCount("Plan Alpha")).toBeGreaterThan(0),
    );

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[1]);

    await waitFor(() => expect(headingCount("Plan Gamma")).toBeGreaterThan(0));
    await waitFor(() => expect(headingCount("Plan Alpha")).toBe(0));
  });

  it("shows archived plans in archived tab", async () => {
    const user = userEvent.setup();
    render(<PlansListPage />);

    await waitFor(() =>
      expect(headingCount("Plan Alpha")).toBeGreaterThan(0),
    );

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[3]);

    await waitFor(() => expect(headingCount("Plan Beta")).toBeGreaterThan(0));
    await waitFor(() => expect(headingCount("Plan Alpha")).toBe(0));
  });
});
