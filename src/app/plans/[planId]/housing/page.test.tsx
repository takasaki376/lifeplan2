import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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

    planGetMock.mockResolvedValue({
      id: "plan-123",
      name: "Test Plan",
      currentVersionId: "version-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
});
