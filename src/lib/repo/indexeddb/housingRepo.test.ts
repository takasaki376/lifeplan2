import { beforeEach, describe, expect, it } from "vitest";

import { listByIndex, put } from "../../db";
import { STORES } from "../../db/schema";
import type { HousingAssumptions } from "../../domain/types";
import { IndexedDbHousingRepository } from "./housingRepo";
import { clearAllStores, nowIso } from "./testUtils";

const repo = new IndexedDbHousingRepository();

beforeEach(async () => {
  await clearAllStores();
});

describe("IndexedDbHousingRepository", () => {
  it("upserts and keeps single selected", async () => {
    const now = nowIso();
    const first: HousingAssumptions = {
      id: "hs-1",
      planVersionId: "ver-1",
      housingType: "rent",
      isSelected: true,
      createdAt: now,
      updatedAt: now,
    };
    await put(STORES.housingAssumptions, first);

    await repo.upsert({
      planVersionId: "ver-1",
      housingType: "condo",
      isSelected: true,
    });

    const list = await repo.listByVersion("ver-1");
    const selected = list.filter((item) => item.isSelected);
    expect(selected).toHaveLength(1);
    expect(selected[0].housingType).toBe("condo");
  });

  it("setSelected toggles selection", async () => {
    const now = nowIso();
    const items: HousingAssumptions[] = [
      {
        id: "hs-1",
        planVersionId: "ver-1",
        housingType: "rent",
        isSelected: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "hs-2",
        planVersionId: "ver-1",
        housingType: "condo",
        isSelected: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
    await Promise.all(items.map((item) => put(STORES.housingAssumptions, item)));

    await repo.setSelected("ver-1", "condo");
    const list = await repo.listByVersion("ver-1");
    const selected = list.filter((item) => item.isSelected);
    expect(selected).toHaveLength(1);
    expect(selected[0].housingType).toBe("condo");
  });

  it("applyPreset inserts defaults when missing", async () => {
    await repo.applyPreset("ver-1", "rent", "base");
    const list = await listByIndex<HousingAssumptions>(
      STORES.housingAssumptions,
      "by_versionId",
      { key: "ver-1" },
    );
    expect(list).toHaveLength(1);
    expect(list[0].housingType).toBe("rent");
    expect(list[0].isSelected).toBe(true);

    await repo.applyPreset("ver-1", "rent", "base");
    const listAfter = await listByIndex<HousingAssumptions>(
      STORES.housingAssumptions,
      "by_versionId",
      { key: "ver-1" },
    );
    expect(listAfter).toHaveLength(1);
  });
});
