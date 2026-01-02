import type { Id, LifeEvent } from "../../domain/types";
import type {
  EventListParams,
  LifeEventCreateInput,
  LifeEventUpdateInput,
  RepoContext,
} from "../types";

export interface EventRepository {
  listByVersion(
    planVersionId: Id,
    params?: EventListParams,
    ctx?: RepoContext,
  ): Promise<LifeEvent[]>;
  get(eventId: Id, ctx?: RepoContext): Promise<LifeEvent | undefined>;
  create(input: LifeEventCreateInput, ctx?: RepoContext): Promise<LifeEvent>;
  update(input: LifeEventUpdateInput, ctx?: RepoContext): Promise<void>;
  duplicate(eventId: Id, ctx?: RepoContext): Promise<LifeEvent>;
  delete(eventId: Id, ctx?: RepoContext): Promise<void>;
}
