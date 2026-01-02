import type { DbTx } from "../db";
import type {
  EventCadence,
  EventDirection,
  HousingAssumptions,
  HousingType,
  Id,
  LifeEvent,
  MonthlyItem,
  MonthlyRecord,
  Plan,
  PlanVersion,
  ScenarioAssumptions,
  ScenarioKey,
  YearMonth,
} from "../domain/types";

export type RepoContext = {
  tx?: DbTx;
};

export type RepoErrorMeta = Record<string, unknown>;

export class RepoError extends Error {
  readonly op: string;
  readonly entity?: string;
  readonly meta?: RepoErrorMeta;
  readonly cause?: unknown;

  constructor(
    op: string,
    options: {
      message?: string;
      entity?: string;
      meta?: RepoErrorMeta;
      cause?: unknown;
    } = {},
  ) {
    super(options.message ?? op);
    this.name = "RepoError";
    this.op = op;
    this.entity = options.entity;
    this.meta = options.meta;
    this.cause = options.cause;
  }
}

export class RepoNotFoundError extends RepoError {
  constructor(entity: string, meta?: RepoErrorMeta) {
    super("not_found", { entity, meta });
    this.name = "RepoNotFoundError";
  }
}

export type PlanListParams = {
  userId?: Id;
  status?: Plan["status"];
  query?: string;
  sort?: "updatedAtDesc" | "createdAtDesc";
};

export type PlanCreateInput = Pick<Plan, "name"> &
  Partial<Pick<Plan, "householdType" | "note" | "userId">>;

export type PlanUpdateInput = Pick<Plan, "id"> &
  Partial<Pick<Plan, "name" | "householdType" | "note">>;

export type VersionCreateInput = Pick<PlanVersion, "title" | "changeNote">;

export type MonthlyListParams = {
  year?: number;
  sort?: "ymDesc" | "ymAsc";
};

export type MonthlyRecordInput = Omit<
  MonthlyRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: Id;
};

export type MonthlyRecordPatch = Partial<
  Omit<MonthlyRecord, "id" | "planId" | "ym" | "createdAt" | "updatedAt">
>;

export type MonthlyItemInput = Omit<MonthlyItem, "id" | "monthlyRecordId"> & {
  id?: Id;
};

export type EventListParams = {
  scope?: "upcoming" | "past" | "all";
  fromYm?: YearMonth;
  toYm?: YearMonth;
  eventType?: string;
  cadence?: EventCadence;
  direction?: EventDirection;
};

export type LifeEventCreateInput = Omit<
  LifeEvent,
  "id" | "createdAt" | "updatedAt"
>;

export type LifeEventUpdateInput = Pick<LifeEvent, "id"> &
  Partial<Omit<LifeEvent, "id" | "createdAt" | "updatedAt">>;

export type HousingAssumptionsInput = Omit<
  HousingAssumptions,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: Id;
};

export type ScenarioAssumptionsInput = Omit<
  ScenarioAssumptions,
  "id" | "planVersionId" | "createdAt"
>;

export type ScenarioAssumptionsSet = Record<
  ScenarioKey,
  ScenarioAssumptions | undefined
>;

export type ScenarioAssumptionsSetInput = Partial<
  Record<ScenarioKey, ScenarioAssumptionsInput>
>;
