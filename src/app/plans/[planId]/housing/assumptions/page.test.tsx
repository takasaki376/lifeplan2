import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HOUSING_TYPE_LABELS } from "@/lib/housing";
import HousingAssumptionsPage from "./page";

const {
  pushMock,
  planGetMock,
  versionGetCurrentMock,
  housingListByVersionMock,
  housingApplyPresetMock,
  housingUpsertMock,
  toastMock,
} = vi.hoisted(() => {
  return {
    pushMock: vi.fn(),
    planGetMock: vi.fn(),
    versionGetCurrentMock: vi.fn(),
    housingListByVersionMock: vi.fn(),
    housingApplyPresetMock: vi.fn(),
    housingUpsertMock: vi.fn(),
    toastMock: vi.fn(),
  };
});

let searchParamsInstance = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123" }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsInstance,
}));

vi.mock("@/lib/repo/factory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/repo/factory")>();
  const mockRepos = {
    plan: {
      get: planGetMock,
    },
    version: {
      getCurrent: versionGetCurrentMock,
    },
    housing: {
      listByVersion: housingListByVersionMock,
      applyPreset: housingApplyPresetMock,
      upsert: housingUpsertMock,
    },
    monthly: {},
    event: {},
  } as any;

  return {
    ...actual,
    createRepositories: () => mockRepos,
    getRepositories: () => {
      return mockRepos;
    },
  };
});

vi.mock("sonner", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
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

describe("HousingAssumptionsPage", () => {
  beforeAll(() => {
    if (!("ResizeObserver" in globalThis)) {
      class ResizeObserverMock {
        observe(_target: Element) { }
        unobserve(_target: Element) { }
        disconnect() { }
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
          addListener: () => { },
          removeListener: () => { },
          addEventListener: () => { },
          removeEventListener: () => { },
          dispatchEvent: () => false,
        }) as MediaQueryList;
    }
  });

  const waitForLoaded = async () => {
    await waitFor(() => {
      expect(housingListByVersionMock).toHaveBeenCalled();
    });
  };

  const getFirstNumberInput = async (container: HTMLElement) => {
    await waitForLoaded();
    return await waitFor(() => {
      const inputs = Array.from(
        container.querySelectorAll('input[type="number"]'),
      ) as HTMLInputElement[];
      if (inputs.length === 0) {
        throw new Error("No number inputs found");
      }
      return inputs[0];
    });
  };

  beforeEach(() => {
    localStorage.clear();
    planGetMock.mockImplementation(() => {
      return Promise.resolve({
        id: "plan-123",
        name: "Test Plan",
        currentVersionId: "version-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    versionGetCurrentMock.mockImplementation(() => {
      return Promise.resolve({
        id: "version-1",
        planId: "plan-123",
        versionNo: 1,
        isCurrent: true,
        createdAt: new Date().toISOString(),
      });
    });
    housingListByVersionMock.mockImplementation(() => {
      return Promise.resolve([
        {
          id: "housing-1",
          planVersionId: "version-1",
          housingType: "high_performance_home",
          isSelected: true,
          initialCostYen: 10000000,
          downPaymentYen: 1000000,
          loanInterestRate: 0.01,
          loanTermMonths: 420,
          propertyTaxAnnualYen: 120000,
          utilitiesBaseMonthlyYen: 15000,
          utilitiesFactor: 1,
          repairsSchedule: [{ cycleYears: 1, amountYen: 100000, memo: "" }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-2",
          planVersionId: "version-1",
          housingType: "detached",
          isSelected: false,
          initialCostYen: 9000000,
          downPaymentYen: 900000,
          loanInterestRate: 0.012,
          loanTermMonths: 420,
          propertyTaxAnnualYen: 110000,
          utilitiesBaseMonthlyYen: 16000,
          utilitiesFactor: 1,
          repairsSchedule: [{ cycleYears: 1, amountYen: 90000, memo: "" }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-3",
          planVersionId: "version-1",
          housingType: "condo",
          isSelected: false,
          initialCostYen: 12000000,
          downPaymentYen: 1200000,
          loanInterestRate: 0.01,
          loanTermMonths: 420,
          propertyTaxAnnualYen: 130000,
          utilitiesBaseMonthlyYen: 14000,
          utilitiesFactor: 0.95,
          typeSpecific: {
            managementFeeMonthlyYen: 15000,
            repairReserveMonthlyYen: 12000,
            parkingFeeMonthlyYen: 0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-4",
          planVersionId: "version-1",
          housingType: "rent",
          isSelected: false,
          utilitiesBaseMonthlyYen: 12000,
          utilitiesFactor: 1,
          typeSpecific: {
            rentMonthlyYen: 100000,
            rentIncreaseRateAnnual: 0.01,
            movingCostYen: 300000,
            renewalFeeYen: 100000,
            renewalCycleYears: 2,
            depositYen: 100000,
            keyMoneyYen: 100000,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    });
  });

  afterEach(() => {
    cleanup();
    searchParamsInstance = new URLSearchParams();
    vi.clearAllMocks();
  });

  it("renders links for navigation and housing tabs", async () => {
    render(<HousingAssumptionsPage />);

    const plansLink = await screen.findByRole("link", { name: "プラン一覧" });
    expect(plansLink).toHaveAttribute("href", "/plans");

    const planLink = await screen.findByRole("link", { name: "Test Plan" });
    expect(planLink).toHaveAttribute("href", "/plans/plan-123");

    const housingLink = await screen.findByRole("link", { name: "住宅LCC" });
    expect(housingLink).toHaveAttribute(
      "href",
      "/plans/plan-123/housing?scenario=base",
    );

    const tabs = await screen.findAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(6);
  });

  it("renders housing type labels from shared constants", async () => {
    render(<HousingAssumptionsPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText(HOUSING_TYPE_LABELS.high_performance_home).length,
      ).toBeGreaterThan(0);
    });
    expect(
      screen.getAllByText(HOUSING_TYPE_LABELS.detached).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(HOUSING_TYPE_LABELS.condo).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(HOUSING_TYPE_LABELS.rent).length).toBeGreaterThan(
      0,
    );
  });

  it("switches between simple and advanced modes", async () => {
    const user = userEvent.setup();
    const { container } = render(<HousingAssumptionsPage />);
    await waitForLoaded();
    expect(screen.queryByText("諸費用")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "詳細" }));
    expect(await screen.findByText("諸費用")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "かんたん" }));
    await waitFor(() => {
      expect(screen.queryByText("諸費用")).not.toBeInTheDocument();
    });
  });

  it("switches between housing types", async () => {
    const user = userEvent.setup();
    const { container } = render(<HousingAssumptionsPage />);
    await waitForLoaded();
    await user.click(screen.getByRole("tab", { name: HOUSING_TYPE_LABELS.rent }));
    expect(await screen.findByText("家賃（月）")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: HOUSING_TYPE_LABELS.condo }));
    expect(await screen.findByText("管理費（月）")).toBeInTheDocument();
  });

  it("updates form inputs", async () => {
    const user = userEvent.setup();
    const { container } = render(<HousingAssumptionsPage />);
    const input = await getFirstNumberInput(container);
    await user.clear(input);
    await user.type(input, "123456");
    expect((input as HTMLInputElement).value).toBe("123456");
  });

  it("saves all housing types", async () => {
    const user = userEvent.setup();
    const { container } = render(<HousingAssumptionsPage />);
    await waitForLoaded();
    await user.click(screen.getAllByRole("button", { name: "保存" })[0]);

    await waitFor(() => {
      expect(housingUpsertMock).toHaveBeenCalledTimes(4);
    });
  });

  it("resets changes to initial snapshot", async () => {
    const user = userEvent.setup();
    const { container } = render(<HousingAssumptionsPage />);
    const input = await getFirstNumberInput(container);
    await user.clear(input);
    await user.type(input, "999999");
    expect((input as HTMLInputElement).value).toBe("999999");

    await user.click(screen.getAllByRole("button", { name: "元に戻す" })[0]);

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe("10000000");
    });
  });

  it("persists edit mode in localStorage", async () => {
    localStorage.setItem("housingAssumptionsView", "advanced");
    const user = userEvent.setup();

    const { container } = render(<HousingAssumptionsPage />);
    await getFirstNumberInput(container);

    await user.click(screen.getByText("かんたん"));
    expect(localStorage.getItem("housingAssumptionsView")).toBe("simple");
  });

  it("shows error when no current version", async () => {
    versionGetCurrentMock.mockResolvedValueOnce(null);
    render(<HousingAssumptionsPage />);

    expect(
      await screen.findByText("現行バージョンがありません。改定履歴で現行版を設定してください。"),
    ).toBeInTheDocument();
  });

  it("shows error when load fails", async () => {
    planGetMock.mockRejectedValueOnce(new Error("load error"));
    render(<HousingAssumptionsPage />);

    expect(
      await screen.findByText("住宅前提の読み込みに失敗しました。"),
    ).toBeInTheDocument();
  });

  it.skip("prevents save when validation fails", async () => {
    const user = userEvent.setup();
    const { container } = render(<HousingAssumptionsPage />);
    const input = await screen.findByLabelText("金利（年率%）");
    await user.clear(input);
    await user.type(input, "200");

    await user.click(screen.getAllByRole("button", { name: "保存" })[0]);

    await waitFor(() => {
      expect(housingUpsertMock).not.toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
  });
});
