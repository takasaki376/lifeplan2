"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Home,
  Calendar,
  LineChart,
  PiggyBank,
  History,
  Plus,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Settings,
  TrendingUp,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data toggle
const MOCK_HAS_DATA = true;

interface MonthlyStatus {
  year: number;
  month: number;
  isComplete: boolean;
  income: number;
  expense: number;
  balance: number;
  lastUpdated: string;
}

interface AssetSnapshot {
  assets: number;
  liabilities: number;
}

interface LifeEvent {
  id: string;
  date: string;
  title: string;
  amount: number;
  type: "recurring" | "one-time";
}

interface Version {
  version: string;
  date: string;
  note: string;
}

const mockMonthlyStatus: MonthlyStatus = {
  year: 2026,
  month: 1,
  isComplete: false,
  income: 620000,
  expense: 588000,
  balance: 32000,
  lastUpdated: "2026/01/02",
};

const mockAssetSnapshot: AssetSnapshot = {
  assets: 8450000,
  liabilities: 28900000,
};

const mockLifeEvents: LifeEvent[] = [
  {
    id: "1",
    date: "2026/04",
    title: "保育料（毎月）",
    amount: 40000,
    type: "recurring",
  },
  {
    id: "2",
    date: "2027/03",
    title: "入学準備（単発）",
    amount: 200000,
    type: "one-time",
  },
];

const mockVersion: Version = {
  version: "v3",
  date: "2025/12/15",
  note: "金利を 0.8% → 1.2% に変更",
};

export default function PlanDashboardPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [hasData] = useState(MOCK_HAS_DATA);
  const [scenario, setScenario] = useState<
    "conservative" | "standard" | "optimistic"
  >("standard");
  const [selectedTab, setSelectedTab] = useState("dashboard");

  const planName = "山田家 2026";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCurrentMonth = () => {
    return `${mockMonthlyStatus.year}年${mockMonthlyStatus.month}月`;
  };

  const getScenarioLabel = (s: typeof scenario) => {
    const labels = {
      conservative: "保守",
      standard: "標準",
      optimistic: "楽観",
    };
    return labels[s];
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          {/* Breadcrumb & Plan Name */}
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              プラン一覧
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{planName}</span>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Scenario Selector */}
            <Tabs
              value={scenario}
              onValueChange={(v) => setScenario(v as typeof scenario)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="conservative">保守</TabsTrigger>
                <TabsTrigger value="standard">標準</TabsTrigger>
                <TabsTrigger value="optimistic">楽観</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Actions */}
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              前提を編集
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Desktop Tabs */}
          <div className="hidden sm:block">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
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
                    <Home className="h-4 w-4" />
                    ダッシュボード
                  </span>
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem>
                  <Home className="mr-2 h-4 w-4" />
                  ダッシュボード
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="mr-2 h-4 w-4" />
                  月次
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Home className="mr-2 h-4 w-4" />
                  住宅LCC
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="mr-2 h-4 w-4" />
                  イベント
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <History className="mr-2 h-4 w-4" />
                  見直し（改定）
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Primary Cards (8 cols on desktop) */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1) HERO STATUS CARD: Current Month */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      今月（{getCurrentMonth()}）の状況
                    </CardTitle>
                    <CardDescription className="mt-1">
                      最終更新:{" "}
                      {hasData ? mockMonthlyStatus.lastUpdated : "未入力"}
                    </CardDescription>
                  </div>
                  {hasData ? (
                    <Badge
                      variant={
                        mockMonthlyStatus.isComplete ? "default" : "destructive"
                      }
                      className={
                        mockMonthlyStatus.isComplete
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                    >
                      {mockMonthlyStatus.isComplete ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          入力済み
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          今月未入力
                        </>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      今月未入力
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {hasData ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        今月の収支
                      </p>
                      <p
                        className={`mt-2 text-3xl font-bold ${
                          mockMonthlyStatus.balance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {mockMonthlyStatus.balance >= 0 ? "+" : ""}
                        {formatCurrency(mockMonthlyStatus.balance)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground">収入合計</p>
                      <p className="mt-2 text-3xl font-bold text-foreground">
                        {formatCurrency(mockMonthlyStatus.income)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground">支出合計</p>
                      <p className="mt-2 text-3xl font-bold text-foreground">
                        {formatCurrency(mockMonthlyStatus.expense)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
                    <p className="text-muted-foreground">
                      今月のデータがまだありません
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      入力すると収支が見えるようになります
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button asChild className="flex-1 sm:flex-none">
                  <Link href={`/plans/${planId}/months/current`}>
                    {hasData && mockMonthlyStatus.isComplete
                      ? "今月の内訳を見る"
                      : "今月を入力する"}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/plans/${planId}/months`}>月次一覧へ</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* 2) SNAPSHOT CARD: Assets & Liabilities */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>資産・負債スナップショット</CardTitle>
                <CardDescription>
                  概算でOK。あとから修正できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 p-6">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <PiggyBank className="h-5 w-5" />
                      <p className="text-sm font-medium">資産残高</p>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-green-900 dark:text-green-300">
                      {hasData
                        ? formatCurrency(mockAssetSnapshot.assets)
                        : formatCurrency(0)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 p-6">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                      <p className="text-sm font-medium">負債残高</p>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-red-900 dark:text-red-300">
                      {hasData
                        ? formatCurrency(mockAssetSnapshot.liabilities)
                        : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  残高を更新
                </Button>
              </CardFooter>
            </Card>

            {/* 3) OUTLOOK CARD: Future Forecast */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>将来見通し（簡易）</CardTitle>
                <CardDescription>
                  シナリオ: {getScenarioLabel(scenario)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasData ? (
                  <>
                    {/* Simple Mock Chart */}
                    <div className="rounded-lg border bg-muted/30 p-6">
                      <Tabs defaultValue="assets" className="w-full">
                        <TabsList className="mb-4 w-full sm:w-auto">
                          <TabsTrigger value="assets">資産推移</TabsTrigger>
                          <TabsTrigger value="income">年間収支</TabsTrigger>
                        </TabsList>

                        {/* Simple Bar Chart Visualization */}
                        <div className="flex h-48 items-end justify-between gap-2">
                          {[65, 72, 78, 85, 90, 95, 100, 103, 108, 112].map(
                            (height, i) => (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center gap-1"
                              >
                                <div
                                  className="w-full rounded-t bg-primary transition-all hover:bg-primary/80"
                                  style={{ height: `${height}%` }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {i + 1}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          年数
                        </p>
                      </Tabs>
                    </div>

                    <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          10年後の資産見込み（概算）
                        </span>
                        <span className="text-lg font-semibold text-foreground">
                          {formatCurrency(12300000)}
                        </span>
                      </div>
                      <Separator />
                      <p className="text-sm text-muted-foreground">
                        <TrendingUp className="mr-1 inline h-4 w-4" />
                        前提を変更して比較できます
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border-2 border-dashed bg-muted/30 p-12 text-center">
                    <LineChart className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                      データが増えると見通しが表示されます
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent"
                >
                  <Link href={`/plans/${planId}/forecast`}>詳しく見る</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* 4) HOUSING LCC SUMMARY CARD */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>住宅の生涯コスト（LCC）</CardTitle>
                    <CardDescription className="mt-1">
                      35年間の累計試算
                    </CardDescription>
                  </div>
                  {hasData && (
                    <Badge variant="secondary">住宅: 高性能住宅</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasData ? (
                  <>
                    <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 p-6 text-center">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        35年累計LCC（概算）
                      </p>
                      <p className="mt-2 text-4xl font-bold text-blue-900 dark:text-blue-300">
                        {formatCurrency(98000000)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">
                        主な内訳
                      </h4>
                      <div className="space-y-2">
                        {[
                          { label: "ローン返済", amount: 65000000 },
                          { label: "修繕費", amount: 18000000 },
                          { label: "光熱費", amount: 15000000 },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                          >
                            <span className="text-sm text-muted-foreground">
                              {item.label}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
                    <Home className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-muted-foreground">
                      住宅タイプを設定すると比較できます
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  asChild
                  variant="default"
                  className="flex-1 sm:flex-none"
                >
                  <Link href={`/plans/${planId}/housing`}>
                    {hasData ? "比較を見る" : "住宅タイプを設定"}
                  </Link>
                </Button>
                {hasData && (
                  <Button asChild variant="outline">
                    <Link href={`/plans/${planId}/housing/assumptions`}>
                      前提を調整
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Right Column: Action Cards & Reminders (4 cols on desktop) */}
          <div className="space-y-6 lg:col-span-4">
            {/* 7) REMINDERS / NEXT ACTIONS */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">次にやること</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      label: "今月の家計を入力",
                      done: hasData && mockMonthlyStatus.isComplete,
                      href: `/plans/${planId}/months/current`,
                    },
                    {
                      label: "住宅LCCの前提を確認",
                      done: hasData,
                      href: `/plans/${planId}/housing`,
                    },
                    {
                      label: "ライフイベントを追加",
                      done: hasData && mockLifeEvents.length > 0,
                      href: `/plans/${planId}/events/new`,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          item.done
                            ? "border-green-500 bg-green-500"
                            : "border-muted-foreground"
                        }`}
                      >
                        {item.done && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span
                        className={`flex-1 text-sm ${
                          item.done ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                      {!item.done && (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={item.href}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 5) LIFE EVENTS CARD */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">直近のライフイベント</CardTitle>
              </CardHeader>
              <CardContent>
                {hasData && mockLifeEvents.length > 0 ? (
                  <div className="space-y-3">
                    {mockLifeEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
                      >
                        <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-tight">
                              {event.title}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {event.type === "recurring" ? "毎月" : "単発"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {event.date}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(event.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
                    <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      イベントがまだありません
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                >
                  <Link href={`/plans/${planId}/events/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    イベントを追加
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* 6) VERSIONING / REVIEW CARD */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">見直し（改定）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasData ? (
                  <>
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          現行バージョン
                        </span>
                        <Badge variant="secondary">{mockVersion.version}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        改定 {mockVersion.date}
                      </p>
                    </div>
                    <div className="rounded-lg border-l-4 border-primary bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        最終変更
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {mockVersion.note}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border-2 border-dashed bg-muted/30 p-6 text-center">
                    <History className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      履歴はまだありません
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                >
                  <Link href={`/plans/${planId}/versions`}>
                    <History className="mr-2 h-4 w-4" />
                    改定履歴
                  </Link>
                </Button>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/plans/${planId}/versions/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    新しい改定を作成
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
