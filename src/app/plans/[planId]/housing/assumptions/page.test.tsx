import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HOUSING_TYPE_LABELS } from "@/lib/housing";
import HousingAssumptionsPage from "./page";

const pushMock = vi.fn();
let searchParamsInstance = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123" }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsInstance,
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

  afterEach(() => {
    cleanup();
    searchParamsInstance = new URLSearchParams();
  });

  it("renders links for navigation and housing tabs", () => {
    const { container } = render(<HousingAssumptionsPage />);

    expect(
      container.querySelector('a[href="/plans/plan-123"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/plans/plan-123/housing"]'),
    ).toBeTruthy();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(6);
  });

  it("renders housing type labels from shared constants", () => {
    render(<HousingAssumptionsPage />);

    expect(
      screen.getAllByText(HOUSING_TYPE_LABELS.high_performance_home).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(HOUSING_TYPE_LABELS.detached).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(HOUSING_TYPE_LABELS.condo).length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText(HOUSING_TYPE_LABELS.rent).length).toBeGreaterThan(
      0
    );
  });
});
