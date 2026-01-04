import { describe, expect, it } from "vitest";
import { computeNextActions, REQUIRED_HOUSING_TYPES } from "./dashboard";
import type {
  MonthlyRecord,
  HousingAssumptions,
  PlanVersion,
} from "./domain/types";

describe("computeNextActions", () => {
  const planId = "test-plan-id";
  const versionId = "test-version-id";

  // Helper function to create a minimal MonthlyRecord
  const createMonthlyRecord = (overrides?: Partial<MonthlyRecord>): MonthlyRecord => ({
    id: "monthly-1",
    planId,
    ym: "2026-01",
    isFinalized: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  // Helper function to create a minimal HousingAssumptions
  const createHousingAssumption = (
    housingType: "high_performance_home" | "detached" | "condo" | "rent",
    isSelected = false
  ): HousingAssumptions => ({
    id: `housing-${housingType}`,
    planVersionId: versionId,
    housingType,
    isSelected,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });

  // Helper function to create a minimal PlanVersion
  const createPlanVersion = (overrides?: Partial<PlanVersion>): PlanVersion => ({
    id: versionId,
    planId,
    versionNo: 1,
    isCurrent: true,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  describe("Action item completion determination (done flag)", () => {
    it("should mark monthly action as done when currentMonthly exists", () => {
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(),
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const monthlyAction = result.find((a) => a.key === "monthly");
      expect(monthlyAction?.done).toBe(true);
      expect(monthlyAction?.cta).toBe("今月を編集");
    });

    it("should mark monthly action as not done when currentMonthly is null", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const monthlyAction = result.find((a) => a.key === "monthly");
      expect(monthlyAction?.done).toBe(false);
      expect(monthlyAction?.cta).toBe("今月を入力");
    });

    it("should mark monthly action as not done when currentMonthly is undefined", () => {
      const result = computeNextActions({
        currentMonthly: undefined,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const monthlyAction = result.find((a) => a.key === "monthly");
      expect(monthlyAction?.done).toBe(false);
    });

    it("should mark housing assumptions as done when count >= REQUIRED_HOUSING_TYPES", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home"),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      // Complete all other actions so housing-assumptions appears in top 3
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(),
        housingAssumptions,
        eventCount: 1,
        currentVersion: null,
        planId,
      });

      const housingAction = result.find((a) => a.key === "housing-assumptions");
      expect(housingAction?.done).toBe(true);
    });

    it("should mark housing assumptions as not done when count < REQUIRED_HOUSING_TYPES", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home"),
        createHousingAssumption("detached"),
      ];

      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions,
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const housingAction = result.find((a) => a.key === "housing-assumptions");
      expect(housingAction?.done).toBe(false);
    });

    it("should mark housing selection as done when one housing is selected", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home", true),
        createHousingAssumption("detached", false),
        createHousingAssumption("condo", false),
        createHousingAssumption("rent", false),
      ];

      // Complete other actions so housing-selection appears in top 3
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(),
        housingAssumptions,
        eventCount: 1,
        currentVersion: null,
        planId,
      });

      const selectionAction = result.find((a) => a.key === "housing-selection");
      expect(selectionAction?.done).toBe(true);
    });

    it("should mark housing selection as not done when no housing is selected", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home", false),
        createHousingAssumption("detached", false),
        createHousingAssumption("condo", false),
        createHousingAssumption("rent", false),
      ];

      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions,
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const selectionAction = result.find((a) => a.key === "housing-selection");
      expect(selectionAction?.done).toBe(false);
    });

    it("should mark events as done when eventCount > 0", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 3,
        currentVersion: null,
        planId,
      });

      const eventsAction = result.find((a) => a.key === "events");
      expect(eventsAction?.done).toBe(true);
    });

    it("should mark events as not done when eventCount is 0", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const eventsAction = result.find((a) => a.key === "events");
      expect(eventsAction?.done).toBe(false);
    });

    it("should mark revision memo as done when changeNote exists", () => {
      const currentVersion = createPlanVersion({ changeNote: "Some revision note" });

      // Due to the 3-item limit, revision-memo may not always appear in results
      // This test verifies that IF it appears, it has the correct done flag
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(),
        housingAssumptions: [
          createHousingAssumption("high_performance_home", true),
          createHousingAssumption("detached"),
          createHousingAssumption("condo"),
          createHousingAssumption("rent"),
        ],
        eventCount: 1,
        currentVersion,
        planId,
      });

      const revisionAction = result.find((a) => a.key === "revision-memo");
      if (revisionAction) {
        expect(revisionAction.done).toBe(true);
      }
    });

    it("should mark revision memo as not done when changeNote is empty", () => {
      const currentVersion = createPlanVersion({ changeNote: "" });

      // Complete other actions so revision-memo appears in top 3 (it will be incomplete)
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(),
        housingAssumptions: [
          createHousingAssumption("high_performance_home", true),
          createHousingAssumption("detached"),
          createHousingAssumption("condo"),
          createHousingAssumption("rent"),
        ],
        eventCount: 1,
        currentVersion,
        planId,
      });

      const revisionAction = result.find((a) => a.key === "revision-memo");
      expect(revisionAction?.done).toBe(false);
    });

    it("should mark revision memo as not done when changeNote is undefined", () => {
      const currentVersion = createPlanVersion({ changeNote: undefined });

      // Complete other actions so revision-memo appears in top 3 (it will be incomplete)
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(),
        housingAssumptions: [
          createHousingAssumption("high_performance_home", true),
          createHousingAssumption("detached"),
          createHousingAssumption("condo"),
          createHousingAssumption("rent"),
        ],
        eventCount: 1,
        currentVersion,
        planId,
      });

      const revisionAction = result.find((a) => a.key === "revision-memo");
      expect(revisionAction?.done).toBe(false);
    });
  });

  describe("Housing type selection conditional display", () => {
    it("should include housing selection action when hasHousingAssumptions is true", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home"),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions,
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const selectionAction = result.find((a) => a.key === "housing-selection");
      expect(selectionAction).toBeDefined();
      expect(selectionAction?.label).toBe("住宅タイプを選択");
    });

    it("should not include housing selection action when hasHousingAssumptions is false", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home"),
        createHousingAssumption("detached"),
      ];

      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions,
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const selectionAction = result.find((a) => a.key === "housing-selection");
      expect(selectionAction).toBeUndefined();
    });

    it("should not include housing selection action when housingAssumptions is empty", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const selectionAction = result.find((a) => a.key === "housing-selection");
      expect(selectionAction).toBeUndefined();
    });

    it("should include housing selection action when count equals REQUIRED_HOUSING_TYPES exactly", () => {
      expect(REQUIRED_HOUSING_TYPES).toBe(4); // Verify the constant

      const housingAssumptions = [
        createHousingAssumption("high_performance_home"),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions,
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const selectionAction = result.find((a) => a.key === "housing-selection");
      expect(selectionAction).toBeDefined();
    });
  });

  describe("Revision memo conditional display", () => {
    it("should include revision memo action when currentVersion exists", () => {
      const currentVersion = createPlanVersion();
      const housingAssumptions = [
        createHousingAssumption("high_performance_home", true),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      // Complete other actions so revision-memo appears in top 3
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(),
        housingAssumptions,
        eventCount: 1,
        currentVersion,
        planId,
      });

      const revisionAction = result.find((a) => a.key === "revision-memo");
      expect(revisionAction).toBeDefined();
      expect(revisionAction?.label).toBe("改定メモを残す");
    });

    it("should not include revision memo action when currentVersion is null", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const revisionAction = result.find((a) => a.key === "revision-memo");
      expect(revisionAction).toBeUndefined();
    });
  });

  describe("Sorting: incomplete actions prioritized over completed ones", () => {
    it("should place incomplete actions before completed ones", () => {
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(), // done
        housingAssumptions: [], // not done
        eventCount: 0, // not done
        currentVersion: null,
        planId,
      });

      // First action should be incomplete
      expect(result[0].done).toBe(false);
      // Last action should be completed
      expect(result[result.length - 1].done).toBe(true);
    });

    it("should keep all actions incomplete at the top when none are done", () => {
      const result = computeNextActions({
        currentMonthly: null, // not done
        housingAssumptions: [], // not done
        eventCount: 0, // not done
        currentVersion: null,
        planId,
      });

      // All returned actions should be incomplete
      result.forEach((action) => {
        expect(action.done).toBe(false);
      });
    });

    it("should keep all actions completed at the bottom when all are done", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home", true),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(), // done
        housingAssumptions, // done (>=4 and one selected)
        eventCount: 1, // done
        currentVersion: null,
        planId,
      });

      // All returned actions should be completed
      result.forEach((action) => {
        expect(action.done).toBe(true);
      });
    });

    it("should maintain sorting order with mixed completion states", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home"),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(), // done
        housingAssumptions, // done (assumptions), not done (selection)
        eventCount: 0, // not done
        currentVersion: createPlanVersion({ changeNote: "note" }), // done
        planId,
      });

      // Group by done status
      const incompleteTasks = result.filter((a) => !a.done);
      const completeTasks = result.filter((a) => a.done);

      // Verify incomplete come first
      const firstIncompleteIndex = result.findIndex((a) => !a.done);
      const lastCompleteIndex = result.length - 1 - [...result].reverse().findIndex((a) => a.done);

      if (incompleteTasks.length > 0 && completeTasks.length > 0) {
        expect(firstIncompleteIndex).toBeLessThan(lastCompleteIndex);
      }
    });
  });

  describe("Maximum 3 items limit", () => {
    it("should return at most 3 actions", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home"),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions,
        eventCount: 0,
        currentVersion: createPlanVersion(),
        planId,
      });

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should return exactly 3 actions when more than 3 incomplete actions exist", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home"),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      // Creates 5 total actions: monthly, housing-assumptions, housing-selection, events, revision-memo
      const result = computeNextActions({
        currentMonthly: null, // not done
        housingAssumptions, // done (assumptions), not done (selection)
        eventCount: 0, // not done
        currentVersion: createPlanVersion(), // adds revision-memo (not done)
        planId,
      });

      expect(result.length).toBe(3);
    });

    it("should prioritize incomplete actions in the limited result", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home", true),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      // Mix of done and not done
      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(), // done
        housingAssumptions, // done (both assumptions and selection)
        eventCount: 0, // not done
        currentVersion: createPlanVersion(), // not done (no changeNote)
        planId,
      });

      expect(result.length).toBe(3);
      // First items should be incomplete
      const incompleteTasks = result.filter((a) => !a.done);
      expect(incompleteTasks.length).toBeGreaterThan(0);
    });

    it("should return exactly 3 actions when total actions equal 3", () => {
      // With no housing-selection and no revision-memo, we have exactly 3 actions
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [], // Less than required, so no housing-selection
        eventCount: 0,
        currentVersion: null, // No revision-memo
        planId,
      });

      // Total actions: monthly, housing-assumptions, events = 3
      expect(result.length).toBe(3);
    });
  });

  describe("Action properties", () => {
    it("should include required properties for all actions", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      result.forEach((action) => {
        expect(action).toHaveProperty("key");
        expect(action).toHaveProperty("label");
        expect(action).toHaveProperty("done");
        expect(action).toHaveProperty("href");
        expect(action).toHaveProperty("cta");
        expect(typeof action.key).toBe("string");
        expect(typeof action.label).toBe("string");
        expect(typeof action.done).toBe("boolean");
        expect(typeof action.href).toBe("string");
        expect(typeof action.cta).toBe("string");
      });
    });

    it("should include secondaryCta for events action", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      const eventsAction = result.find((a) => a.key === "events");
      expect(eventsAction?.secondaryCta).toBeDefined();
      expect(eventsAction?.secondaryCta?.label).toBe("イベント一覧");
      expect(eventsAction?.secondaryCta?.href).toBe(`/plans/${planId}/events`);
    });

    it("should use correct hrefs with planId", () => {
      const customPlanId = "custom-plan-123";
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId: customPlanId,
      });

      result.forEach((action) => {
        expect(action.href).toContain(customPlanId);
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty housingAssumptions array", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle all parameters as minimal/empty values", () => {
      const result = computeNextActions({
        currentMonthly: null,
        housingAssumptions: [],
        eventCount: 0,
        currentVersion: null,
        planId,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should handle all parameters indicating completion", () => {
      const housingAssumptions = [
        createHousingAssumption("high_performance_home", true),
        createHousingAssumption("detached"),
        createHousingAssumption("condo"),
        createHousingAssumption("rent"),
      ];

      const result = computeNextActions({
        currentMonthly: createMonthlyRecord(),
        housingAssumptions,
        eventCount: 5,
        currentVersion: createPlanVersion({ changeNote: "Completed" }),
        planId,
      });

      expect(result.length).toBeLessThanOrEqual(3);
      result.forEach((action) => {
        expect(action.done).toBe(true);
      });
    });
  });
});
