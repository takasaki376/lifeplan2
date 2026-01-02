export const DB_NAME = "lifeplan_mvp";
export const DB_VERSION = 1;

export const STORES = {
  plans: "plans",
  planVersions: "planVersions",
  scenarioAssumptions: "scenarioAssumptions",
  monthlyRecords: "monthlyRecords",
  monthlyItems: "monthlyItems",
  lifeEvents: "lifeEvents",
  housingAssumptions: "housingAssumptions",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

type IndexSpec = {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
};

type StoreSpec = {
  name: StoreName;
  keyPath: string;
  indexes: IndexSpec[];
};

const UNIQUE_INDEX_NAMES = new Set([
  "by_planId_versionNo",
  "by_versionId_scenarioKey",
  "by_planId_ym",
  "by_versionId_type",
]);

const STORE_SPECS: StoreSpec[] = [
  {
    name: STORES.plans,
    keyPath: "id",
    indexes: [
      { name: "by_userId", keyPath: "userId" },
      { name: "by_status", keyPath: "status" },
      { name: "by_archivedAt", keyPath: "archivedAt" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
      { name: "by_userId_status", keyPath: ["userId", "status"] },
      { name: "by_userId_updatedAt", keyPath: ["userId", "updatedAt"] },
    ],
  },
  {
    name: STORES.planVersions,
    keyPath: "id",
    indexes: [
      { name: "by_planId", keyPath: "planId" },
      {
        name: "by_planId_versionNo",
        keyPath: ["planId", "versionNo"],
        options: { unique: true },
      },
      {
        name: "by_planId_isCurrent",
        keyPath: ["planId", "isCurrent"],
      },
      { name: "by_createdAt", keyPath: "createdAt" },
    ],
  },
  {
    name: STORES.scenarioAssumptions,
    keyPath: "id",
    indexes: [
      { name: "by_versionId", keyPath: "planVersionId" },
      {
        name: "by_versionId_scenarioKey",
        keyPath: ["planVersionId", "scenarioKey"],
        options: { unique: true },
      },
    ],
  },
  {
    name: STORES.monthlyRecords,
    keyPath: "id",
    indexes: [
      { name: "by_planId", keyPath: "planId" },
      {
        name: "by_planId_ym",
        keyPath: ["planId", "ym"],
        options: { unique: true },
      },
      { name: "by_ym", keyPath: "ym" },
    ],
  },
  {
    name: STORES.monthlyItems,
    keyPath: "id",
    indexes: [
      { name: "by_monthlyRecordId", keyPath: "monthlyRecordId" },
      {
        name: "by_monthlyRecordId_kind",
        keyPath: ["monthlyRecordId", "kind"],
      },
      {
        name: "by_monthlyRecordId_category",
        keyPath: ["monthlyRecordId", "category"],
      },
    ],
  },
  {
    name: STORES.lifeEvents,
    keyPath: "id",
    indexes: [
      { name: "by_versionId", keyPath: "planVersionId" },
      {
        name: "by_versionId_startYm",
        keyPath: ["planVersionId", "startYm"],
      },
      {
        name: "by_versionId_direction",
        keyPath: ["planVersionId", "direction"],
      },
      {
        name: "by_versionId_eventType",
        keyPath: ["planVersionId", "eventType"],
      },
    ],
  },
  {
    name: STORES.housingAssumptions,
    keyPath: "id",
    indexes: [
      { name: "by_versionId", keyPath: "planVersionId" },
      {
        name: "by_versionId_type",
        keyPath: ["planVersionId", "housingType"],
        options: { unique: true },
      },
      {
        name: "by_versionId_isSelected",
        keyPath: ["planVersionId", "isSelected"],
      },
    ],
  },
];

const ensureIndexes = (store: IDBObjectStore, indexes: IndexSpec[]) => {
  indexes.forEach((index) => {
    if (!store.indexNames.contains(index.name)) {
      store.createIndex(index.name, index.keyPath, index.options);
      return;
    }

    if (UNIQUE_INDEX_NAMES.has(index.name)) {
      const existing = store.index(index.name);
      if (!existing.unique) {
        throw new Error(
          `IndexedDB schema mismatch: index "${index.name}" must be unique.`,
        );
      }
    }
  });
};

const getStore = (
  db: IDBDatabase,
  tx: IDBTransaction,
  spec: StoreSpec,
) => {
  if (!db.objectStoreNames.contains(spec.name)) {
    const store = db.createObjectStore(spec.name, { keyPath: spec.keyPath });
    ensureIndexes(store, spec.indexes);
    return;
  }

  const store = tx.objectStore(spec.name);
  ensureIndexes(store, spec.indexes);
};

export const upgradeDb = (db: IDBDatabase, tx: IDBTransaction) => {
  STORE_SPECS.forEach((spec) => getStore(db, tx, spec));
};
