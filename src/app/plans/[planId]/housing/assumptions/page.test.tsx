import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HousingAssumptionsPage from "./page";

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
});
