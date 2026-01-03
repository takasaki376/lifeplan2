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
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import EventCreatePage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
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
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.info).mockReset();
  });

  it("shows errors when required fields are missing", async () => {
    const user = userEvent.setup();
    renderPage();

    const saveButton = screen.getAllByRole("button", { name: "保存" })[0];
    await user.click(saveButton);

    expect(
      screen.getByText("イベント名を入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("発生月を選択してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("金額を入力してください"),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("blocks saving when amount is zero", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/イベント名/), "教育イベント");
    await user.type(screen.getByLabelText(/発生月/), "2026-04");
    const amountInput = screen.getByLabelText(/金額/);
    await user.clear(amountInput);
    await user.type(amountInput, "0");
    const saveButton = screen.getAllByRole("button", { name: "保存" })[0];
    await user.click(saveButton);

    expect(
      screen.getByText("金額は1円以上で入力してください"),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("blocks saving when amount is negative", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/イベント名/), "教育イベント");
    await user.type(screen.getByLabelText(/発生月/), "2026-04");
    const amountInput = screen.getByLabelText(/金額/);
    await user.clear(amountInput);
    await user.type(amountInput, "-1");
    const saveButton = screen.getAllByRole("button", { name: "保存" })[0];
    await user.click(saveButton);

    expect(
      screen.getByText("金額は1円以上で入力してください"),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("blocks saving when monthly duration is less than 1", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/イベント名/), "教育イベント");
    await user.type(screen.getByLabelText(/発生月/), "2026-04");
    await user.type(screen.getByLabelText(/金額/), "10000");

    await user.click(screen.getByRole("button", { name: "毎月" }));

    const durationInput = screen.getByLabelText(/期間（月数）/);
    await user.clear(durationInput);
    await user.type(durationInput, "0");
    const saveButton = screen.getAllByRole("button", { name: "保存" })[0];
    await user.click(saveButton);

    expect(
      screen.getByText("期間（月数）は1以上で入力してください"),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("allows saving for once cadence without duration input", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/イベント名/), "教育イベント");
    await user.type(screen.getByLabelText(/発生月/), "2026-04");
    await user.type(screen.getByLabelText(/金額/), "10000");

    expect(screen.queryByLabelText(/期間（月数）/)).toBeNull();

    const saveButton = screen.getAllByRole("button", { name: "保存" })[0];
    await user.click(saveButton);

    expect(toast.success).toHaveBeenCalledWith("イベントを保存しました");
    expect(pushMock).toHaveBeenCalledWith("/plans/plan-123/events");
  });

  it("re-enables save after fixing validation errors", async () => {
    const user = userEvent.setup();
    renderPage();

    const saveButton = screen.getAllByRole("button", { name: "保存" })[0];
    await user.click(saveButton);
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByLabelText(/イベント名/), "教育イベント");
    await user.type(screen.getByLabelText(/発生月/), "2026-04");
    await user.type(screen.getByLabelText(/金額/), "10000");

    expect(saveButton).not.toBeDisabled();
  });
});
