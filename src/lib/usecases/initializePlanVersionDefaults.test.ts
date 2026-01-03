import { describe, expect, it, vi } from "vitest";
import type { Repositories } from "../repo/factory";
import { initializePlanVersionDefaults } from "./initializePlanVersionDefaults";

describe("initializePlanVersionDefaults", () => {
  it("seeds scenario defaults, applies housing presets, and selects housing", async () => {
    const ensureScenarioSet = vi.fn();
    const applyPreset = vi.fn();
    const setSelected = vi.fn();

    const repos = {
      version: {
        ensureScenarioSet,
      },
      housing: {
        applyPreset,
        setSelected,
      },
    } as unknown as Repositories;

    await initializePlanVersionDefaults({
      repos,
      planVersionId: "ver-1",
      selectedHousingType: "condo",
    });

    expect(ensureScenarioSet).toHaveBeenCalledWith("ver-1", undefined);
    expect(applyPreset).toHaveBeenCalledTimes(4);
    expect(applyPreset).toHaveBeenNthCalledWith(
      1,
      "ver-1",
      "high_performance_home",
      "base",
      undefined,
    );
    expect(applyPreset).toHaveBeenNthCalledWith(
      2,
      "ver-1",
      "detached",
      "base",
      undefined,
    );
    expect(applyPreset).toHaveBeenNthCalledWith(
      3,
      "ver-1",
      "condo",
      "base",
      undefined,
    );
    expect(applyPreset).toHaveBeenNthCalledWith(
      4,
      "ver-1",
      "rent",
      "base",
      undefined,
    );
    expect(setSelected).toHaveBeenCalledWith("ver-1", "condo", undefined);
  });
});
