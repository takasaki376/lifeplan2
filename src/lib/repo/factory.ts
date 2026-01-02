import type {
  EventRepository,
  HousingRepository,
  MonthlyRepository,
  PlanRepository,
  VersionRepository,
} from "./interfaces";
import {
  IndexedDbEventRepository,
  IndexedDbHousingRepository,
  IndexedDbMonthlyRepository,
  IndexedDbPlanRepository,
  IndexedDbVersionRepository,
} from "./indexeddb";

export type Repositories = {
  plan: PlanRepository;
  version: VersionRepository;
  monthly: MonthlyRepository;
  event: EventRepository;
  housing: HousingRepository;
};

export const createRepositories = (): Repositories => {
  // TODO: switch to Supabase when a driver flag/env is decided.
  return {
    plan: new IndexedDbPlanRepository(),
    version: new IndexedDbVersionRepository(),
    monthly: new IndexedDbMonthlyRepository(),
    event: new IndexedDbEventRepository(),
    housing: new IndexedDbHousingRepository(),
  };
};
