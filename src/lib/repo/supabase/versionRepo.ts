import type { Id, PlanVersion } from "../../domain/types";
import type {
  RepoContext,
  ScenarioAssumptionsSet,
  ScenarioAssumptionsSetInput,
  VersionCreateInput,
} from "../types";
import type { VersionRepository } from "../interfaces/versionRepo";
import { notImplemented } from "./utils";

export class SupabaseVersionRepository implements VersionRepository {
  async listByPlan(_planId: Id, _ctx?: RepoContext): Promise<PlanVersion[]> {
    return notImplemented("VersionRepository.listByPlan");
  }

  async get(
    _versionId: Id,
    _ctx?: RepoContext,
  ): Promise<PlanVersion | undefined> {
    return notImplemented("VersionRepository.get");
  }

  async getCurrent(
    _planId: Id,
    _ctx?: RepoContext,
  ): Promise<PlanVersion | undefined> {
    return notImplemented("VersionRepository.getCurrent");
  }

  async createInitial(
    _planId: Id,
    _input?: VersionCreateInput,
    _ctx?: RepoContext,
  ): Promise<PlanVersion> {
    return notImplemented("VersionRepository.createInitial");
  }

  async createFromCurrent(
    _planId: Id,
    _changeNote?: string,
    _ctx?: RepoContext,
  ): Promise<PlanVersion> {
    return notImplemented("VersionRepository.createFromCurrent");
  }

  async setCurrent(
    _planId: Id,
    _versionId: Id,
    _ctx?: RepoContext,
  ): Promise<void> {
    return notImplemented("VersionRepository.setCurrent");
  }

  async delete(_versionId: Id, _ctx?: RepoContext): Promise<void> {
    return notImplemented("VersionRepository.delete");
  }

  async getScenarioSet(
    _versionId: Id,
    _ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet> {
    return notImplemented("VersionRepository.getScenarioSet");
  }

  async upsertScenarioSet(
    _versionId: Id,
    _set: ScenarioAssumptionsSetInput,
    _ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet> {
    return notImplemented("VersionRepository.upsertScenarioSet");
  }

  async ensureScenarioSet(
    _versionId: Id,
    _ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet> {
    return notImplemented("VersionRepository.ensureScenarioSet");
  }
}
