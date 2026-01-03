import React from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import type { LifeEvent, Plan, PlanVersion } from "@/lib/domain/types";
import EventEditPage from "./page";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerMock = {
  push: pushMock,
  replace: replaceMock,
};
const planGetMock = vi.fn();
const eventGetMock = vi.fn();
const eventUpdateMock = vi.fn();
const versionGetMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ planId: "plan-123", eventId: "event-1" }),
  useRouter: () => routerMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/repo/factory", () => ({
  createRepositories: () => ({
    plan: {
      get: planGetMock,
    },
    event: {
      get: eventGetMock,
      update: eventUpdateMock,
    },
    version: {
      get: versionGetMock,
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderPage = () => render(<EventEditPage />);

const makePlan = (partial: Partial<Plan> & Pick<Plan, "id" | "name">): Plan => {
  const now = "2026-01-02T00:00:00.000Z";
  return {
    id: partial.id,
    name: partial.name,
    status: partial.status ?? "active",
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    householdType: partial.householdType,
    note: partial.note,
    userId: partial.userId,
    currentVersionId: partial.currentVersionId,
    archivedAt: partial.archivedAt,
  };
};

const makeVersion = (
  partial: Partial<PlanVersion> &
    Pick<PlanVersion, "id" | "planId" | "versionNo">,
): PlanVersion => ({
  id: partial.id,
  planId: partial.planId,
  versionNo: partial.versionNo,
  title: partial.title,
  changeNote: partial.changeNote,
  incomeMonthlyYen: partial.incomeMonthlyYen,
  assetsBalanceYen: partial.assetsBalanceYen,
  liabilitiesBalanceYen: partial.liabilitiesBalanceYen,
  isCurrent: partial.isCurrent ?? true,
  createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
});

const makeEvent = (overrides: Partial<LifeEvent> = {}): LifeEvent => ({
  id: overrides.id ?? "event-1",
  planVersionId: overrides.planVersionId ?? "version-1",
  eventType: overrides.eventType ?? "education",
  title: overrides.title ?? "入学準備",
  startYm: overrides.startYm ?? "2026-04",
  cadence: overrides.cadence ?? "monthly",
  durationMonths: overrides.durationMonths ?? 6,
  amountYen: overrides.amountYen ?? 20000,
  direction: overrides.direction ?? "expense",
  note: overrides.note ?? "準備メモ",
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
});

const getHeaderSaveButton = () => {
  const header = screen.getByRole("banner");
  const buttons = within(header).getAllByRole("button");
  const saveButton = buttons.find((button) =>
    (button.textContent ?? "").includes("保存"),
  );
  return saveButton ?? buttons[buttons.length - 1];
};

describe("EventEditPage", () => {
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
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
    (React as unknown as { use?: (value: unknown) => unknown }).use = (
      value,
    ) => value;
  });

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    planGetMock.mockReset();
    eventGetMock.mockReset();
    eventUpdateMock.mockReset();
    versionGetMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();

    planGetMock.mockResolvedValue(makePlan({ id: "plan-123", name: "Plan A" }));
    eventGetMock.mockResolvedValue(makeEvent());
    versionGetMock.mockResolvedValue(
      makeVersion({ id: "version-1", planId: "plan-123", versionNo: 1 }),
    );
    eventUpdateMock.mockResolvedValue(undefined);
  });

  it("loads event data and disables save until dirty", async () => {
    const { container } = renderPage();

    await waitFor(() => expect(eventGetMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(container.querySelector("#title")).not.toBeNull(),
    );
    const titleInput = container.querySelector("#title") as HTMLInputElement;
    expect(titleInput).toHaveValue("入学準備");
    const monthInput = container.querySelector(
      "input[type=\"month\"][value=\"2026-04\"]",
    );
    expect(monthInput).toBeTruthy();

    const saveButton = getHeaderSaveButton();
    expect(saveButton).toBeDisabled();
  });

  it("updates event and redirects on save", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await waitFor(() => expect(eventGetMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(container.querySelector("#title")).not.toBeNull(),
    );
    const titleInput = container.querySelector("#title") as HTMLInputElement;
    await user.clear(titleInput);
    await user.type(titleInput, "更新後イベント");

    const saveButton = getHeaderSaveButton();
    await user.click(saveButton);

    await waitFor(() => expect(eventUpdateMock).toHaveBeenCalled());
    expect(eventUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "event-1",
        title: "更新後イベント",
        eventType: "education",
        startYm: "2026-04",
        cadence: "monthly",
        amountYen: 20000,
        direction: "expense",
        durationMonths: 6,
        note: "準備メモ",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("イベントを更新しました");
    expect(pushMock).toHaveBeenCalledWith("/plans/plan-123/events");
  });

  it("shows not found state when event is missing", async () => {
    eventGetMock.mockResolvedValueOnce(undefined);
    const { container } = renderPage();

    await screen.findByText("イベントが見つかりません");
    const backLink = container.querySelector(
      'a[href="/plans/plan-123/events"]',
    );
    expect(backLink).toBeTruthy();
  });

  it("redirects when plan and event version mismatch", async () => {
    versionGetMock.mockResolvedValueOnce(
      makeVersion({ id: "version-1", planId: "other-plan", versionNo: 1 }),
    );
    renderPage();

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("このイベントは別プランに属しています");
    expect(replaceMock).toHaveBeenCalledWith("/plans/plan-123/events");
  });
});
