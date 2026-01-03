"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  ChevronRight,
  Copy,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  FileText,
  History,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import type { MonthlyRecord, Plan, YearMonth } from "@/lib/domain/types";
import { formatYearMonth, formatYen, getCurrentYearMonth } from "@/lib/format";
import { createRepositories } from "@/lib/repo/factory";
import { RepoError, RepoNotFoundError } from "@/lib/repo/types";

type MonthRow = {
  ym: YearMonth;
  label: string;
  status: "entered" | "missing";
  record?: MonthlyRecord;
  isCurrentMonth: boolean;
};

type DeleteTarget = {
  ym: YearMonth;
  label: string;
};

const getYearFromYm = (ym: string) => Number(ym.slice(0, 4));

const buildFallbackYears = (centerYear: number) =>
  Array.from({ length: 5 }, (_, index) => centerYear - 2 + index);

const formatYenOrDash = (value?: number) => {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "0円";
  return formatYen(value, { showDashForEmpty: false });
};

const formatDateShort = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ja-JP");
};

export default function MonthlyListPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const repos = useMemo(() => createRepositories(), []);
  const currentYm = getCurrentYearMonth();
  const currentYear = getYearFromYm(currentYm);
  const tabValue = "monthly";

  const [plan, setPlan] = useState<Plan | null>(null);
  const [allRecords, setAllRecords] = useState<MonthlyRecord[]>([]);
  const [yearRecords, setYearRecords] = useState<MonthlyRecord[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "missing" | "entered"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DeleteTarget | null>(null);
  const [actionLoading, setActionLoading] = useState<YearMonth | null>(null);

  const loadYearRecords = useCallback(
    async (year: number) => {
      setError(null);
      try {
        const records = await repos.monthly.listByPlan(planId, {
          year,
          sort: "ymAsc",
        });
        setYearRecords(records);
      } catch (fetchError) {
        console.error(fetchError);
        setError("月次データの読み込みに失敗しました");
        toast.error("月次データの読み込みに失敗しました");
      }
    },
    [planId, repos]
  );

  const refreshRecords = useCallback(
    async (yearOverride?: number | null) => {
      const records = await repos.monthly.listByPlan(planId);
      setAllRecords(records);
      const recordYears = Array.from(
        new Set(records.map((record) => getYearFromYm(record.ym)))
      ).sort((a, b) => b - a);
      const fallbackYears = buildFallbackYears(currentYear).sort(
        (a, b) => b - a
      );
      const resolvedYears =
        recordYears.length > 0 ? recordYears : fallbackYears;
      setYears(resolvedYears);
      const resolvedYear =
        yearOverride && resolvedYears.includes(yearOverride)
          ? yearOverride
          : resolvedYears[0];
      setSelectedYear(resolvedYear);
      await loadYearRecords(resolvedYear);
    },
    [currentYear, loadYearRecords, planId, repos]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const planData = await repos.plan.get(planId);
        if (!planData) {
          setError("プランが見つかりません");
          return;
        }
        setPlan(planData);
        await refreshRecords(currentYear);
      } catch (fetchError) {
        console.error(fetchError);
        setError("月次データの読み込みに失敗しました");
        toast.error("月次データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [currentYear, planId, refreshRecords, repos]);

  const months = useMemo<MonthRow[]>(() => {
    if (selectedYear === null) return [];
    const byYm = new Map(yearRecords.map((record) => [record.ym, record]));
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const ym = `${selectedYear}-${String(month).padStart(
        2,
        "0"
      )}` as YearMonth;
      const record = byYm.get(ym);
      const label = formatYearMonth(ym);
      return {
        ym,
        label: label && label !== "?" ? label : `${selectedYear}年${month}月`,
        status: record ? "entered" : "missing",
        record,
        isCurrentMonth: ym === currentYm,
      };
    });
  }, [currentYm, selectedYear, yearRecords]);

  const filteredMonths = useMemo(() => {
    if (statusFilter === "all") return months;
    if (statusFilter === "missing") {
      return months.filter((month) => month.status === "missing");
    }
    return months.filter((month) => month.status === "entered");
  }, [months, statusFilter]);

  const enteredCount = months.filter(
    (month) => month.status === "entered"
  ).length;

  const handleCopyPreviousMonth = useCallback(
    async (ym: YearMonth) => {
      setActionLoading(ym);
      try {
        await repos.monthly.copyFromPreviousMonth(planId, ym);
        toast.success("前月コピーが完了しました");
        await refreshRecords(selectedYear);
      } catch (copyError) {
        if (copyError instanceof RepoNotFoundError) {
          toast.info("前月のデータが見つかりません");
        } else if (
          copyError instanceof RepoError &&
          copyError.op === "monthly_copy_exists"
        ) {
          toast.info("前月のデータが既に存在します");
        } else {
          console.error(copyError);
          toast.error("前月コピーに失敗しました");
        }
      } finally {
        setActionLoading(null);
      }
    },
    [planId, refreshRecords, repos, selectedYear]
  );

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.ym);
    try {
      await repos.monthly.deleteByYm(planId, confirmDelete.ym);
      toast.success("月次データを削除しました");
      await refreshRecords(selectedYear);
    } catch (deleteError) {
      console.error(deleteError);
      toast.error("月次データの削除に失敗しました");
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  }, [confirmDelete, planId, refreshRecords, repos, selectedYear]);

  const handleYearChange = (value: string) => {
    const year = Number(value);
    if (!Number.isFinite(year)) return;
    setSelectedYear(year);
    void loadYearRecords(year);
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      dashboard: `/plans/${planId}`,
      monthly: `/plans/${planId}/months`,
      housing: `/plans/${planId}/housing`,
      events: `/plans/${planId}/events`,
      versions: `/plans/${planId}/versions`,
    };
    const next = routes[value];
    if (next) {
      router.push(next);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              プラン一覧
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/plans/${planId}`}
              className="hover:text-foreground transition-colors"
            >
              {plan?.name ?? "プラン"}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">月次</span>
          </nav>

          {/* Title and actions */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">月次一覧</h1>
              <p className="text-muted-foreground">
                各月の入力状況を確認し、必要な月だけ更新できます。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link href={`/plans/${planId}/months/current`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  今月を入力
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/plans/${planId}/months/current/detail`}>
                  <FileText className="h-4 w-4 mr-2" />
                  詳細入力へ
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    エクスポート（将来）
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Desktop Tabs */}
          <div className="hidden sm:block">
            <Tabs value={tabValue} onValueChange={handleTabChange}>
              <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0">
                <TabsTrigger
                  value="dashboard"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Home className="h-4 w-4" />
                  ダッシュボード
                </TabsTrigger>
                <TabsTrigger
                  value="monthly"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Calendar className="h-4 w-4" />
                  月次
                </TabsTrigger>
                <TabsTrigger
                  value="housing"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Home className="h-4 w-4" />
                  住宅LCC
                </TabsTrigger>
                <TabsTrigger
                  value="events"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Calendar className="h-4 w-4" />
                  イベント
                </TabsTrigger>
                <TabsTrigger
                  value="versions"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <History className="h-4 w-4" />
                  見直し（改定）
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Mobile Dropdown */}
          <div className="py-3 sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-transparent"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    月次
                  </span>
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onSelect={() => handleTabChange("dashboard")}>
                  <Home className="mr-2 h-4 w-4" />
                  ダッシュボード
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleTabChange("monthly")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  月次
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleTabChange("housing")}>
                  <Home className="mr-2 h-4 w-4" />
                  住宅LCC
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleTabChange("events")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  イベント
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleTabChange("versions")}>
                  <History className="mr-2 h-4 w-4" />
                  見直し（改定）
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>読み込みに失敗しました</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            読み込み中...
          </Card>
        ) : (
          <>
            {!allRecords.length && (
              <Card className="p-8 text-center mb-6">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h2 className="text-lg font-semibold mb-2">
                  まだ月次データがありません
                </h2>
                <p className="text-muted-foreground mb-4">
                  まずは今月の合計（収入/支出/資産/負債）を入力しましょう
                </p>
                <Button asChild>
                  <Link href={`/plans/${planId}/months/current`}>
                    今月を入力
                  </Link>
                </Button>
              </Card>
            )}

            {/* Control bar */}
            <Card className="p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                  {/* Year selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">年:</span>
                    <Select
                      value={selectedYear?.toString() ?? ""}
                      onValueChange={handleYearChange}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="年を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status filter */}
                  <Tabs
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as "all" | "missing" | "entered")
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="all">すべて</TabsTrigger>
                      <TabsTrigger value="missing">未入力</TabsTrigger>
                      <TabsTrigger value="entered">入力済み</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Summary */}
                <div className="text-sm">
                  <span className="text-muted-foreground">入力済み: </span>
                  <span className="font-semibold">{enteredCount} / 12</span>
                </div>
              </div>
            </Card>

            {/* Month list */}
            <div className="space-y-2">
              <Accordion type="single" collapsible className="space-y-2">
                {filteredMonths.map((month) => {
                  const incomeTotal = month.record?.incomeTotalYen;
                  const expenseTotal = month.record?.expenseTotalYen;
                  const net =
                    incomeTotal !== undefined && expenseTotal !== undefined
                      ? incomeTotal - expenseTotal
                      : undefined;

                  return (
                    <AccordionItem
                      key={month.ym}
                      value={month.ym}
                      className={`border rounded-lg overflow-hidden ${
                        month.isCurrentMonth
                          ? "bg-accent/50 border-primary"
                          : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        {/* Current month indicator */}
                        {month.isCurrentMonth && (
                          <div className="w-1 h-12 bg-primary rounded-full -ml-4" />
                        )}

                        {/* Month label */}
                        <div className="min-w-[120px]">
                          <div className="font-semibold">{month.label}</div>
                          {month.isCurrentMonth && (
                            <div className="text-xs text-primary font-medium">
                              今月
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="min-w-[80px]">
                          {month.status === "entered" ? (
                            <Badge
                              variant="default"
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              入力済み
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              未入力
                            </Badge>
                          )}
                        </div>

                        {/* Mini KPIs */}
                        <div className="hidden lg:flex items-center gap-6 flex-1 text-sm">
                          {month.status === "entered" ? (
                            <>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  収入
                                </div>
                                <div className="font-medium">
                                  {formatYenOrDash(incomeTotal)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  支出
                                </div>
                                <div className="font-medium">
                                  {formatYenOrDash(expenseTotal)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  収支
                                </div>
                                <div
                                  className={`font-medium ${
                                    net !== undefined && net >= 0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatYenOrDash(net)}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                最終更新:{" "}
                                {month.record?.updatedAt
                                  ? formatDateShort(month.record.updatedAt)
                                  : "—"}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">
                              データが入力されていません
                            </div>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-auto">
                          {month.status === "entered" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              disabled={actionLoading === month.ym}
                            >
                              <Link
                                href={`/plans/${planId}/months/${month.ym}`}
                              >
                                編集
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              asChild
                              disabled={actionLoading === month.ym}
                            >
                              <Link
                                href={`/plans/${planId}/months/${month.ym}`}
                              >
                                入力する
                              </Link>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="hidden md:inline-flex"
                            disabled={actionLoading === month.ym}
                          >
                            <Link
                              href={`/plans/${planId}/months/${month.ym}/detail`}
                            >
                              詳細
                            </Link>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actionLoading === month.ym}
                                data-testid={`month-actions-${month.ym}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild className="md:hidden">
                                <Link
                                  href={`/plans/${planId}/months/${month.ym}/detail`}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  詳細
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleCopyPreviousMonth(month.ym)
                                }
                                disabled={
                                  month.status !== "missing" ||
                                  actionLoading === month.ym
                                }
                                data-testid={`month-copy-${month.ym}`}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                前月をコピー
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmDelete({
                                    ym: month.ym,
                                    label: month.label,
                                  })
                                }
                                disabled={
                                  month.status !== "entered" ||
                                  actionLoading === month.ym
                                }
                                className="text-destructive focus:text-destructive"
                                data-testid={`month-delete-${month.ym}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Accordion trigger */}
                          <AccordionTrigger className="p-0 hover:no-underline">
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                          </AccordionTrigger>
                        </div>
                      </div>

                      {/* Expandable content */}
                      <AccordionContent>
                        <Separator />
                        <div className="p-4 pt-4">
                          {month.status === "entered" ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <div className="text-xs text-emerald-700 mb-1">
                                  収入合計
                                </div>
                                <div className="font-semibold text-emerald-900">
                                  {formatYenOrDash(incomeTotal)}
                                </div>
                              </div>
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="text-xs text-red-700 mb-1">
                                  支出合計
                                </div>
                                <div className="font-semibold text-red-900">
                                  {formatYenOrDash(expenseTotal)}
                                </div>
                              </div>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-xs text-blue-700 mb-1">
                                  資産残高
                                </div>
                                <div className="font-semibold text-blue-900">
                                  {formatYenOrDash(
                                    month.record?.assetsBalanceYen
                                  )}
                                </div>
                              </div>
                              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="text-xs text-orange-700 mb-1">
                                  負債残高
                                </div>
                                <div className="font-semibold text-orange-900">
                                  {formatYenOrDash(
                                    month.record?.liabilitiesBalanceYen
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-sm text-muted-foreground py-4">
                              まだデータが入力されていません
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </>
        )}
      </main>

      <AlertDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) {
            setConfirmDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete
                ? `${confirmDelete.label}のデータを削除しますか？`
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(actionLoading)}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={Boolean(actionLoading)}
              data-testid="confirm-delete"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
