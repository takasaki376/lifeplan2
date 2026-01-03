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
import type { PlanVersion } from "@/lib/domain/types";
import EventCreatePage from "./page";

const pushMock = vi.fn();
const versionGetCurrentMock = vi.fn();
const eventCreateMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/repo/factory", () => ({
  createRepositories: () => ({
    version: {
      getCurrent: versionGetCurrentMock,
    },
    event: {
      create: eventCreateMock,
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const renderPage = () => {
  const params = { planId: "plan-123" } as unknown as Promise<{
    planId: string;
  }>;
  return render(<EventCreatePage params={params} />);
};

const makeVersion = (overrides: Partial<PlanVersion> = {}): PlanVersion => ({
  id: overrides.id ?? "version-1",
  planId: overrides.planId ?? "plan-123",
  versionNo: overrides.versionNo ?? 1,
  isCurrent: overrides.isCurrent ?? true,
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
  title: overrides.title,
  changeNote: overrides.changeNote,
  incomeMonthlyYen: overrides.incomeMonthlyYen,
  assetsBalanceYen: overrides.assetsBalanceYen,
  liabilitiesBalanceYen: overrides.liabilitiesBalanceYen,
});

const getHeaderSaveButton = () => {
  const header = screen.getByRole("banner");
  const buttons = within(header).getAllByRole("button");
  const saveButton = buttons.find((button) =>
    (button.textContent ?? "").includes("保"),
  );
  return saveButton ?? buttons[buttons.length - 1];
};

const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/イベント名/), "テストイベント");
  await user.type(screen.getByLabelText(/発生月/), "2026-04");
  const amountInput = screen.getAllByRole("spinbutton")[0];
  await user.clear(amountInput);
  await user.type(amountInput, "10000");
};

describe("EventCreatePage", () => {
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
    versionGetCurrentMock.mockReset();
    eventCreateMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.info).mockReset();
    versionGetCurrentMock.mockResolvedValue(makeVersion());
    eventCreateMock.mockResolvedValue({ id: "event-1" });
  });

  it("shows validation errors when required fields are missing", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    const saveButton = getHeaderSaveButton();
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    await user.click(saveButton);

    expect(eventCreateMock).not.toHaveBeenCalled();
    expect(container.querySelectorAll(".text-destructive").length).toBeGreaterThan(0);
    expect(saveButton).toBeDisabled();
  });

  it("creates event and redirects on success", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(versionGetCurrentMock).toHaveBeenCalled());
    await fillRequiredFields(user);

    const saveButton = getHeaderSaveButton();
    await user.click(saveButton);

    await waitFor(() => expect(eventCreateMock).toHaveBeenCalled());
    expect(eventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        planVersionId: "version-1",
        title: "テストイベント",
        eventType: "other",
        startYm: "2026-04",
        cadence: "once",
        durationMonths: 1,
        amountYen: 10000,
        direction: "expense",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("イベントを保存しました");
    expect(pushMock).toHaveBeenCalledWith("/plans/plan-123/events");
  });

  it("shows toast error and keeps input on save failure", async () => {
    const user = userEvent.setup();
    eventCreateMock.mockRejectedValueOnce(new Error("save failed"));
    renderPage();

    await waitFor(() => expect(versionGetCurrentMock).toHaveBeenCalled());
    await fillRequiredFields(user);

    const saveButton = getHeaderSaveButton();
    await user.click(saveButton);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("保存に失敗しました"));
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/イベント名/)).toHaveValue("テストイベント");
  });

  it("blocks saving when current version is missing", async () => {
    const user = userEvent.setup();
    versionGetCurrentMock.mockResolvedValueOnce(undefined);
    renderPage();

    await waitFor(() => expect(versionGetCurrentMock).toHaveBeenCalled());

    const saveButton = getHeaderSaveButton();
    await waitFor(() => expect(saveButton).toBeDisabled());

    expect(
      screen.getByText(
        "現行バージョンが見つかりません。改定を作成してください。",
      ),
    ).toBeInTheDocument();
    expect(eventCreateMock).not.toHaveBeenCalled();
  });

  it("disables save while saving to prevent double submit", async () => {
    const user = userEvent.setup();
    let resolveCreate: (() => void) | undefined;
    eventCreateMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderPage();

    await waitFor(() => expect(versionGetCurrentMock).toHaveBeenCalled());
    await fillRequiredFields(user);

    const saveButton = getHeaderSaveButton();
    await user.click(saveButton);
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(eventCreateMock).toHaveBeenCalledTimes(1);

    resolveCreate?.();
    await waitFor(() => expect(saveButton).not.toBeDisabled());
  });
});
