"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PiggyBank,
  Receipt,
  Landmark,
  TrendingDown,
  Copy,
  Save,
  Plus,
  LayoutDashboard,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import type { MonthlyRecord, YearMonth } from "@/lib/domain/types";
import {
  formatYearMonth,
  getCurrentYearMonth,
  nextYearMonth,
  parseYenInput,
  prevYearMonth,
} from "@/lib/format";
import { createRepositories } from "@/lib/repo/factory";

export default function MonthlyInputSimplePage() {
  const repos = useMemo(() => createRepositories(), []);
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const rawYm = params["yyyy-mm"];
  const ym = (typeof rawYm === "string"
    ? rawYm
    : getCurrentYearMonth()) as YearMonth;
  const [planName, setPlanName] = useState("");
  const [record, setRecord] = useState<MonthlyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const parsedYm = useMemo(() => {
    const match = /^(\d{4})-(\d{2})$/.exec(ym);
    if (!match) return undefined;
    return { year: Number(match[1]), month: Number(match[2]) };
  }, [ym]);
  const currentMonth = parsedYm ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };
  const [scenario, setScenario] = useState<
    "conservative" | "standard" | "optimistic"
  >("standard");
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [income, setIncome] = useState<number | undefined>();
  const [expense, setExpense] = useState<number | undefined>();
  const [assets, setAssets] = useState<number | undefined>();
  const [liabilities, setLiabilities] = useState<number | undefined>();
  const [incomeText, setIncomeText] = useState("");
  const [expenseText, setExpenseText] = useState("");
  const [assetsText, setAssetsText] = useState("");
  const [liabilitiesText, setLiabilitiesText] = useState("");

  // Error state
  const [errors, setErrors] = useState({
    income: "",
    expense: "",
    assets: "",
    liabilities: "",
  });

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || Number.isNaN(amount)) return "";
    return new Intl.NumberFormat("ja-JP").format(amount);
  };

  const formatForInput = (amount?: number) =>
    amount === undefined ? "" : formatCurrency(amount);

  const parseCurrency = (value: string): number | undefined =>
    parseYenInput(value);

  const validateField = (value: number | undefined) => {
    if (value !== undefined && value < 0) {
      return "マイナスの値は入力できません";
    }
    return "";
  };

  const handleInputChange = (
    field: "income" | "expense" | "assets" | "liabilities",
    value: string
  ) => {
    const numValue = parseCurrency(value);
    const error = validateField(numValue);

    setErrors((prev) => ({ ...prev, [field]: error }));

    switch (field) {
      case "income":
        setIncomeText(value);
        setIncome(numValue);
        break;
      case "expense":
        setExpenseText(value);
        setExpense(numValue);
        break;
      case "assets":
        setAssetsText(value);
        setAssets(numValue);
        break;
      case "liabilities":
        setLiabilitiesText(value);
        setLiabilities(numValue);
        break;
    }
  };

  const handleInputBlur = (
    field: "income" | "expense" | "assets" | "liabilities"
  ) => {
    switch (field) {
      case "income":
        setIncomeText(formatForInput(income));
        break;
      case "expense":
        setExpenseText(formatForInput(expense));
        break;
      case "assets":
        setAssetsText(formatForInput(assets));
        break;
      case "liabilities":
        setLiabilitiesText(formatForInput(liabilities));
        break;
    }
  };

  const handleCopyPreviousMonth = () => {
    toast.info("前月コピーは準備中です");
  };

  const computeBalance = () => {
    return (income ?? 0) - (expense ?? 0);
  };

  const formatUpdatedAt = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("ja-JP");
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setPlanName("");
    setRecord(null);
    setIncome(undefined);
    setExpense(undefined);
    setAssets(undefined);
    setLiabilities(undefined);
    setIncomeText("");
    setExpenseText("");
    setAssetsText("");
    setLiabilitiesText("");
    try {
      const [plan, existing] = await Promise.all([
        repos.plan.get(planId),
        repos.monthly.getByYm(planId, ym),
      ]);
      if (!plan) {
        setLoadError("プランが見つかりません");
        return;
      }
      setPlanName(plan.name);
      setRecord(existing ?? null);
      setIncome(existing?.incomeTotalYen);
      setExpense(existing?.expenseTotalYen);
      setAssets(existing?.assetsBalanceYen);
      setLiabilities(existing?.liabilitiesBalanceYen);
      setIncomeText(formatForInput(existing?.incomeTotalYen));
      setExpenseText(formatForInput(existing?.expenseTotalYen));
      setAssetsText(formatForInput(existing?.assetsBalanceYen));
      setLiabilitiesText(formatForInput(existing?.liabilitiesBalanceYen));
    } catch (error) {
      console.error(error);
      setLoadError("読み込みに失敗しました");
      toast.error("読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [planId, repos, ym]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = async (finalize = true) => {
    if (isLoading || loadError) return;
    const hasError = Object.values(errors).some((value) => value.length > 0);
    if (hasError) {
      toast.error("入力内容を確認してください");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await repos.monthly.upsertByYm(planId, ym, {
        incomeTotalYen: income,
        expenseTotalYen: expense,
        assetsBalanceYen: assets,
        liabilitiesBalanceYen: liabilities,
        isFinalized: finalize ? true : record?.isFinalized ?? false,
      });
      setRecord(updated);
      toast.success("保存しました");
      if (finalize) {
        router.push(`/plans/${planId}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const getMonthLabel = () => {
    const formatted = formatYearMonth(ym);
    if (!formatted || formatted === "?") {
      return `${currentMonth.year}年${currentMonth.month}月`;
    }
    return formatted;
  };

  const handlePreviousMonth = () => {
    const prev = prevYearMonth(ym);
    if (!prev) return;
    router.push(`/plans/${planId}/months/${prev}`);
  };

  const handleNextMonth = () => {
    const next = nextYearMonth(ym);
    if (!next) return;
    router.push(`/plans/${planId}/months/${next}`);
  };

  const handleMonthSelect = (month: number) => {
    const nextYm = `${currentMonth.year}-${String(month).padStart(2, "0")}` as YearMonth;
    router.push(`/plans/${planId}/months/${nextYm}`);
  };

  const isExisting = Boolean(record);
  const lastUpdated = record?.updatedAt ? formatUpdatedAt(record.updatedAt) : undefined;
  const actionDisabled = isSaving || isLoading || Boolean(loadError);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          {/* Breadcrumb */}
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              プラン一覧
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/plans/${planId}`}
              className="hover:text-foreground transition-colors"
            >
              {planName || "プラン"}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">月次</span>
          </div>

          {/* Title & Actions Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                今月の入力（かんたん）
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                正確でなくてOK。あとから修正できます。
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Scenario Selector (Optional) */}
              <Tabs
                value={scenario}
                onValueChange={(v) => setScenario(v as typeof scenario)}
                className="hidden sm:block"
              >
                <TabsList className="h-9">
                  <TabsTrigger value="conservative" className="text-xs">
                    保守
                  </TabsTrigger>
                  <TabsTrigger value="standard" className="text-xs">
                    標準
                  </TabsTrigger>
                  <TabsTrigger value="optimistic" className="text-xs">
                    楽観
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button onClick={() => handleSave(true)} disabled={actionDisabled}>
                <Save className="mr-2 h-4 w-4" />
                保存して戻る
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle>読み込みに失敗しました</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="h-6 w-40 rounded bg-muted animate-pulse" />
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`monthly-skeleton-${index}`}
                      className="h-24 rounded bg-muted animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
          {/* SECTION 1: MONTH PICKER + STATUS */}
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Month Selector */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">前月</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-[140px] justify-between bg-transparent"
                      >
                        {getMonthLabel()}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-[140px]">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <DropdownMenuItem
                          key={m}
                          onClick={() => handleMonthSelect(m)}
                        >
                          {currentMonth.year}年{m}月
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">次月</span>
                  </Button>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Badge
                    variant={isExisting ? "default" : "destructive"}
                    className={
                      isExisting
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : ""
                    }
                  >
                    {isExisting ? "入力済み" : "未入力"}
                  </Badge>
                  {isExisting && lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      最終更新: {lastUpdated}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: THE 4 INPUT BOXES */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 1) Income */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/20">
                    <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-base">収入合計</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="text"
                      value={incomeText}
                      onChange={(e) =>
                        handleInputChange("income", e.target.value)
                      }
                      onBlur={() => handleInputBlur("income")}
                      className="pr-8 text-right text-lg font-semibold"
                      placeholder="0"
                      aria-label="収入合計"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      円
                    </span>
                  </div>
                  {errors.income && (
                    <p className="text-xs text-destructive">{errors.income}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  手取りの合計でOK
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleCopyPreviousMonth}
                  className="h-auto p-0 text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  前月値をコピー
                </Button>
              </CardContent>
            </Card>

            {/* 2) Expense */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                    <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <CardTitle className="text-base">支出合計</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="text"
                      value={expenseText}
                      onChange={(e) =>
                        handleInputChange("expense", e.target.value)
                      }
                      onBlur={() => handleInputBlur("expense")}
                      className="pr-8 text-right text-lg font-semibold"
                      placeholder="0"
                      aria-label="支出合計"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      円
                    </span>
                  </div>
                  {errors.expense && (
                    <p className="text-xs text-destructive">{errors.expense}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  固定費＋変動費の合計でOK
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleCopyPreviousMonth}
                  className="h-auto p-0 text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  前月値をコピー
                </Button>
              </CardContent>
            </Card>

            {/* 3) Assets */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/20">
                    <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-base">資産残高（総額）</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="text"
                      value={assetsText}
                      onChange={(e) =>
                        handleInputChange("assets", e.target.value)
                      }
                      onBlur={() => handleInputBlur("assets")}
                      className="pr-8 text-right text-lg font-semibold"
                      placeholder="0"
                      aria-label="資産残高"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      円
                    </span>
                  </div>
                  {errors.assets && (
                    <p className="text-xs text-destructive">{errors.assets}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  貯蓄・投資の合計（概算でOK）
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleCopyPreviousMonth}
                  className="h-auto p-0 text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  前月値をコピー
                </Button>
              </CardContent>
            </Card>

            {/* 4) Liabilities */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/20">
                    <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-base">負債残高（総額）</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="text"
                      value={
                        liabilitiesText
                      }
                      onChange={(e) =>
                        handleInputChange("liabilities", e.target.value)
                      }
                      onBlur={() => handleInputBlur("liabilities")}
                      className="pr-8 text-right text-lg font-semibold"
                      placeholder="0"
                      aria-label="負債残高"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      円
                    </span>
                  </div>
                  {errors.liabilities && (
                    <p className="text-xs text-destructive">
                      {errors.liabilities}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  住宅ローンなどの残高（なければ0）
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleCopyPreviousMonth}
                  className="h-auto p-0 text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  前月値をコピー
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 3: QUICK SUMMARY */}
          <Card className="shadow-sm border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">今月の収支（概算）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p
                  className={`text-3xl font-bold ${
                    computeBalance() >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {computeBalance() >= 0 ? "+" : ""}
                  {formatCurrency(computeBalance())}円
                </p>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                収支は概算です（前提の詳細は後で調整できます）
              </p>
            </CardContent>
          </Card>

          {/* SECTION 4: OPTIONAL SHORTCUTS */}
          <Card className="shadow-sm bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">次にやるなら（任意）</CardTitle>
              <CardDescription className="text-xs">
                まずは合計だけで十分です
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start bg-card"
              >
                <Link href={`/plans/${planId}/months/${ym}/detail`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  詳細入力へ（カテゴリ内訳）
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start bg-card"
              >
                <Link href={`/plans/${planId}/events/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  イベントを追加
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start bg-card"
              >
                <Link href={`/plans/${planId}`}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  ダッシュボードへ戻る
                </Link>
              </Button>
            </CardContent>
          </Card>
          </div>
        )}
      </main>

      {/* FOOTER ACTIONS (Sticky on Mobile) */}
      <footer className="sticky bottom-0 border-t bg-card p-4 shadow-lg sm:relative sm:shadow-none">
        <div className="container mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={actionDisabled}
            className="flex-1 sm:flex-none"
          >
            下書き保存
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={actionDisabled}
            className="flex-1 sm:flex-none"
          >
            <Save className="mr-2 h-4 w-4" />
            保存して戻る
          </Button>
        </div>
      </footer>
    </div>
  );
}
