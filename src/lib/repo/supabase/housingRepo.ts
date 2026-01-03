import type {
  HousingAssumptions,
  HousingType,
  Id,
  ScenarioPreset,
} from "../../domain/types";
import type { HousingAssumptionsInput, RepoContext } from "../types";
import type { HousingRepository } from "../interfaces/housingRepo";
import { notImplemented } from "./utils";

export class SupabaseHousingRepository implements HousingRepository {
  async listByVersion(
    _planVersionId: Id,
    _ctx?: RepoContext,
  ): Promise<HousingAssumptions[]> {
    return notImplemented("HousingRepository.listByVersion");
  }

  async getByType(
    _planVersionId: Id,
    _housingType: HousingType,
    _ctx?: RepoContext,
  ): Promise<HousingAssumptions | undefined> {
    return notImplemented("HousingRepository.getByType");
  }

  async upsert(
    _assumptions: HousingAssumptionsInput,
    _ctx?: RepoContext,
  ): Promise<void> {
    return notImplemented("HousingRepository.upsert");
  }

  async setSelected(
    _planVersionId: Id,
    _housingType: HousingType,
    _ctx?: RepoContext,
  ): Promise<void> {
    return notImplemented("HousingRepository.setSelected");
  }

  async applyPreset(
    _planVersionId: Id,
    _housingType: HousingType,
    _preset: ScenarioPreset,
    _ctx?: RepoContext,
  ): Promise<void> {
    return notImplemented("HousingRepository.applyPreset");
  }
}
