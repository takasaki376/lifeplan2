import type { Id, MonthlyItem, MonthlyRecord, YearMonth } from "../../domain/types";
import { getByIndex, txDel, txPut } from "../../db";
import { STORES } from "../../db/schema";
import type {
  MonthlyItemInput,
  MonthlyListParams,
  MonthlyRecordInput,
  MonthlyRecordPatch,
  RepoContext,
} from "../types";
import { RepoError, RepoNotFoundError } from "../types";
import {
  createId,
  nowIso,
  txGetByIndex,
  txListByIndex,
  withOptionalTx,
} from "./utils";

const parseYm = (ym: YearMonth) => {
  const [yearStr, monthStr] = ym.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RepoError("invalid_year_month", { meta: { ym } });
  }
  return { year, month };
};

const formatYm = (year: number, month: number): YearMonth => {
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}` as YearMonth;
};

const getPreviousYm = (ym: YearMonth): YearMonth => {
  const { year, month } = parseYm(ym);
  if (month === 1) {
    return formatYm(year - 1, 12);
  }
  return formatYm(year, month - 1);
};

const sortRecords = (records: MonthlyRecord[], sort?: MonthlyListParams["sort"]) => {
  if (sort === "ymAsc") {
    return [...records].sort((a, b) => a.ym.localeCompare(b.ym));
  }
  return [...records].sort((a, b) => b.ym.localeCompare(a.ym));
};

export class IndexedDbMonthlyRepository {
  async getByYm(
    planId: Id,
    ym: YearMonth,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord | undefined> {
    if (ctx?.tx) {
      return txGetByIndex<MonthlyRecord>(
        ctx.tx,
        STORES.monthlyRecords,
        "by_planId_ym",
        [planId, ym],
      );
    }
    return getByIndex<MonthlyRecord>(STORES.monthlyRecords, "by_planId_ym", [
      planId,
      ym,
    ]);
  }

  async listByPlan(
    planId: Id,
    params?: MonthlyListParams,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord[]> {
    const records = await withOptionalTx(
      ctx?.tx,
      STORES.monthlyRecords,
      "readonly",
      (tx) =>
        txListByIndex<MonthlyRecord>(tx, STORES.monthlyRecords, "by_planId", {
          key: planId,
        }),
    );

    const filtered = params?.year
      ? records.filter((record) => parseYm(record.ym).year === params.year)
      : records;

    return sortRecords(filtered, params?.sort);
  }

  async upsert(
    record: MonthlyRecordInput,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord> {
    return withOptionalTx(
      ctx?.tx,
      STORES.monthlyRecords,
      "readwrite",
      async (tx) => {
        const existing = await txGetByIndex<MonthlyRecord>(
          tx,
          STORES.monthlyRecords,
          "by_planId_ym",
          [record.planId, record.ym],
        );

        if (existing && record.id && existing.id !== record.id) {
          throw new RepoError("monthly_upsert_conflict", {
            entity: "MonthlyRecord",
            meta: { planId: record.planId, ym: record.ym },
          });
        }

        const now = nowIso();
        if (existing) {
          const updated: MonthlyRecord = {
            ...existing,
            ...record,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: now,
          };
          await txPut(tx, STORES.monthlyRecords, updated);
          return updated;
        }

        const created: MonthlyRecord = {
          ...record,
          id: record.id ?? createId(),
          createdAt: now,
          updatedAt: now,
        };
        await txPut(tx, STORES.monthlyRecords, created);
        return created;
      },
    );
  }

  async upsertByYm(
    planId: Id,
    ym: YearMonth,
    patch: MonthlyRecordPatch,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord> {
    return withOptionalTx(
      ctx?.tx,
      STORES.monthlyRecords,
      "readwrite",
      async (tx) => {
        const existing = await txGetByIndex<MonthlyRecord>(
          tx,
          STORES.monthlyRecords,
          "by_planId_ym",
          [planId, ym],
        );
        const now = nowIso();

        if (existing) {
          const updated: MonthlyRecord = {
            ...existing,
            ...patch,
            updatedAt: now,
          };
          await txPut(tx, STORES.monthlyRecords, updated);
          return updated;
        }

        const created: MonthlyRecord = {
          id: createId(),
          planId,
          ym,
          isFinalized: false,
          createdAt: now,
          updatedAt: now,
          ...patch,
        };
        await txPut(tx, STORES.monthlyRecords, created);
        return created;
      },
    );
  }

  async copyFromPreviousMonth(
    planId: Id,
    ym: YearMonth,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord> {
    return withOptionalTx(
      ctx?.tx,
      STORES.monthlyRecords,
      "readwrite",
      async (tx) => {
        const existing = await txGetByIndex<MonthlyRecord>(
          tx,
          STORES.monthlyRecords,
          "by_planId_ym",
          [planId, ym],
        );
        if (existing) {
          throw new RepoError("monthly_copy_exists", {
            entity: "MonthlyRecord",
            meta: { planId, ym },
          });
        }

        const prevYm = getPreviousYm(ym);
        const prev = await txGetByIndex<MonthlyRecord>(
          tx,
          STORES.monthlyRecords,
          "by_planId_ym",
          [planId, prevYm],
        );
        if (!prev) {
          throw new RepoNotFoundError("MonthlyRecord", { planId, ym: prevYm });
        }

        const now = nowIso();
        const created: MonthlyRecord = {
          ...prev,
          id: createId(),
          ym,
          isFinalized: false,
          createdAt: now,
          updatedAt: now,
        };
        await txPut(tx, STORES.monthlyRecords, created);
        return created;
      },
    );
  }

  async deleteByYm(planId: Id, ym: YearMonth, ctx?: RepoContext): Promise<void> {
    await withOptionalTx(
      ctx?.tx,
      [STORES.monthlyRecords, STORES.monthlyItems],
      "readwrite",
      async (tx) => {
        const record = await txGetByIndex<MonthlyRecord>(
          tx,
          STORES.monthlyRecords,
          "by_planId_ym",
          [planId, ym],
        );
        if (!record) return;

        const items = await txListByIndex<MonthlyItem>(
          tx,
          STORES.monthlyItems,
          "by_monthlyRecordId",
          { key: record.id },
        );
        for (const item of items) {
          await txDel(tx, STORES.monthlyItems, item.id);
        }
        await txDel(tx, STORES.monthlyRecords, record.id);
      },
    );
  }

  async listItems(monthlyRecordId: Id, ctx?: RepoContext): Promise<MonthlyItem[]> {
    return withOptionalTx(
      ctx?.tx,
      STORES.monthlyItems,
      "readonly",
      (tx) =>
        txListByIndex<MonthlyItem>(tx, STORES.monthlyItems, "by_monthlyRecordId", {
          key: monthlyRecordId,
        }),
    );
  }

  async replaceItems(
    monthlyRecordId: Id,
    items: MonthlyItemInput[],
    ctx?: RepoContext,
  ): Promise<void> {
    await withOptionalTx(
      ctx?.tx,
      STORES.monthlyItems,
      "readwrite",
      async (tx) => {
        const existing = await txListByIndex<MonthlyItem>(
          tx,
          STORES.monthlyItems,
          "by_monthlyRecordId",
          { key: monthlyRecordId },
        );
        for (const item of existing) {
          await txDel(tx, STORES.monthlyItems, item.id);
        }

        for (const item of items) {
          await txPut(tx, STORES.monthlyItems, {
            ...item,
            id: item.id ?? createId(),
            monthlyRecordId,
          });
        }
      },
    );
  }

  async deleteItemsByRecord(
    monthlyRecordId: Id,
    ctx?: RepoContext,
  ): Promise<void> {
    await withOptionalTx(
      ctx?.tx,
      STORES.monthlyItems,
      "readwrite",
      async (tx) => {
        const items = await txListByIndex<MonthlyItem>(
          tx,
          STORES.monthlyItems,
          "by_monthlyRecordId",
          { key: monthlyRecordId },
        );
        for (const item of items) {
          await txDel(tx, STORES.monthlyItems, item.id);
        }
      },
    );
  }
}
