import { describe, expect, it, vi } from "vitest";
import type { Plan, PlanVersion } from "../domain/types";
import type { Repositories } from "../repo/factory";
import { createPlanWizard } from "./createPlanWizard";

const withTxMock = vi.fn();
const initializeDefaultsMock = vi.fn();

vi.mock("../db", () => ({
  withTx: (...args: unknown[]) => withTxMock(...args),
}));

vi.mock("./initializePlanVersionDefaults", () => ({
  initializePlanVersionDefaults: (...args: unknown[]) =>
    initializeDefaultsMock(...args),
}));

const makePlan = (id: string): Plan => ({
  id,
  name: "Plan",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const makeVersion = (id: string, planId: string): PlanVersion => ({
  id,
  planId,
  versionNo: 1,
  isCurrent: true,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("createPlanWizard", () => {
  it("creates plan, version, and initializes defaults in one tx", async () => {
    const planCreateMock = vi.fn();
    const versionCreateMock = vi.fn();
    const repos: Repositories = {
      plan: {
        list: vi.fn(),
        get: vi.fn(),
        create: planCreateMock,
        update: vi.fn(),
        archive: vi.fn(),
        restore: vi.fn(),
        delete: vi.fn(),
      },
      version: {
        listByPlan: vi.fn(),
        get: vi.fn(),
        getCurrent: vi.fn(),
        createInitial: versionCreateMock,
        createFromCurrent: vi.fn(),
        setCurrent: vi.fn(),
        delete: vi.fn(),
        getScenarioSet: vi.fn(),
        upsertScenarioSet: vi.fn(),
        ensureScenarioSet: vi.fn(),
      },
      monthly: {
        getByYm: vi.fn(),
        listByPlan: vi.fn(),
        upsert: vi.fn(),
        upsertByYm: vi.fn(),
        copyFromPreviousMonth: vi.fn(),
        deleteByYm: vi.fn(),
        listItems: vi.fn(),
        replaceItems: vi.fn(),
        deleteItemsByRecord: vi.fn(),
      },
      event: {
        listByVersion: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      housing: {
        listByVersion: vi.fn(),
        getByType: vi.fn(),
        upsert: vi.fn(),
        setSelected: vi.fn(),
        applyPreset: vi.fn(),
      },
    };

    const plan = makePlan("plan-1");
    const version = makeVersion("ver-1", plan.id);
    planCreateMock.mockResolvedValue(plan);
    versionCreateMock.mockResolvedValue(version);

    const tx = { id: "tx-1" };
    withTxMock.mockImplementation(async (_stores, _mode, fn) => fn(tx));

    const result = await createPlanWizard({
      repos,
      input: {
        name: "My Plan",
        householdType: "couple",
        note: "note",
        housingType: "detached",
        incomeMonthlyYen: 400000,
        assetsBalanceYen: 1000000,
        liabilitiesBalanceYen: 20000000,
      },
    });

    expect(withTxMock).toHaveBeenCalledTimes(1);
    expect(planCreateMock).toHaveBeenCalledWith(
      {
        name: "My Plan",
        householdType: "couple",
        note: "note",
      },
      { tx },
    );
    expect(versionCreateMock).toHaveBeenCalledWith(
      plan.id,
      {
        title: "v1",
        changeNote: "初期作成",
        incomeMonthlyYen: 400000,
        assetsBalanceYen: 1000000,
        liabilitiesBalanceYen: 20000000,
      },
      { tx },
    );
    expect(initializeDefaultsMock).toHaveBeenCalledWith({
      repos,
      planVersionId: version.id,
      selectedHousingType: "detached",
      ctx: { tx },
    });
    expect(result).toEqual({ planId: plan.id, versionId: version.id });
  });
});
