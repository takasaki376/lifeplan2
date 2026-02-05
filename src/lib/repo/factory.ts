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

let repositoriesInstance: Repositories | null = null;

/**
 * Get shared repository instances.
 *
 * Creates a singleton set of repositories on first call.
 * Subsequent calls return the same instances.
 *
 * Note: Repository classes are stateless wrappers around IndexedDB.
 * The actual database connection is managed as a singleton in db/index.ts.
 *
 * This pattern:
 * - Avoids creating unnecessary class instances on component re-mount
 * - Prepares for future Supabase migration where connection pooling may matter
 * - Maintains the same interface for easy testing/mocking
 *
 * @returns Shared repository instances
 */
export const getRepositories = (): Repositories => {
  if (!repositoriesInstance) {
    repositoriesInstance = {
      plan: new IndexedDbPlanRepository(),
      version: new IndexedDbVersionRepository(),
      monthly: new IndexedDbMonthlyRepository(),
      event: new IndexedDbEventRepository(),
      housing: new IndexedDbHousingRepository(),
    };
  }
  return repositoriesInstance;
};

/**
 * @deprecated Use getRepositories() instead for better performance.
 * This function is kept for backward compatibility but simply calls getRepositories().
 */
export const createRepositories = getRepositories;
