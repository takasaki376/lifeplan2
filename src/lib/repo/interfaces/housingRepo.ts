import type { HousingAssumptions, HousingType, Id } from "../../domain/types";
import type { HousingAssumptionsInput, RepoContext } from "../types";

export interface HousingRepository {
  listByVersion(
    planVersionId: Id,
    ctx?: RepoContext,
  ): Promise<HousingAssumptions[]>;
  getByType(
    planVersionId: Id,
    housingType: HousingType,
    ctx?: RepoContext,
  ): Promise<HousingAssumptions | undefined>;
  upsert(
    assumptions: HousingAssumptionsInput,
    ctx?: RepoContext,
  ): Promise<void>;
  setSelected(
    planVersionId: Id,
    housingType: HousingType,
    ctx?: RepoContext,
  ): Promise<void>;
  applyPreset(
    planVersionId: Id,
    housingType: HousingType,
    preset: "conservative" | "base" | "optimistic",
    ctx?: RepoContext,
  ): Promise<void>;
}
