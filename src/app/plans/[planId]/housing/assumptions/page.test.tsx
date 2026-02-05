import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { HOUSING_TYPE_LABELS } from "@/lib/housing";
import HousingAssumptionsPage from "./page";

const pushMock = vi.fn();
let searchParamsInstance = new URLSearchParams();

const planGetMock = vi.fn();
const versionGetCurrentMock = vi.fn();
const housingListByVersionMock = vi.fn();
const housingApplyPresetMock = vi.fn();
const housingUpsertMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123" }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsInstance,
}));

vi.mock("@/lib/repo/factory", () => ({
  createRepositories: () => ({
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

describe("HousingAssumptionsPage", () => {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    versionGetCurrentMock.mockResolvedValue({
      id: "version-1",
      planId: "plan-123",
      versionNo: 1,
      isCurrent: true,
      createdAt: new Date().toISOString(),
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
    searchParamsInstance = new URLSearchParams();
    vi.clearAllMocks();
  });

  it("renders links for navigation and housing tabs", async () => {
    const { container } = render(<HousingAssumptionsPage />);

    await waitFor(() => {
      expect(
        container.querySelector('a[href="/plans/plan-123"]'),
      ).toBeTruthy();
      expect(
        container.querySelector('a[href="/plans/plan-123/housing?scenario=base"]'),
      ).toBeTruthy();
    });

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
});
