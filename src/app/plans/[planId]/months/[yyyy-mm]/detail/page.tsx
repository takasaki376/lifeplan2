
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import type {
  MonthlyItemKind,
  MonthlyRecord,
  YearMonth,
} from "@/lib/domain/types";
import {
  formatYearMonth,
  formatYen,
  nextYearMonth,
  parseYenInput,
  prevYearMonth,
} from "@/lib/format";
import { createRepositories } from "@/lib/repo/factory";
import { buildScenarioHref, parseScenario } from "@/lib/scenario";

const INCOME_CATEGORIES = [
  { value: "main", label: "主収入" },
  { value: "side", label: "副収入" },
  { value: "other", label: "その他" },
 ] as const;

const EXPENSE_CATEGORIES = [
  { value: "housing", label: "住居費", type: "fixed" },
  { value: "utilities", label: "光熱費", type: "fixed" },
  { value: "communication", label: "通信費", type: "fixed" },
  { value: "food", label: "食費", type: "variable" },
  { value: "daily", label: "日用品", type: "variable" },
  { value: "education", label: "教育", type: "fixed" },
  { value: "insurance", label: "保険", type: "fixed" },
  { value: "transportation", label: "交通", type: "variable" },
  { value: "car", label: "車", type: "fixed" },
  { value: "medical", label: "医療", type: "variable" },
  { value: "entertainment", label: "娯楽", type: "variable" },
  { value: "other", label: "その他", type: "variable" },
 ] as const;

type MonthlyItemRow = {
  id: string;
  kind: MonthlyItemKind;
  category: string;
  amountText: string;
  note: string;
  sortOrder: number;
  expenseType?: "fixed" | "variable";
};

type RowError = {
  note?: string;
  amountText?: string;
};

const formatCurrency = (amount?: number) => {
  if (amount === undefined || Number.isNaN(amount)) return "";
  return new Intl.NumberFormat("ja-JP").format(amount);
};

export default function MonthlyDetailPage() {
  const repos = useMemo(() => createRepositories(), []);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = params.planId as string;
  const rawYm = params["yyyy-mm"];
  const ym = (typeof rawYm === "string" ? rawYm : undefined) as
    | YearMonth
    | undefined;
  const scenarioParam = searchParams.get("scenario");
  const scenarioKey = parseScenario(scenarioParam);
  const buildScenarioLink = (base: string, params?: Record<string, string>) =>
    buildScenarioHref(base, {
      scenario: scenarioKey,
      params,
      includeWhenMissing: true,
    });

  const [planName, setPlanName] = useState("");
  const [record, setRecord] = useState<MonthlyRecord | null>(null);
  const [items, setItems] = useState<MonthlyItemRow[]>([]);
  const [assets, setAssets] = useState<number | undefined>();
  const [liabilities, setLiabilities] = useState<number | undefined>();
  const [assetsText, setAssetsText] = useState("");
  const [liabilitiesText, setLiabilitiesText] = useState("");
  const [monthNote, setMonthNote] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, RowError>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [missingRecord, setMissingRecord] = useState(false);

  const currentMonthLabel = ym ? formatYearMonth(ym) : "月次";

  const mapExpenseType = (category: string): MonthlyItemRow["expenseType"] =>
    EXPENSE_CATEGORIES.find((cat) => cat.value === category)?.type ??
    "variable";

  const toRow = (item: {
    id: string;
    kind: MonthlyItemKind;
    category: string;
    amountYen: number;
    note?: string;
    sortOrder?: number;
  }): MonthlyItemRow => ({
    id: item.id,
    kind: item.kind,
    category: item.category,
    amountText: item.amountYen ? String(item.amountYen) : "",
    note: item.note ?? "",
    sortOrder: item.sortOrder ?? 0,
    expenseType: item.kind === "expense" ? mapExpenseType(item.category) : undefined,
  });

  const loadData = useCallback(async () => {
    if (!planId || !ym) return;
    setIsLoading(true);
    setLoadError(null);
    setMissingRecord(false);
    setPlanName("");
    setRecord(null);
    setItems([]);
    setAssets(undefined);
    setLiabilities(undefined);
    setAssetsText("");
    setLiabilitiesText("");
    setMonthNote("");
    setRowErrors({});
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
      if (!existing) {
        setMissingRecord(true);
        return;
      }
      setRecord(existing);
      setAssets(existing.assetsBalanceYen);
      setLiabilities(existing.liabilitiesBalanceYen);
      setAssetsText(formatCurrency(existing.assetsBalanceYen));
      setLiabilitiesText(formatCurrency(existing.liabilitiesBalanceYen));
      setMonthNote(existing.memo ?? "");
      const list = await repos.monthly.listItems(existing.id);
      const sorted = [...list].sort((a, b) => {
        const aOrder = a.sortOrder ?? 0;
        const bOrder = b.sortOrder ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.id.localeCompare(b.id);
      });
      setItems(sorted.map(toRow));
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

  const getNextSortOrder = (kind: MonthlyItemKind) => {
    const max = items
      .filter((item) => item.kind === kind)
      .reduce((acc, item) => Math.max(acc, item.sortOrder), 0);
    return max + 1;
  };

  const addItem = (kind: MonthlyItemKind) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kind,
        category: "",
        amountText: "",
        note: "",
        sortOrder: getNextSortOrder(kind),
        expenseType: kind === "expense" ? "variable" : undefined,
      },
    ]);
  };

  const updateItem = <K extends keyof MonthlyItemRow>(
    id: string,
    field: K,
    value: MonthlyItemRow[K],
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const duplicateItem = (id: string) => {
    const original = items.find((item) => item.id === id);
    if (!original) return;
    setItems((prev) => [
      ...prev,
      {
        ...original,
        id: crypto.randomUUID(),
        sortOrder: getNextSortOrder(original.kind),
      },
    ]);
  };

  const handleAssetsChange = (value: string) => {
    setAssetsText(value);
    setAssets(parseYenInput(value));
  };

  const handleLiabilitiesChange = (value: string) => {
    setLiabilitiesText(value);
    setLiabilities(parseYenInput(value));
  };

  const validateRows = () => {
    const errors: Record<string, RowError> = {};
    for (const item of items) {
      const entry: RowError = {};
      if (!item.note.trim()) {
        entry.note = "名称は必須です";
      }
      const amount = parseYenInput(item.amountText);
      if (amount === undefined || amount <= 0) {
        entry.amountText = "金額は1円以上で入力してください";
      }
      if (entry.note || entry.amountText) {
        errors[item.id] = entry;
      }
    }
    setRowErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (backToSimple = false) => {
    if (!record || missingRecord) return;
    if (!validateRows()) {
      toast.error("入力内容を確認してください");
      return;
    }
    setIsSaving(true);
    try {
      await repos.monthly.replaceItems(
        record.id,
        items.map((item) => ({
          id: item.id,
          kind: item.kind,
          category: item.category,
          amountYen: parseYenInput(item.amountText) ?? 0,
          note: item.note.trim(),
          sortOrder: item.sortOrder,
        })),
      );
      const updated = await repos.monthly.upsertByYm(planId, record.ym, {
        assetsBalanceYen: assets,
        liabilitiesBalanceYen: liabilities,
        memo: monthNote.trim() ? monthNote.trim() : undefined,
      });
      setRecord(updated);
      toast.success("保存しました");
      if (backToSimple) {
        router.push(buildScenarioLink(`/plans/${planId}/months/${record.ym}`));
      }
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviousMonth = () => {
    if (!ym) return;
    const prev = prevYearMonth(ym);
    if (!prev) return;
    router.push(buildScenarioLink(`/plans/${planId}/months/${prev}/detail`));
  };

  const handleNextMonth = () => {
    if (!ym) return;
    const next = nextYearMonth(ym);
    if (!next) return;
    router.push(buildScenarioLink(`/plans/${planId}/months/${next}/detail`));
  };

  const incomeItems = items.filter((item) => item.kind === "income");
  const expenseItems = items.filter((item) => item.kind === "expense");

  const incomeBreakdownTotal = incomeItems.reduce(
    (sum, item) => sum + (parseYenInput(item.amountText) ?? 0),
    0,
  );
  const expenseBreakdownTotal = expenseItems.reduce(
    (sum, item) => sum + (parseYenInput(item.amountText) ?? 0),
    0,
  );
  const expenseFixed = expenseItems
    .filter((item) => item.expenseType === "fixed")
    .reduce((sum, item) => sum + (parseYenInput(item.amountText) ?? 0), 0);
  const expenseVariable = expenseItems
    .filter((item) => item.expenseType === "variable")
    .reduce((sum, item) => sum + (parseYenInput(item.amountText) ?? 0), 0);

  const netIncome = incomeBreakdownTotal - expenseBreakdownTotal;
  const incomeDiff = (record?.incomeTotalYen ?? 0) - incomeBreakdownTotal;
  const expenseDiff = (record?.expenseTotalYen ?? 0) - expenseBreakdownTotal;

  const isEmpty = incomeItems.length === 0 && expenseItems.length === 0;
  const lastUpdated = record?.updatedAt
    ? new Date(record.updatedAt).toLocaleDateString("ja-JP")
    : undefined;
  const actionDisabled =
    isLoading || isSaving || missingRecord || Boolean(loadError);

  const applyIncomeTemplate = (type: "main" | "main-side") => {
    const base: MonthlyItemRow[] =
      type === "main"
        ? [
            {
              id: crypto.randomUUID(),
              kind: "income",
              category: "main",
              amountText: "",
              note: "",
              sortOrder: getNextSortOrder("income"),
            },
          ]
        : [
            {
              id: crypto.randomUUID(),
              kind: "income",
              category: "main",
              amountText: "",
              note: "",
              sortOrder: getNextSortOrder("income"),
            },
            {
              id: crypto.randomUUID(),
              kind: "income",
              category: "side",
              amountText: "",
              note: "",
              sortOrder: getNextSortOrder("income") + 1,
            },
          ];
    setItems((prev) => [
      ...prev.filter((item) => item.kind !== "income"),
      ...base,
      ...prev.filter((item) => item.kind === "income"),
    ]);
  };

  const applyExpenseTemplate = () => {
    const template: MonthlyItemRow[] = [
      {
        id: crypto.randomUUID(),
        kind: "expense",
        category: "housing",
        amountText: "",
        note: "",
        sortOrder: getNextSortOrder("expense"),
        expenseType: "fixed",
      },
      {
        id: crypto.randomUUID(),
        kind: "expense",
        category: "utilities",
        amountText: "",
        note: "",
        sortOrder: getNextSortOrder("expense") + 1,
        expenseType: "fixed",
      },
      {
        id: crypto.randomUUID(),
        kind: "expense",
        category: "food",
        amountText: "",
        note: "",
        sortOrder: getNextSortOrder("expense") + 2,
        expenseType: "variable",
      },
      {
        id: crypto.randomUUID(),
        kind: "expense",
        category: "daily",
        amountText: "",
        note: "",
        sortOrder: getNextSortOrder("expense") + 3,
        expenseType: "variable",
      },
    ];
    setItems((prev) => [
      ...prev.filter((item) => item.kind !== "expense"),
      ...template,
      ...prev.filter((item) => item.kind === "expense"),
    ]);
  };

  const handleActionNotReady = (label: string) => {
    toast.info(`${label}は準備中です`);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              プラン一覧
            </Link>
            <span>/</span>
            <Link
              href={buildScenarioLink(`/plans/${planId}`)}
              className="hover:text-foreground"
            >
              {planName || "プラン"}
            </Link>
            <span>/</span>
            <Link
              href={buildScenarioLink(`/plans/${planId}/months`)}
              className="hover:text-foreground"
            >
              月次
            </Link>
            <span>/</span>
            <Link
              href={buildScenarioLink(`/plans/${planId}/months/${ym}`)}
              className="hover:text-foreground"
            >
              {currentMonthLabel}
            </Link>
            <span>/</span>
            <span className="text-foreground">詳細</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                月次入力（詳細）
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                カテゴリ内訳を入力できます。合計だけでも十分です。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href={buildScenarioLink(`/plans/${planId}/months/${ym}`)}>
                  かんたん入力へ
                </Link>
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={actionDisabled}
              >
                保存して戻る
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleActionNotReady("この月を複製")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    この月を複製
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleActionNotReady("削除")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle>読み込みに失敗しました</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-4">
                <div className="h-6 w-40 rounded bg-muted animate-pulse" />
                <div className="h-32 rounded bg-muted animate-pulse" />
                <div className="h-32 rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ) : missingRecord ? (
          <Card>
            <CardContent className="py-10">
              <div className="flex flex-col items-center gap-4 text-center">
                <StickyNote className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">
                    先にかんたん入力を完了してください
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    詳細入力は、月次の合計が作成されてから開始できます。
                  </p>
                </div>
                <Button asChild>
                  <Link
                    href={buildScenarioLink(`/plans/${planId}/months/${ym}`)}
                  >
                    かんたん入力へ移動
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousMonth}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {currentMonthLabel}
                      </div>
                      {lastUpdated && (
                        <div className="text-xs text-muted-foreground">
                          最終更新: {lastUpdated}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextMonth}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge>{record ? "入力済み" : "未入力"}</Badge>
                </div>
              </CardContent>
            </Card>

            {isEmpty && (
              <Card className="mb-6">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <StickyNote className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    内訳がまだありません
                  </h3>
                  <p className="mb-6 text-center text-sm text-muted-foreground">
                    テンプレートを使うと簡単に始められます
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        applyIncomeTemplate("main-side");
                        applyExpenseTemplate();
                      }}
                    >
                      テンプレートを追加（おすすめ）
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        addItem("income");
                        addItem("expense");
                      }}
                    >
                      手動で追加
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle>収入（内訳）</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {incomeItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <p className="mb-4 text-sm text-muted-foreground">
                          収入項目がありません
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => applyIncomeTemplate("main")}
                          >
                            主収入のみ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyIncomeTemplate("main-side")}
                          >
                            主＋副
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {incomeItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start"
                          >
                            <div className="grid flex-1 gap-2 sm:grid-cols-[140px_120px_1fr]">
                              <Select
                                value={item.category}
                                onValueChange={(value) =>
                                  updateItem(item.id, "category", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="カテゴリ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {INCOME_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="金額"
                                  value={item.amountText}
                                  onChange={(e) =>
                                    updateItem(
                                      item.id,
                                      "amountText",
                                      e.target.value.replace(/[^\d]/g, ""),
                                    )
                                  }
                                  className="text-right"
                                />
                                {rowErrors[item.id]?.amountText && (
                                  <p className="mt-1 text-xs text-destructive">
                                    {rowErrors[item.id]?.amountText}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Input
                                  type="text"
                                  placeholder="名称"
                                  value={item.note}
                                  onChange={(e) =>
                                    updateItem(item.id, "note", e.target.value)
                                  }
                                />
                                {rowErrors[item.id]?.note && (
                                  <p className="mt-1 text-xs text-destructive">
                                    {rowErrors[item.id]?.note}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 sm:flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => duplicateItem(item.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addItem("income")}
                      className="w-full bg-transparent"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      収入を追加
                    </Button>

                    <Separator />

                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="font-medium">収入内訳 合計</span>
                      <span className="text-lg font-bold">
                        {formatYen(incomeBreakdownTotal)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>支出（内訳）</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {expenseItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <p className="mb-4 text-sm text-muted-foreground">
                          支出項目がありません
                        </p>
                        <Button size="sm" onClick={applyExpenseTemplate}>
                          テンプレートを追加
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {expenseItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start"
                          >
                            <div className="grid flex-1 gap-2 sm:grid-cols-[140px_120px_1fr_80px]">
                              <Select
                                value={item.category}
                                onValueChange={(value) => {
                                  updateItem(item.id, "category", value);
                                  updateItem(
                                    item.id,
                                    "expenseType",
                                    mapExpenseType(value),
                                  );
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="カテゴリ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {EXPENSE_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="金額"
                                  value={item.amountText}
                                  onChange={(e) =>
                                    updateItem(
                                      item.id,
                                      "amountText",
                                      e.target.value.replace(/[^\d]/g, ""),
                                    )
                                  }
                                  className="text-right"
                                />
                                {rowErrors[item.id]?.amountText && (
                                  <p className="mt-1 text-xs text-destructive">
                                    {rowErrors[item.id]?.amountText}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Input
                                  type="text"
                                  placeholder="名称"
                                  value={item.note}
                                  onChange={(e) =>
                                    updateItem(item.id, "note", e.target.value)
                                  }
                                />
                                {rowErrors[item.id]?.note && (
                                  <p className="mt-1 text-xs text-destructive">
                                    {rowErrors[item.id]?.note}
                                  </p>
                                )}
                              </div>
                              <ToggleGroup
                                type="single"
                                value={item.expenseType}
                                onValueChange={(value) => {
                                  if (value) {
                                    updateItem(
                                      item.id,
                                      "expenseType",
                                      value as "fixed" | "variable",
                                    );
                                  }
                                }}
                                className="justify-start"
                              >
                                <ToggleGroupItem
                                  value="fixed"
                                  className="h-9 px-2 text-xs"
                                >
                                  固定
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                  value="variable"
                                  className="h-9 px-2 text-xs"
                                >
                                  変動
                                </ToggleGroupItem>
                              </ToggleGroup>
                            </div>
                            <div className="flex gap-1 sm:flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => duplicateItem(item.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addItem("expense")}
                      className="w-full bg-transparent"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      支出を追加
                    </Button>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="font-medium">支出内訳 合計</span>
                        <span className="text-lg font-bold">
                          {formatYen(expenseBreakdownTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 text-sm">
                        <span className="text-muted-foreground">固定費</span>
                        <span>{formatYen(expenseFixed)}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 text-sm">
                        <span className="text-muted-foreground">変動費</span>
                        <span>{formatYen(expenseVariable)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 lg:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>この月のサマリー</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-muted-foreground">
                        収入合計（内訳）
                      </span>
                      <span className="font-semibold">
                        {formatYen(incomeBreakdownTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-muted-foreground">
                        支出合計（内訳）
                      </span>
                      <span className="font-semibold">
                        {formatYen(expenseBreakdownTotal)}
                      </span>
                    </div>
                    <div
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        netIncome >= 0
                          ? "bg-green-50 dark:bg-green-950/20"
                          : "bg-red-50 dark:bg-red-950/20"
                      }`}
                    >
                      <span className="text-sm font-medium">収支（内訳）</span>
                      <span
                        className={`font-bold ${
                          netIncome >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatYen(netIncome)}
                      </span>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">資産残高</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={assetsText}
                          onChange={(e) => handleAssetsChange(e.target.value)}
                          className="h-8 w-32 text-right"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">負債残高</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={liabilitiesText}
                          onChange={(e) => handleLiabilitiesChange(e.target.value)}
                          className="h-8 w-32 text-right"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>合計との整合（任意）</CardTitle>
                    <CardDescription>
                      かんたん入力の合計と内訳合計の差を表示します
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {incomeDiff === 0 && expenseDiff === 0 ? (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-950/20 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          合計が一致しています
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 rounded-lg border p-3">
                          {incomeDiff !== 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                収入差分
                              </span>
                              <span
                                className={
                                  incomeDiff > 0
                                    ? "text-orange-600"
                                    : "text-blue-600"
                                }
                              >
                                {incomeDiff > 0 ? "+" : ""}
                                {formatYen(incomeDiff)}
                              </span>
                            </div>
                          )}
                          {expenseDiff !== 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                支出差分
                              </span>
                              <span
                                className={
                                  expenseDiff > 0
                                    ? "text-orange-600"
                                    : "text-blue-600"
                                }
                              >
                                {expenseDiff > 0 ? "+" : ""}
                                {formatYen(expenseDiff)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-start gap-2 rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <p className="text-xs text-orange-700 dark:text-orange-400">
                            差分がある場合、以下のボタンで調整できます
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Button variant="secondary" size="sm" className="w-full">
                            内訳合計で合計を上書き
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full">
                            差額を「その他」に追加
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>メモ</CardTitle>
                    <CardDescription>
                      家計の気づきや特記事項を残せます
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="例：今月は冠婚葬祭で支出が増えた"
                      value={monthNote}
                      onChange={(e) => setMonthNote(e.target.value)}
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg lg:hidden">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => handleSave(false)}
            disabled={actionDisabled}
          >
            保存
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleSave(true)}
            disabled={actionDisabled}
          >
            保存して戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
