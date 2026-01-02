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
import type { MonthlyRepository } from "../interfaces/monthlyRepo";
import { notImplemented } from "./utils";

export class SupabaseMonthlyRepository implements MonthlyRepository {
  async getByYm(
    _planId: Id,
    _ym: YearMonth,
    _ctx?: RepoContext,
  ): Promise<MonthlyRecord | undefined> {
    return notImplemented("MonthlyRepository.getByYm");
  }

  async listByPlan(
    _planId: Id,
    _params?: MonthlyListParams,
    _ctx?: RepoContext,
  ): Promise<MonthlyRecord[]> {
    return notImplemented("MonthlyRepository.listByPlan");
  }

  async upsert(
    _record: MonthlyRecordInput,
    _ctx?: RepoContext,
  ): Promise<MonthlyRecord> {
    return notImplemented("MonthlyRepository.upsert");
  }

  async upsertByYm(
    _planId: Id,
    _ym: YearMonth,
    _patch: MonthlyRecordPatch,
    _ctx?: RepoContext,
  ): Promise<MonthlyRecord> {
    return notImplemented("MonthlyRepository.upsertByYm");
  }

  async copyFromPreviousMonth(
    _planId: Id,
    _ym: YearMonth,
    _ctx?: RepoContext,
  ): Promise<MonthlyRecord> {
    return notImplemented("MonthlyRepository.copyFromPreviousMonth");
  }

  async deleteByYm(
    _planId: Id,
    _ym: YearMonth,
    _ctx?: RepoContext,
  ): Promise<void> {
    return notImplemented("MonthlyRepository.deleteByYm");
  }

  async listItems(
    _monthlyRecordId: Id,
    _ctx?: RepoContext,
  ): Promise<MonthlyItem[]> {
    return notImplemented("MonthlyRepository.listItems");
  }

  async replaceItems(
    _monthlyRecordId: Id,
    _items: MonthlyItemInput[],
    _ctx?: RepoContext,
  ): Promise<void> {
    return notImplemented("MonthlyRepository.replaceItems");
  }

  async deleteItemsByRecord(
    _monthlyRecordId: Id,
    _ctx?: RepoContext,
  ): Promise<void> {
    return notImplemented("MonthlyRepository.deleteItemsByRecord");
  }
}
