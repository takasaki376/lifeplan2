import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthlyDetailPage from "./page";

const planGetMock = vi.fn();
const monthlyGetByYmMock = vi.fn();
const monthlyListItemsMock = vi.fn();
const monthlyReplaceItemsMock = vi.fn();
const monthlyUpsertByYmMock = vi.fn();
const pushMock = vi.fn();
let searchParamsInstance = new URLSearchParams();
let uuidCounter = 1;

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123", "yyyy-mm": "2026-01" }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsInstance,
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
      listItems: monthlyListItemsMock,
      replaceItems: monthlyReplaceItemsMock,
      upsertByYm: monthlyUpsertByYmMock,
    },
  }),
}));

describe("MonthlyDetailPage", () => {
  beforeEach(() => {
    planGetMock.mockReset();
    monthlyGetByYmMock.mockReset();
    monthlyListItemsMock.mockReset();
    monthlyReplaceItemsMock.mockReset();
    monthlyUpsertByYmMock.mockReset();
    pushMock.mockReset();
    searchParamsInstance = new URLSearchParams();
    uuidCounter = 1;

    planGetMock.mockResolvedValue({ id: "plan-123", name: "Plan A" });
    vi.stubGlobal("crypto", {
      randomUUID: () => `uuid-${uuidCounter++}`,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("prompts to complete simple input when monthly record is missing", async () => {
    monthlyGetByYmMock.mockResolvedValue(undefined);
    monthlyListItemsMock.mockResolvedValue([]);

    render(<MonthlyDetailPage />);

    expect(
      await screen.findByText("先にかんたん入力を完了してください"),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "かんたん入力へ移動" });
    expect(link.getAttribute("href")).toBe(
      "/plans/plan-123/months/2026-01?scenario=base",
    );
    expect(monthlyListItemsMock).not.toHaveBeenCalled();
  });

  it("saves items and memo then navigates back", async () => {
    const user = userEvent.setup();
    monthlyGetByYmMock.mockResolvedValue({
      id: "record-1",
      planId: "plan-123",
      ym: "2026-01",
      isFinalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      incomeTotalYen: 1000,
      expenseTotalYen: 500,
    });
    monthlyListItemsMock.mockResolvedValue([
      {
        id: "item-1",
        monthlyRecordId: "record-1",
        kind: "income",
        category: "main",
        amountYen: 1000,
        note: "給与",
        sortOrder: 1,
      },
    ]);
    monthlyUpsertByYmMock.mockResolvedValue({
      id: "record-1",
      planId: "plan-123",
      ym: "2026-01",
      isFinalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });

    render(<MonthlyDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("収入（内訳）")).toBeInTheDocument(),
    );

    const memo = screen.getByPlaceholderText(
      "例：今月は冠婚葬祭で支出が増えた",
    );
    await user.type(memo, "メモ入力");

    const saveButton = screen.getAllByRole("button", {
      name: "保存して戻る",
    })[0];
    await user.click(saveButton);

    await waitFor(() => {
      expect(monthlyReplaceItemsMock).toHaveBeenCalledWith("record-1", [
        {
          id: "item-1",
          kind: "income",
          category: "main",
          amountYen: 1000,
          note: "給与",
          sortOrder: 1,
        },
      ]);
    });

    expect(monthlyUpsertByYmMock).toHaveBeenCalledWith(
      "plan-123",
      "2026-01",
      expect.objectContaining({ memo: "メモ入力" }),
    );
    expect(pushMock).toHaveBeenCalledWith(
      "/plans/plan-123/months/2026-01?scenario=base",
    );
  });

  it("blocks save when note or amount is invalid", async () => {
    const user = userEvent.setup();
    monthlyGetByYmMock.mockResolvedValue({
      id: "record-1",
      planId: "plan-123",
      ym: "2026-01",
      isFinalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    monthlyListItemsMock.mockResolvedValue([
      {
        id: "item-1",
        monthlyRecordId: "record-1",
        kind: "income",
        category: "main",
        amountYen: 0,
        note: "",
        sortOrder: 1,
      },
    ]);

    render(<MonthlyDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("収入（内訳）")).toBeInTheDocument(),
    );

    const saveButton = screen.getAllByRole("button", {
      name: "保存して戻る",
    })[0];
    await user.click(saveButton);

    expect(await screen.findByText("名称は必須です")).toBeInTheDocument();
    expect(
      await screen.findByText("金額は1円以上で入力してください"),
    ).toBeInTheDocument();
    expect(monthlyReplaceItemsMock).not.toHaveBeenCalled();
  });

  it("renders existing income/expense items and empty state", async () => {
    monthlyGetByYmMock.mockResolvedValue({
      id: "record-1",
      planId: "plan-123",
      ym: "2026-01",
      isFinalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    monthlyListItemsMock.mockResolvedValue([]);

    render(<MonthlyDetailPage />);

    expect(await screen.findByText("内訳がまだありません")).toBeInTheDocument();
  });

  it("loads existing items and displays their values", async () => {
    monthlyGetByYmMock.mockResolvedValue({
      id: "record-1",
      planId: "plan-123",
      ym: "2026-01",
      isFinalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    monthlyListItemsMock.mockResolvedValue([
      {
        id: "item-1",
        monthlyRecordId: "record-1",
        kind: "income",
        category: "main",
        amountYen: 300000,
        note: "給与",
        sortOrder: 1,
      },
      {
        id: "item-2",
        monthlyRecordId: "record-1",
        kind: "expense",
        category: "housing",
        amountYen: 120000,
        note: "家賃",
        sortOrder: 1,
      },
    ]);

    render(<MonthlyDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("支出（内訳）")).toBeInTheDocument(),
    );

    expect(screen.getByDisplayValue("給与")).toBeInTheDocument();
    expect(screen.getByDisplayValue("300000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("家賃")).toBeInTheDocument();
    expect(screen.getByDisplayValue("120000")).toBeInTheDocument();
  });

  it("supports add/edit/delete for income and expense items", async () => {
    const user = userEvent.setup();
    monthlyGetByYmMock.mockResolvedValue({
      id: "record-1",
      planId: "plan-123",
      ym: "2026-01",
      isFinalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    monthlyListItemsMock.mockResolvedValue([
      {
        id: "item-1",
        monthlyRecordId: "record-1",
        kind: "income",
        category: "main",
        amountYen: 100000,
        note: "給与",
        sortOrder: 1,
      },
      {
        id: "item-2",
        monthlyRecordId: "record-1",
        kind: "expense",
        category: "food",
        amountYen: 20000,
        note: "食費",
        sortOrder: 1,
      },
    ]);
    monthlyUpsertByYmMock.mockResolvedValue({
      id: "record-1",
      planId: "plan-123",
      ym: "2026-01",
      isFinalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    const { container } = render(<MonthlyDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("収入（内訳）")).toBeInTheDocument(),
    );

    const initialNameCount = screen.getAllByPlaceholderText("名称").length;
    await user.click(screen.getByRole("button", { name: "収入を追加" }));
    await user.click(screen.getByRole("button", { name: "支出を追加" }));
    expect(screen.getAllByPlaceholderText("名称").length).toBe(
      initialNameCount + 2,
    );

    const nameInputs = screen.getAllByPlaceholderText("名称");
    const amountInputs = screen.getAllByPlaceholderText("金額");

    const emptyNameInputs = nameInputs.filter(
      (input) => (input as HTMLInputElement).value === "",
    );
    const emptyAmountInputs = amountInputs.filter(
      (input) => (input as HTMLInputElement).value === "",
    );
    expect(emptyNameInputs.length).toBeGreaterThanOrEqual(2);
    expect(emptyAmountInputs.length).toBeGreaterThanOrEqual(2);

    await user.type(emptyNameInputs[0], "副収入");
    await user.type(emptyAmountInputs[0], "50000");
    await user.type(emptyNameInputs[1], "追加支出");
    await user.type(emptyAmountInputs[1], "15000");

    const existingIncomeName = screen.getByDisplayValue("給与");
    await user.clear(existingIncomeName);
    await user.type(existingIncomeName, "給与改");

    const expenseInput = screen.getByDisplayValue("食費");
    let expenseRow = expenseInput.closest("div");
    while (expenseRow && !expenseRow.className.includes("rounded-lg")) {
      expenseRow = expenseRow.parentElement;
    }
    if (expenseRow) {
      const rowButtons = expenseRow.querySelectorAll("button");
      const deleteButton = rowButtons[rowButtons.length - 1];
      if (deleteButton) {
        await user.click(deleteButton);
      }
    }
    expect(screen.queryByDisplayValue("食費")).not.toBeInTheDocument();

    const saveButton = screen.getAllByRole("button", {
      name: "保存して戻る",
    })[0];
    await user.click(saveButton);

    await waitFor(() => {
      expect(monthlyReplaceItemsMock).toHaveBeenCalled();
    });
    const savedItems = monthlyReplaceItemsMock.mock.calls[0][1] as Array<{
      id: string;
      kind: string;
      category: string;
      amountYen: number;
      note: string;
      sortOrder: number;
    }>;
    expect(savedItems.some((item) => item.note === "給与改")).toBe(true);
    expect(savedItems.some((item) => item.note === "副収入")).toBe(true);
    expect(savedItems.some((item) => item.note === "食費")).toBe(false);
  });

  it("restores saved items on revisit", async () => {
    monthlyGetByYmMock.mockResolvedValue({
      id: "record-1",
      planId: "plan-123",
      ym: "2026-01",
      isFinalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    monthlyListItemsMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "item-1",
          monthlyRecordId: "record-1",
          kind: "income",
          category: "main",
          amountYen: 1000,
          note: "再訪データ",
          sortOrder: 1,
        },
      ]);

    const { unmount } = render(<MonthlyDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("収入（内訳）")).toBeInTheDocument(),
    );

    unmount();
    render(<MonthlyDetailPage />);

    expect(await screen.findByDisplayValue("再訪データ")).toBeInTheDocument();
  });

  it("shows error when loading fails", async () => {
    planGetMock.mockRejectedValue(new Error("load error"));

    render(<MonthlyDetailPage />);

    const errorMessages = await screen.findAllByText("読み込みに失敗しました");
    expect(errorMessages.length).toBeGreaterThan(0);
  });
});
