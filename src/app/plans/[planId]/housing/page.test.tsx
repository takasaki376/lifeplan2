import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HousingLCCPage from "./page";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerMock = {
  push: pushMock,
  replace: replaceMock,
};
let searchParamsInstance = new URLSearchParams();

const planGetMock = vi.fn();
const versionGetCurrentMock = vi.fn();
const versionEnsureScenarioSetMock = vi.fn();
const housingListByVersionMock = vi.fn();
const housingApplyPresetMock = vi.fn();
const housingSetSelectedMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123" }),
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsInstance,
  usePathname: () => "/plans/plan-123/housing",
}));

vi.mock("@/lib/repo/factory", () => ({
  createRepositories: () => ({
    plan: {
      get: planGetMock,
    },
    version: {
      getCurrent: versionGetCurrentMock,
      ensureScenarioSet: versionEnsureScenarioSetMock,
    },
    housing: {
      listByVersion: housingListByVersionMock,
      applyPreset: housingApplyPresetMock,
      setSelected: housingSetSelectedMock,
    },
  }),
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

describe("HousingLCCPage", () => {
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

  beforeEach(() => {
    planGetMock.mockResolvedValue({
      id: "plan-123",
      name: "Test Plan",
      currentVersionId: "version-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    versionGetCurrentMock.mockResolvedValue({
      id: "version-1",
      planId: "plan-123",
      versionNo: 1,
      isCurrent: true,
      createdAt: new Date().toISOString(),
    });
    versionEnsureScenarioSetMock.mockResolvedValue({
      conservative: undefined,
      base: undefined,
      optimistic: undefined,
    });
    housingListByVersionMock.mockResolvedValue([
      {
        id: "housing-1",
        planVersionId: "version-1",
        housingType: "high_performance_home",
        isSelected: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "housing-2",
        planVersionId: "version-1",
        housingType: "detached",
        isSelected: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "housing-3",
        planVersionId: "version-1",
        housingType: "condo",
        isSelected: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "housing-4",
        planVersionId: "version-1",
        housingType: "rent",
        isSelected: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    searchParamsInstance = new URLSearchParams();
  });

  it("renders housing links for each type", () => {
    const { container } = render(<HousingLCCPage />);
    const planId = "plan-123";
    const types = [
      "high_performance_home",
      "detached",
      "condo",
      "rent",
    ];

    return waitFor(() => {
      for (const type of types) {
        expect(
          container.querySelector(
            `a[href="/plans/${planId}/housing/${type}?scenario=base"]`,
          ),
        ).toBeTruthy();
        expect(
          container.querySelector(
            `a[href="/plans/${planId}/housing/assumptions?type=${type}&scenario=base"]`,
          ),
        ).toBeTruthy();
      }

      expect(
        container.querySelector(
          `a[href="/plans/${planId}/housing/assumptions?scenario=base"]`,
        ),
      ).toBeTruthy();
    });
  });

  it("honors scenario query parameter and displays correct scenario", async () => {
    searchParamsInstance = new URLSearchParams("scenario=optimistic");

    render(<HousingLCCPage />);

    await waitFor(() => {
      const optimisticTab = screen.getByRole("tab", { name: "楽観" });
      expect(optimisticTab).toBeInTheDocument();
      expect(optimisticTab).toHaveAttribute("data-state", "active");
    });
  });

  it("falls back to base scenario when an invalid scenario value is specified", async () => {
    searchParamsInstance = new URLSearchParams("scenario=invalid");

    render(<HousingLCCPage />);

    await waitFor(() => {
      const baseTab = screen.getByRole("tab", { name: "標準" });
      expect(baseTab).toBeInTheDocument();
      expect(baseTab).toHaveAttribute("data-state", "active");
    });
  });

  it("calls router.replace when scenario tab is switched", async () => {
    const user = userEvent.setup();
    render(<HousingLCCPage />);

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "保守" })).toBeInTheDocument()
    );

    await user.click(screen.getByRole("tab", { name: "保守" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    const calledArg = replaceMock.mock.calls[0]?.[0];
    const normalizedArg = Array.isArray(calledArg) ? calledArg[0] : calledArg;
    expect(normalizedArg).toBe("/plans/plan-123/housing?scenario=conservative");
  });

  it("displays message when getCurrent returns undefined (no current version)", async () => {
    versionGetCurrentMock.mockResolvedValue(null);

    render(<HousingLCCPage />);

    await waitFor(() => {
      expect(screen.getByText("現行バージョンがありません")).toBeInTheDocument();
    });

    // Ensure housing list is not populated
    expect(housingListByVersionMock).not.toHaveBeenCalled();
    expect(housingApplyPresetMock).not.toHaveBeenCalled();
    expect(housingSetSelectedMock).not.toHaveBeenCalled();
  });

  it("displays error message when repository throws exception during load", async () => {
    planGetMock.mockRejectedValue(new Error("Database error"));

    render(<HousingLCCPage />);

    await waitFor(() => {
      expect(screen.getByText("住宅LCCの読み込みに失敗しました。")).toBeInTheDocument();
    });

    // Ensure state is reset on error
    expect(screen.queryByRole("tab", { name: "標準" })).not.toBeInTheDocument();
  });

  it("calls applyPreset when housing types are missing", async () => {
    // Return only 2 housing types (missing 2 types)
    housingListByVersionMock
      .mockResolvedValueOnce([
        {
          id: "housing-1",
          planVersionId: "version-1",
          housingType: "high_performance_home",
          isSelected: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-2",
          planVersionId: "version-1",
          housingType: "detached",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "housing-1",
          planVersionId: "version-1",
          housingType: "high_performance_home",
          isSelected: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-2",
          planVersionId: "version-1",
          housingType: "detached",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-3",
          planVersionId: "version-1",
          housingType: "condo",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-4",
          planVersionId: "version-1",
          housingType: "rent",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

    render(<HousingLCCPage />);

    await waitFor(() => {
      expect(housingApplyPresetMock).toHaveBeenCalledTimes(2);
      expect(housingApplyPresetMock).toHaveBeenCalledWith("version-1", "condo", "base");
      expect(housingApplyPresetMock).toHaveBeenCalledWith("version-1", "rent", "base");
    });

    // Ensure listByVersion was called twice (before and after applyPreset)
    expect(housingListByVersionMock).toHaveBeenCalledTimes(2);
  });

  it("calls setSelected when no housing is selected", async () => {
    // Return housing types with none selected
    housingListByVersionMock
      .mockResolvedValueOnce([
        {
          id: "housing-1",
          planVersionId: "version-1",
          housingType: "high_performance_home",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-2",
          planVersionId: "version-1",
          housingType: "detached",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-3",
          planVersionId: "version-1",
          housingType: "condo",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-4",
          planVersionId: "version-1",
          housingType: "rent",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "housing-1",
          planVersionId: "version-1",
          housingType: "high_performance_home",
          isSelected: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-2",
          planVersionId: "version-1",
          housingType: "detached",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-3",
          planVersionId: "version-1",
          housingType: "condo",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "housing-4",
          planVersionId: "version-1",
          housingType: "rent",
          isSelected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

    render(<HousingLCCPage />);

    await waitFor(() => {
      expect(housingSetSelectedMock).toHaveBeenCalledTimes(1);
      expect(housingSetSelectedMock).toHaveBeenCalledWith("version-1", "high_performance_home");
    });

    // Ensure listByVersion was called twice (before and after setSelected)
    expect(housingListByVersionMock).toHaveBeenCalledTimes(2);
  });
});
