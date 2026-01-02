"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

// Toggle to test empty vs editing state
const IS_EXISTING = false;

interface MonthlyData {
  income: number;
  expense: number;
  assets: number;
  liabilities: number;
  lastUpdated?: string;
}

const mockExistingData: MonthlyData = {
  income: 620000,
  expense: 588000,
  assets: 8450000,
  liabilities: 28900000,
  lastUpdated: "2026/01/02",
};

const mockPreviousMonthData: MonthlyData = {
  income: 615000,
  expense: 582000,
  assets: 8300000,
  liabilities: 29100000,
};

export default function MonthlyInputSimplePage() {
  const params = useParams();
  const planId = params.planId as string;
  const planName = "山田家 2026";

  const [currentMonth, setCurrentMonth] = useState({ year: 2026, month: 1 });
  const [scenario, setScenario] = useState<
    "conservative" | "standard" | "optimistic"
  >("standard");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Form state
  const [income, setIncome] = useState(
    IS_EXISTING ? mockExistingData.income : 0
  );
  const [expense, setExpense] = useState(
    IS_EXISTING ? mockExistingData.expense : 0
  );
  const [assets, setAssets] = useState(
    IS_EXISTING ? mockExistingData.assets : 0
  );
  const [liabilities, setLiabilities] = useState(
    IS_EXISTING ? mockExistingData.liabilities : 0
  );

  // Error state
  const [errors, setErrors] = useState({
    income: "",
    expense: "",
    assets: "",
    liabilities: "",
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP").format(amount);
  };

  const parseCurrency = (value: string): number => {
    return Number.parseInt(value.replace(/,/g, "") || "0");
  };

  const validateField = (name: string, value: number) => {
    if (value < 0) {
      return "マイナスの値は入力できません";
    }
    return "";
  };

  const handleInputChange = (
    field: "income" | "expense" | "assets" | "liabilities",
    value: string
  ) => {
    const numValue = parseCurrency(value);
    const error = validateField(field, numValue);

    setErrors((prev) => ({ ...prev, [field]: error }));

    switch (field) {
      case "income":
        setIncome(numValue);
        break;
      case "expense":
        setExpense(numValue);
        break;
      case "assets":
        setAssets(numValue);
        break;
      case "liabilities":
        setLiabilities(numValue);
        break;
    }
  };

  const handleCopyPreviousMonth = (
    field: "income" | "expense" | "assets" | "liabilities"
  ) => {
    const value = mockPreviousMonthData[field];
    handleInputChange(field, value.toString());
  };

  const computeBalance = () => {
    return income - expense;
  };

  const handleSave = async (finalize = true) => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);

    if (finalize) {
      // Navigate back to dashboard
      window.location.href = `/plans/${planId}`;
    }
  };

  const getMonthLabel = () => {
    return `${currentMonth.year}年${currentMonth.month}月`;
  };

  const getScenarioLabel = (s: typeof scenario) => {
    const labels = {
      conservative: "保守",
      standard: "標準",
      optimistic: "楽観",
    };
    return labels[s];
  };

  const handlePreviousMonth = () => {
    if (currentMonth.month === 1) {
      setCurrentMonth({ year: currentMonth.year - 1, month: 12 });
    } else {
      setCurrentMonth({ ...currentMonth, month: currentMonth.month - 1 });
    }
  };

  const handleNextMonth = () => {
    if (currentMonth.month === 12) {
      setCurrentMonth({ year: currentMonth.year + 1, month: 1 });
    } else {
      setCurrentMonth({ ...currentMonth, month: currentMonth.month + 1 });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-primary px-6 py-3 text-primary-foreground shadow-lg animate-in fade-in slide-in-from-top-2">
          保存しました
        </div>
      )}

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
              {planName}
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

              <Button onClick={() => handleSave(true)} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                保存して戻る
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
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
                          onClick={() =>
                            setCurrentMonth({ ...currentMonth, month: m })
                          }
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
                    variant={IS_EXISTING ? "default" : "destructive"}
                    className={
                      IS_EXISTING
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : ""
                    }
                  >
                    {IS_EXISTING ? "入力済み" : "未入力"}
                  </Badge>
                  {IS_EXISTING && mockExistingData.lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      最終更新: {mockExistingData.lastUpdated}
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
                      value={income === 0 ? "" : formatCurrency(income)}
                      onChange={(e) =>
                        handleInputChange("income", e.target.value)
                      }
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
                  onClick={() => handleCopyPreviousMonth("income")}
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
                      value={expense === 0 ? "" : formatCurrency(expense)}
                      onChange={(e) =>
                        handleInputChange("expense", e.target.value)
                      }
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
                  onClick={() => handleCopyPreviousMonth("expense")}
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
                      value={assets === 0 ? "" : formatCurrency(assets)}
                      onChange={(e) =>
                        handleInputChange("assets", e.target.value)
                      }
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
                  onClick={() => handleCopyPreviousMonth("assets")}
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
                        liabilities === 0 ? "" : formatCurrency(liabilities)
                      }
                      onChange={(e) =>
                        handleInputChange("liabilities", e.target.value)
                      }
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
                  onClick={() => handleCopyPreviousMonth("liabilities")}
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
                <Link href={`/plans/${planId}/months/current/detail`}>
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
      </main>

      {/* FOOTER ACTIONS (Sticky on Mobile) */}
      <footer className="sticky bottom-0 border-t bg-card p-4 shadow-lg sm:relative sm:shadow-none">
        <div className="container mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="flex-1 sm:flex-none"
          >
            下書き保存
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving}
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
