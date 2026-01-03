import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import PlanCreationWizard from "./page";

const pushMock = vi.fn();
const createPlanWizardMock = vi.fn();
const reposStub = {
  plan: {},
  version: {},
  housing: {},
  monthly: {},
  event: {},
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/lib/repo/factory", () => ({
  createRepositories: () => reposStub,
}));

vi.mock("@/lib/usecases/createPlanWizard", () => ({
  createPlanWizard: (...args: unknown[]) => createPlanWizardMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PlanCreationWizard", () => {
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
    pushMock.mockReset();
    createPlanWizardMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("blocks moving to step 2 without a plan name", async () => {
    const user = userEvent.setup();
    render(<PlanCreationWizard />);

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(toast.error).toHaveBeenCalledWith("プラン名を入力してください");
    expect(screen.getByText("プランの基本情報")).toBeInTheDocument();
  });

  it("blocks moving to step 3 without selecting housing type", async () => {
    const user = userEvent.setup();
    render(<PlanCreationWizard />);

    await user.type(
      screen.getByLabelText(/プラン名/),
      "テストプラン",
    );
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(toast.error).toHaveBeenCalledWith(
      "住宅タイプを選択してください",
    );
    expect(screen.getByText("住宅タイプ")).toBeInTheDocument();
  });

  it("submits wizard input and navigates to the new plan", async () => {
    const user = userEvent.setup();
    createPlanWizardMock.mockResolvedValue({
      planId: "plan-123",
      versionId: "ver-1",
    });

    render(<PlanCreationWizard />);

    await user.type(
      screen.getByLabelText(/プラン名/),
      "テストプラン",
    );
    await user.type(screen.getByLabelText("備考（任意）"), "メモ");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await user.click(screen.getByText("一般戸建"));
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await user.type(
      screen.getByLabelText("世帯年収（手取り・概算）"),
      "6000000",
    );
    await user.type(
      screen.getByLabelText("貯蓄・資産残高（概算）"),
      "1000000",
    );
    await user.clear(
      screen.getByLabelText("住宅ローン残高（なければ0）"),
    );
    await user.type(
      screen.getByLabelText("住宅ローン残高（なければ0）"),
      "20000000",
    );
    await user.click(
      screen.getByRole("button", { name: "この内容でプランを作成" }),
    );

    await waitFor(() => {
      expect(createPlanWizardMock).toHaveBeenCalledTimes(1);
    });

    expect(createPlanWizardMock).toHaveBeenCalledWith({
      repos: reposStub,
      input: {
        name: "テストプラン",
        householdType: "couple",
        note: "メモ",
        housingType: "detached",
        incomeMonthlyYen: 500000,
        assetsBalanceYen: 1000000,
        liabilitiesBalanceYen: 20000000,
      },
    });
    expect(pushMock).toHaveBeenCalledWith("/plans/plan-123");
  });
});
