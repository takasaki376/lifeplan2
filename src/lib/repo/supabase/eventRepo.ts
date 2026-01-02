import type { Id, LifeEvent } from "../../domain/types";
import type {
  EventListParams,
  LifeEventCreateInput,
  LifeEventUpdateInput,
  RepoContext,
} from "../types";
import type { EventRepository } from "../interfaces/eventRepo";
import { notImplemented } from "./utils";

export class SupabaseEventRepository implements EventRepository {
  async listByVersion(
    _planVersionId: Id,
    _params?: EventListParams,
    _ctx?: RepoContext,
  ): Promise<LifeEvent[]> {
    return notImplemented("EventRepository.listByVersion");
  }

  async get(_eventId: Id, _ctx?: RepoContext): Promise<LifeEvent | undefined> {
    return notImplemented("EventRepository.get");
  }

  async create(
    _input: LifeEventCreateInput,
    _ctx?: RepoContext,
  ): Promise<LifeEvent> {
    return notImplemented("EventRepository.create");
  }

  async update(
    _input: LifeEventUpdateInput,
    _ctx?: RepoContext,
  ): Promise<void> {
    return notImplemented("EventRepository.update");
  }

  async duplicate(
    _eventId: Id,
    _ctx?: RepoContext,
  ): Promise<LifeEvent> {
    return notImplemented("EventRepository.duplicate");
  }

  async delete(_eventId: Id, _ctx?: RepoContext): Promise<void> {
    return notImplemented("EventRepository.delete");
  }
}
