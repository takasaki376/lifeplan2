import type { Id, Plan } from "../../domain/types";
import type {
  PlanCreateInput,
  PlanListParams,
  PlanUpdateInput,
  RepoContext,
} from "../types";
import type { PlanRepository } from "../interfaces/planRepo";
import { notImplemented } from "./utils";

export class SupabasePlanRepository implements PlanRepository {
  async list(_params?: PlanListParams, _ctx?: RepoContext): Promise<Plan[]> {
    return notImplemented("PlanRepository.list");
  }

  async get(_planId: Id, _ctx?: RepoContext): Promise<Plan | undefined> {
    return notImplemented("PlanRepository.get");
  }

  async create(_input: PlanCreateInput, _ctx?: RepoContext): Promise<Plan> {
    return notImplemented("PlanRepository.create");
  }

  async update(_input: PlanUpdateInput, _ctx?: RepoContext): Promise<void> {
    return notImplemented("PlanRepository.update");
  }

  async archive(_planId: Id, _ctx?: RepoContext): Promise<void> {
    return notImplemented("PlanRepository.archive");
  }

  async restore(_planId: Id, _ctx?: RepoContext): Promise<void> {
    return notImplemented("PlanRepository.restore");
  }

  async delete(_planId: Id, _ctx?: RepoContext): Promise<void> {
    return notImplemented("PlanRepository.delete");
  }
}
