import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import HousingLCCPage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123" }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/plans/plan-123",
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

  afterEach(() => {
    cleanup();
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

    for (const type of types) {
      expect(
        container.querySelector(
          `a[href="/plans/${planId}/housing/${type}"]`,
        ),
      ).toBeTruthy();
      expect(
        container.querySelector(
          `a[href="/plans/${planId}/housing/assumptions?type=${type}"]`,
        ),
      ).toBeTruthy();
    }

    expect(
      container.querySelector(
        `a[href="/plans/${planId}/housing/assumptions"]`,
      ),
    ).toBeTruthy();
  });
});
