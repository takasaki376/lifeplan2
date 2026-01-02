"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

// Mock data toggle
const IS_EXISTING = true;

// Income categories
const INCOME_CATEGORIES = [
  { value: "main", label: "主収入" },
  { value: "side", label: "副収入" },
  { value: "other", label: "その他" },
];

// Expense categories
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
];

type IncomeItem = {
  id: string;
  category: string;
  amount: string;
  note: string;
};

type ExpenseItem = {
  id: string;
  category: string;
  amount: string;
  note: string;
  type: "fixed" | "variable";
};

export default function MonthlyDetailPage() {
  const router = useRouter();

  // Mock data
  const planName = "佐藤家のライフプラン";
  const currentMonth = "2026年1月";
  const lastUpdated = "2026/01/15";

  // Simple totals from 4-box entry
  const simpleTotals = {
    income: 600000,
    expense: 580000,
    assets: 3500000,
    liabilities: 25000000,
  };

  // Income breakdown state
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>(
    IS_EXISTING
      ? [
          { id: "1", category: "main", amount: "550000", note: "給与" },
          { id: "2", category: "side", amount: "70000", note: "副業" },
        ]
      : []
  );

  // Expense breakdown state
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(
    IS_EXISTING
      ? [
          {
            id: "1",
            category: "housing",
            amount: "120000",
            note: "家賃",
            type: "fixed",
          },
          {
            id: "2",
            category: "utilities",
            amount: "18000",
            note: "",
            type: "fixed",
          },
          {
            id: "3",
            category: "communication",
            amount: "12000",
            note: "",
            type: "fixed",
          },
          {
            id: "4",
            category: "food",
            amount: "80000",
            note: "",
            type: "variable",
          },
          {
            id: "5",
            category: "insurance",
            amount: "35000",
            note: "生命保険",
            type: "fixed",
          },
          {
            id: "6",
            category: "transportation",
            amount: "15000",
            note: "",
            type: "variable",
          },
          {
            id: "7",
            category: "entertainment",
            amount: "30000",
            note: "",
            type: "variable",
          },
          {
            id: "8",
            category: "other",
            amount: "278000",
            note: "",
            type: "variable",
          },
        ]
      : []
  );

  const [assets, setAssets] = useState(simpleTotals.assets.toString());
  const [liabilities, setLiabilities] = useState(
    simpleTotals.liabilities.toString()
  );
  const [monthNote, setMonthNote] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Calculate totals
  const incomeBreakdownTotal = incomeItems.reduce(
    (sum, item) => sum + (Number.parseFloat(item.amount) || 0),
    0
  );
  const expenseBreakdownTotal = expenseItems.reduce(
    (sum, item) => sum + (Number.parseFloat(item.amount) || 0),
    0
  );
  const expenseFixed = expenseItems
    .filter((item) => item.type === "fixed")
    .reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0);
  const expenseVariable = expenseItems
    .filter((item) => item.type === "variable")
    .reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0);

  const netIncome = incomeBreakdownTotal - expenseBreakdownTotal;

  // Calculate differences
  const incomeDiff = incomeBreakdownTotal - simpleTotals.income;
  const expenseDiff = expenseBreakdownTotal - simpleTotals.expense;

  // Format currency
  const formatYen = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Income item handlers
  const addIncomeItem = () => {
    setIncomeItems([
      ...incomeItems,
      { id: Date.now().toString(), category: "", amount: "", note: "" },
    ]);
  };

  const updateIncomeItem = (
    id: string,
    field: keyof IncomeItem,
    value: string
  ) => {
    setIncomeItems(
      incomeItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const deleteIncomeItem = (id: string) => {
    setIncomeItems(incomeItems.filter((item) => item.id !== id));
  };

  const duplicateIncomeItem = (id: string) => {
    const item = incomeItems.find((i) => i.id === id);
    if (item) {
      setIncomeItems([...incomeItems, { ...item, id: Date.now().toString() }]);
    }
  };

  // Expense item handlers
  const addExpenseItem = () => {
    setExpenseItems([
      ...expenseItems,
      {
        id: Date.now().toString(),
        category: "",
        amount: "",
        note: "",
        type: "variable",
      },
    ]);
  };

  const updateExpenseItem = (
    id: string,
    field: keyof ExpenseItem,
    value: string | "fixed" | "variable"
  ) => {
    setExpenseItems(
      expenseItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const deleteExpenseItem = (id: string) => {
    setExpenseItems(expenseItems.filter((item) => item.id !== id));
  };

  const duplicateExpenseItem = (id: string) => {
    const item = expenseItems.find((i) => i.id === id);
    if (item) {
      setExpenseItems([
        ...expenseItems,
        { ...item, id: Date.now().toString() },
      ]);
    }
  };

  // Template actions
  const applyIncomeTemplate = (type: "main" | "main-side") => {
    if (type === "main") {
      setIncomeItems([
        { id: Date.now().toString(), category: "main", amount: "", note: "" },
      ]);
    } else {
      setIncomeItems([
        { id: Date.now().toString(), category: "main", amount: "", note: "" },
        {
          id: (Date.now() + 1).toString(),
          category: "side",
          amount: "",
          note: "",
        },
      ]);
    }
  };

  const applyExpenseTemplate = () => {
    const template: ExpenseItem[] = [
      { id: "t1", category: "housing", amount: "", note: "", type: "fixed" },
      { id: "t2", category: "utilities", amount: "", note: "", type: "fixed" },
      { id: "t3", category: "food", amount: "", note: "", type: "variable" },
      { id: "t4", category: "daily", amount: "", note: "", type: "variable" },
    ];
    setExpenseItems(
      template.map((item, idx) => ({
        ...item,
        id: (Date.now() + idx).toString(),
      }))
    );
  };

  // Reconciliation actions
  const overrideSimpleWithBreakdown = () => {
    toast.success("かんたん入力の合計を内訳合計で上書きしました");
  };

  const addDiffToOther = () => {
    // Add income diff to "その他" income
    if (incomeDiff !== 0) {
      const otherIncome = incomeItems.find((item) => item.category === "other");
      if (otherIncome) {
        updateIncomeItem(
          otherIncome.id,
          "amount",
          (Number.parseFloat(otherIncome.amount || "0") + incomeDiff).toString()
        );
      } else {
        setIncomeItems([
          ...incomeItems,
          {
            id: Date.now().toString(),
            category: "other",
            amount: incomeDiff.toString(),
            note: "調整",
          },
        ]);
      }
    }

    // Add expense diff to "その他" expense
    if (expenseDiff !== 0) {
      const otherExpense = expenseItems.find(
        (item) => item.category === "other"
      );
      if (otherExpense) {
        updateExpenseItem(
          otherExpense.id,
          "amount",
          (
            Number.parseFloat(otherExpense.amount || "0") + expenseDiff
          ).toString()
        );
      } else {
        setExpenseItems([
          ...expenseItems,
          {
            id: Date.now().toString(),
            category: "other",
            amount: expenseDiff.toString(),
            note: "調整",
            type: "variable",
          },
        ]);
      }
    }

    toast.success("差額を「その他」に追加しました");
  };

  const handleSave = () => {
    toast.success("保存しました");
  };

  const handleSaveAndBack = () => {
    toast.success("保存しました");
    router.push("/plans/plan-1/months/current");
  };

  const handleDelete = () => {
    setDeleteDialogOpen(false);
    toast.success("削除しました");
    router.push("/plans/plan-1/months");
  };

  const isEmpty = incomeItems.length === 0 && expenseItems.length === 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              プラン一覧
            </Link>
            <span>/</span>
            <Link href="/plans/plan-1" className="hover:text-foreground">
              {planName}
            </Link>
            <span>/</span>
            <Link href="/plans/plan-1/months" className="hover:text-foreground">
              月次
            </Link>
            <span>/</span>
            <Link
              href="/plans/plan-1/months/current"
              className="hover:text-foreground"
            >
              {currentMonth}
            </Link>
            <span>/</span>
            <span className="text-foreground">詳細</span>
          </div>

          {/* Title & Actions */}
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
                <Link href="/plans/plan-1/months/current">かんたん入力へ</Link>
              </Button>
              <Button onClick={handleSaveAndBack}>保存して戻る</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    この月を複製
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
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

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Month Navigation */}
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <div className="text-lg font-semibold">{currentMonth}</div>
                  <div className="text-xs text-muted-foreground">
                    最終更新: {lastUpdated}
                  </div>
                </div>
                <Button variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Badge>{IS_EXISTING ? "入力済み" : "未入力"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
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
                    addIncomeItem();
                    addExpenseItem();
                  }}
                >
                  手動で追加
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column (8 cols) */}
          <div className="space-y-6 lg:col-span-8">
            {/* Income Breakdown */}
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
                              updateIncomeItem(item.id, "category", value)
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
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="金額"
                            value={item.amount}
                            onChange={(e) =>
                              updateIncomeItem(
                                item.id,
                                "amount",
                                e.target.value.replace(/[^\d]/g, "")
                              )
                            }
                            className="text-right"
                          />
                          <Input
                            type="text"
                            placeholder="メモ（任意）"
                            value={item.note}
                            onChange={(e) =>
                              updateIncomeItem(item.id, "note", e.target.value)
                            }
                          />
                        </div>
                        <div className="flex gap-1 sm:flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => duplicateIncomeItem(item.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteIncomeItem(item.id)}
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
                  onClick={addIncomeItem}
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

            {/* Expense Breakdown */}
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
                              updateExpenseItem(item.id, "category", value);
                              const cat = EXPENSE_CATEGORIES.find(
                                (c) => c.value === value
                              );
                              if (cat) {
                                updateExpenseItem(
                                  item.id,
                                  "type",
                                  cat.type as "fixed" | "variable"
                                );
                              }
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
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="金額"
                            value={item.amount}
                            onChange={(e) =>
                              updateExpenseItem(
                                item.id,
                                "amount",
                                e.target.value.replace(/[^\d]/g, "")
                              )
                            }
                            className="text-right"
                          />
                          <Input
                            type="text"
                            placeholder="メモ（任意）"
                            value={item.note}
                            onChange={(e) =>
                              updateExpenseItem(item.id, "note", e.target.value)
                            }
                          />
                          <ToggleGroup
                            type="single"
                            value={item.type}
                            onValueChange={(value) => {
                              if (value)
                                updateExpenseItem(
                                  item.id,
                                  "type",
                                  value as "fixed" | "variable"
                                );
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
                            onClick={() => duplicateExpenseItem(item.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteExpenseItem(item.id)}
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
                  onClick={addExpenseItem}
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

          {/* Right Column (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            {/* Summary */}
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
                      value={assets}
                      onChange={(e) =>
                        setAssets(e.target.value.replace(/[^\d]/g, ""))
                      }
                      className="h-8 w-32 text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">負債残高</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={liabilities}
                      onChange={(e) =>
                        setLiabilities(e.target.value.replace(/[^\d]/g, ""))
                      }
                      className="h-8 w-32 text-right"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reconciliation */}
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
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={overrideSimpleWithBreakdown}
                      >
                        内訳合計で合計を上書き
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={addDiffToOther}
                      >
                        差額を「その他」に追加
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
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
      </div>

      {/* Sticky Footer (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg lg:hidden">
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleSave}>
            保存
          </Button>
          <Button className="flex-1" onClick={handleSaveAndBack}>
            保存して戻る
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この月のデータを削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。{currentMonth}
              のすべての入力データが削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
