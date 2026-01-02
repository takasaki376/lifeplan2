import type { Id, Plan } from "../../domain/types";
import type {
  PlanCreateInput,
  PlanListParams,
  PlanUpdateInput,
  RepoContext,
} from "../types";

export interface PlanRepository {
  list(params?: PlanListParams, ctx?: RepoContext): Promise<Plan[]>;
  get(planId: Id, ctx?: RepoContext): Promise<Plan | undefined>;
  create(input: PlanCreateInput, ctx?: RepoContext): Promise<Plan>;
  update(input: PlanUpdateInput, ctx?: RepoContext): Promise<void>;
  archive(planId: Id, ctx?: RepoContext): Promise<void>;
  restore(planId: Id, ctx?: RepoContext): Promise<void>;
  delete(planId: Id, ctx?: RepoContext): Promise<void>;
}
