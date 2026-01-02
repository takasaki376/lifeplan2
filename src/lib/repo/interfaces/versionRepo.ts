import type { Id, PlanVersion } from "../../domain/types";
import type {
  RepoContext,
  ScenarioAssumptionsSet,
  ScenarioAssumptionsSetInput,
  VersionCreateInput,
} from "../types";

export interface VersionRepository {
  listByPlan(planId: Id, ctx?: RepoContext): Promise<PlanVersion[]>;
  get(versionId: Id, ctx?: RepoContext): Promise<PlanVersion | undefined>;
  getCurrent(planId: Id, ctx?: RepoContext): Promise<PlanVersion | undefined>;
  createInitial(
    planId: Id,
    input?: VersionCreateInput,
    ctx?: RepoContext,
  ): Promise<PlanVersion>;
  createFromCurrent(
    planId: Id,
    changeNote?: string,
    ctx?: RepoContext,
  ): Promise<PlanVersion>;
  setCurrent(planId: Id, versionId: Id, ctx?: RepoContext): Promise<void>;
  delete(versionId: Id, ctx?: RepoContext): Promise<void>;
  getScenarioSet(
    versionId: Id,
    ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet>;
  upsertScenarioSet(
    versionId: Id,
    set: ScenarioAssumptionsSetInput,
    ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet>;
  ensureScenarioSet(
    versionId: Id,
    ctx?: RepoContext,
  ): Promise<ScenarioAssumptionsSet>;
}
