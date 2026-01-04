import type { Id, LifeEvent, YearMonth } from "../../domain/types";
import { get, txDel, txGet, txPut } from "../../db";
import { STORES } from "../../db/schema";
import type {
  EventListParams,
  LifeEventCreateInput,
  LifeEventUpdateInput,
  RepoContext,
} from "../types";
import { RepoNotFoundError } from "../types";
import {
  createId,
  nowIso,
  txListByIndex,
  withOptionalTx,
} from "./utils";

const MIN_YM = "0000-00" as YearMonth;
const MAX_YM = "9999-99" as YearMonth;

const currentYm = (): YearMonth => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}` as YearMonth;
};

const normalizeRange = (
  planVersionId: Id,
  params?: EventListParams,
): IDBKeyRange => {
  const from = params?.fromYm ?? MIN_YM;
  const to = params?.toYm ?? MAX_YM;
  return IDBKeyRange.bound([planVersionId, from], [planVersionId, to]);
};

export class IndexedDbEventRepository {
  async listByVersion(
    planVersionId: Id,
    params?: EventListParams,
    ctx?: RepoContext,
  ): Promise<LifeEvent[]> {
    const range = normalizeRange(planVersionId, params);
    const events = await withOptionalTx(
      ctx?.tx,
      STORES.lifeEvents,
      "readonly",
      (tx) =>
        txListByIndex<LifeEvent>(tx, STORES.lifeEvents, "by_versionId_startYm", {
          range,
          direction: "next",
        }),
    );

    const scoped = applyScope(events, params?.scope);
    return applyFilters(scoped, params);
  }

  async get(eventId: Id, ctx?: RepoContext): Promise<LifeEvent | undefined> {
    if (ctx?.tx) {
      return txGet<LifeEvent>(ctx.tx, STORES.lifeEvents, eventId);
    }
    return get<LifeEvent>(STORES.lifeEvents, eventId);
  }

  async create(
    input: LifeEventCreateInput,
    ctx?: RepoContext,
  ): Promise<LifeEvent> {
    const now = nowIso();
    const event: LifeEvent = {
      ...input,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    };

    await withOptionalTx(ctx?.tx, STORES.lifeEvents, "readwrite", async (tx) => {
      await txPut(tx, STORES.lifeEvents, event);
    });

    return event;
  }

  async update(input: LifeEventUpdateInput, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(ctx?.tx, STORES.lifeEvents, "readwrite", async (tx) => {
      const existing = await txGet<LifeEvent>(tx, STORES.lifeEvents, input.id);
      if (!existing) {
        throw new RepoNotFoundError("LifeEvent", { eventId: input.id });
      }
      await txPut(tx, STORES.lifeEvents, {
        ...existing,
        ...input,
        updatedAt: nowIso(),
      });
    });
  }

  async duplicate(eventId: Id, ctx?: RepoContext): Promise<LifeEvent> {
    return withOptionalTx(ctx?.tx, STORES.lifeEvents, "readwrite", async (tx) => {
      const existing = await txGet<LifeEvent>(tx, STORES.lifeEvents, eventId);
      if (!existing) {
        throw new RepoNotFoundError("LifeEvent", { eventId });
      }
      const now = nowIso();
      const baseTitle = existing.title?.trim() ?? "";
      const title = baseTitle ? `${baseTitle}（コピー）` : "（コピー）";
      const duplicated: LifeEvent = {
        ...existing,
        id: createId(),
        createdAt: now,
        updatedAt: now,
        title,
        durationMonths:
          existing.cadence === "once" ? 1 : existing.durationMonths,
      };
      await txPut(tx, STORES.lifeEvents, duplicated);
      return duplicated;
    });
  }

  async delete(eventId: Id, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(ctx?.tx, STORES.lifeEvents, "readwrite", async (tx) => {
      await txDel(tx, STORES.lifeEvents, eventId);
    });
  }
}

const applyScope = (events: LifeEvent[], scope?: EventListParams["scope"]) => {
  if (!scope || scope === "all") return events;
  const nowYm = currentYm();
  if (scope === "upcoming") {
    return events.filter((event) => event.startYm >= nowYm);
  }
  return events.filter((event) => event.startYm < nowYm);
};

const applyFilters = (events: LifeEvent[], params?: EventListParams) => {
  let filtered = events;
  if (params?.eventType) {
    filtered = filtered.filter((event) => event.eventType === params.eventType);
  }
  if (params?.cadence) {
    filtered = filtered.filter((event) => event.cadence === params.cadence);
  }
  if (params?.direction) {
    filtered = filtered.filter((event) => event.direction === params.direction);
  }
  const fromYm = params?.fromYm;
  const toYm = params?.toYm;
  if (fromYm) {
    filtered = filtered.filter((event) => event.startYm >= fromYm);
  }
  if (toYm) {
    filtered = filtered.filter((event) => event.startYm <= toYm);
  }
  return filtered;
};
