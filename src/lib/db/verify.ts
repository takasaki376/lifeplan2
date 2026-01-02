import { del, get, listAll, put } from "./index";
import { STORES } from "./schema";

const SMOKE_ID = "__db_smoke__";

export type DbSmokeResult = {
  insertedId: string;
  fetched: boolean;
  listed: boolean;
};

export const verifyDb = async (): Promise<DbSmokeResult> => {
  if (typeof indexedDB === "undefined") {
    throw new Error("indexedDB is not available in this environment.");
  }

  const now = new Date().toISOString();
  const plan = {
    id: SMOKE_ID,
    name: "DB Smoke Test",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await put(STORES.plans, plan);
  const fetched = await get<typeof plan>(STORES.plans, SMOKE_ID);
  const listed = await listAll<typeof plan>(STORES.plans);
  await del(STORES.plans, SMOKE_ID);

  return {
    insertedId: SMOKE_ID,
    fetched: Boolean(fetched?.id === SMOKE_ID),
    listed: listed.some((item) => item.id === SMOKE_ID),
  };
};
