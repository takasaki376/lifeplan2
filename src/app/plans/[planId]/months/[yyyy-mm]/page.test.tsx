import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthlyInputSpecificMonthPage from "./page";

const planGetMock = vi.fn();
const monthlyGetByYmMock = vi.fn();
const monthlyUpsertByYmMock = vi.fn();
const pushMock = vi.fn();
let searchParamsInstance = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123", "yyyy-mm": "2026-01" }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsInstance,
  usePathname: () => "/plans/plan-123/months/2026-01",
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
    monthly: {
      getByYm: monthlyGetByYmMock,
      upsertByYm: monthlyUpsertByYmMock,
    },
  }),
}));

describe("MonthlyInputSpecificMonthPage balance display", () => {
  const getIncomeInput = () =>
    screen.getAllByRole("textbox", { name: "収入合計" })[0];
  const getExpenseInput = () =>
    screen.getAllByRole("textbox", { name: "支出合計" })[0];
  const getBalanceEl = () =>
    screen
      .getAllByTestId("monthly-net-balance")
      .find((node) => node.textContent && node.textContent.length > 0) ??
    screen.getAllByTestId("monthly-net-balance")[0];

  beforeEach(() => {
    planGetMock.mockReset();
    monthlyGetByYmMock.mockReset();
    monthlyUpsertByYmMock.mockReset();
    pushMock.mockReset();

    planGetMock.mockResolvedValue({ id: "plan-123", name: "Plan A" });
    monthlyGetByYmMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    searchParamsInstance = new URLSearchParams();
  });

  it("shows balance when both income and expense are entered", async () => {
    const user = userEvent.setup();
    const { container } = render(<MonthlyInputSpecificMonthPage />);

    await waitFor(() => expect(getIncomeInput()).toBeInTheDocument());

    await user.type(getIncomeInput(), "300000");
    await user.type(getExpenseInput(), "200000");

    const balanceEl = getBalanceEl();
    expect(balanceEl).toBeTruthy();
    expect(balanceEl.textContent).toBe("+100,000円");
  });

  it("shows empty placeholder when either field is empty", async () => {
    const user = userEvent.setup();
    const { container } = render(<MonthlyInputSpecificMonthPage />);

    await waitFor(() => expect(getIncomeInput()).toBeInTheDocument());

    await user.type(getExpenseInput(), "120000");

    const balanceEl = screen.getAllByTestId("monthly-net-balance")[0];
    expect(balanceEl).toBeTruthy();
    expect(balanceEl.textContent).toBe("");
  });

  it("changes balance color for positive and negative values", async () => {
    const user = userEvent.setup();
    const { container } = render(<MonthlyInputSpecificMonthPage />);

    await waitFor(() => expect(getIncomeInput()).toBeInTheDocument());

    await user.type(getIncomeInput(), "100000");
    await user.type(getExpenseInput(), "20000");

    let balanceEl = getBalanceEl();
    expect(balanceEl).toBeTruthy();
    expect(balanceEl.className).toContain("text-green-600");

    await user.clear(getIncomeInput());
    await user.clear(getExpenseInput());
    await user.type(getIncomeInput(), "50000");
    await user.type(getExpenseInput(), "120000");

    balanceEl = getBalanceEl();
    expect(balanceEl).toBeTruthy();
    expect(balanceEl.className).toContain("text-red-600");
  });

  it("displays correct sign prefix for positive and negative balance", async () => {
    const user = userEvent.setup();
    const { container } = render(<MonthlyInputSpecificMonthPage />);

    await waitFor(() => expect(getIncomeInput()).toBeInTheDocument());

    await user.type(getIncomeInput(), "90000");
    await user.type(getExpenseInput(), "10000");

    let balanceEl = getBalanceEl();
    expect(balanceEl.textContent?.startsWith("+")).toBe(true);

    await user.clear(getIncomeInput());
    await user.clear(getExpenseInput());
    await user.type(getIncomeInput(), "5000");
    await user.type(getExpenseInput(), "9000");

    balanceEl = getBalanceEl();
    expect(balanceEl.textContent?.startsWith("-")).toBe(true);
  });
});
