import type {
  Id,
  MonthlyItem,
  MonthlyRecord,
  YearMonth,
} from "../../domain/types";
import type {
  MonthlyItemInput,
  MonthlyListParams,
  MonthlyRecordInput,
  MonthlyRecordPatch,
  RepoContext,
} from "../types";

export interface MonthlyRepository {
  getByYm(
    planId: Id,
    ym: YearMonth,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord | undefined>;
  listByPlan(
    planId: Id,
    params?: MonthlyListParams,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord[]>;
  upsert(record: MonthlyRecordInput, ctx?: RepoContext): Promise<MonthlyRecord>;
  upsertByYm(
    planId: Id,
    ym: YearMonth,
    patch: MonthlyRecordPatch,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord>;
  copyFromPreviousMonth(
    planId: Id,
    ym: YearMonth,
    ctx?: RepoContext,
  ): Promise<MonthlyRecord>;
  deleteByYm(planId: Id, ym: YearMonth, ctx?: RepoContext): Promise<void>;
  listItems(monthlyRecordId: Id, ctx?: RepoContext): Promise<MonthlyItem[]>;
  replaceItems(
    monthlyRecordId: Id,
    items: MonthlyItemInput[],
    ctx?: RepoContext,
  ): Promise<void>;
  deleteItemsByRecord(monthlyRecordId: Id, ctx?: RepoContext): Promise<void>;
}
