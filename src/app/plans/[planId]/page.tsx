"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatYearMonth, formatYen, getCurrentYearMonth } from "@/lib/format";
import type {
  HousingAssumptions,
  LifeEvent,
  MonthlyRecord,
  Plan,
  PlanVersion,
} from "@/lib/domain/types";
import { createRepositories } from "@/lib/repo/factory";

type DashboardState =
  | "FIRST_TIME"
  | "NEEDS_HOUSING"
  | "NEEDS_SELECTION"
  | "NEEDS_EVENTS"
  | "READY";

const REQUIRED_HOUSING_TYPES = 4;

type EventTypeKey =
  | "birth"
  | "education"
  | "job_change"
  | "retirement"
  | "care"
  | "housing"
  | "other";

const EVENT_TYPE_LABELS: Record<EventTypeKey, string> = {
  birth: "出産",
  education: "教育",
  job_change: "転職",
  retirement: "退職",
  care: "介護",
  housing: "住宅",
  other: "その他",
};

export default function PlanDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const repos = useMemo(() => createRepositories(), []);
  const currentYm = getCurrentYearMonth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [currentVersion, setCurrentVersion] = useState<PlanVersion | null>(
    null
  );
  const [currentMonthly, setCurrentMonthly] = useState<MonthlyRecord | null>(
    null
  );
  const [housingAssumptions, setHousingAssumptions] = useState<
    HousingAssumptions[]
  >([]);
  const [upcomingEvents, setUpcomingEvents] = useState<LifeEvent[]>([]);
  const [upcomingEventCount, setUpcomingEventCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventVersionMissing, setEventVersionMissing] = useState(false);
  const [dashboardState, setDashboardState] = useState<DashboardState>("READY");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<
    "conservative" | "standard" | "optimistic"
  >("standard");
  const [selectedTab, setSelectedTab] = useState("dashboard");

  const planName = plan?.name ?? "プラン";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyMaybe = (amount?: number) => {
    if (amount === null || amount === undefined) return "-";
    return formatCurrency(amount);
  };

  const getEventTitle = (event: LifeEvent) => {
    const title = event.title?.trim();
    if (title) return title;
    return (
      EVENT_TYPE_LABELS[event.eventType as EventTypeKey] ?? event.eventType
    );
  };

  const getCurrentMonthLabel = () => {
    const formatted = formatYearMonth(currentYm);
    if (formatted && formatted !== "?") return formatted;
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月`;
  };

  const formatDateShort = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("ja-JP");
  };

  const resolveDashboardState = (
    monthly: MonthlyRecord | null | undefined,
    housing: HousingAssumptions[],
    eventsLength: number
  ): DashboardState => {
    if (!monthly) return "FIRST_TIME";
    if (housing.length < REQUIRED_HOUSING_TYPES) return "NEEDS_HOUSING";
    if (!housing.some((item) => item.isSelected)) return "NEEDS_SELECTION";
    if (eventsLength === 0) return "NEEDS_EVENTS";
    return "READY";
  };

  const getScenarioLabel = (s: typeof scenario) => {
    const labels = {
      conservative: "保守的",
      standard: "標準",
      optimistic: "楽観",
    };
    return labels[s];
  };

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    const routes: Record<string, string> = {
      dashboard: `/plans/${planId}`,
      monthly: `/plans/${planId}/months`,
      housing: `/plans/${planId}/housing`,
      events: `/plans/${planId}/events`,
      versions: `/plans/${planId}/versions`,
    };
    const next = routes[value];
    if (next && value !== "dashboard") {
      router.push(next);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setPlan(null);
      setCurrentVersion(null);
      setCurrentMonthly(null);
      setHousingAssumptions([]);
      setUpcomingEvents([]);
      setUpcomingEventCount(0);
      setEventCount(0);
      setEventError(null);
      setEventLoading(true);
      setEventVersionMissing(false);
      setDashboardState("READY");
      try {
        const [planData, versionData] = await Promise.all([
          repos.plan.get(planId),
          repos.version.getCurrent(planId),
        ]);

        if (!planData) {
          if (!active) return;
          setLoadError("プランが見つかりません");
          return;
        }

        if (!active) return;
        setPlan(planData);

        if (!versionData) {
          setCurrentVersion(null);
          setEventVersionMissing(true);
          setEventLoading(false);
          const monthly = await repos.monthly.getByYm(planId, currentYm);
          if (!active) return;
          setCurrentMonthly(monthly ?? null);
          setHousingAssumptions([]);
          setDashboardState(resolveDashboardState(monthly, [], 0));
          return;
        }

        setCurrentVersion(versionData);

        const [monthly, housing] = await Promise.all([
          repos.monthly.getByYm(planId, currentYm),
          repos.housing.listByVersion(versionData.id),
        ]);

        let events: LifeEvent[] = [];
        try {
          events = await repos.event.listByVersion(versionData.id, {
            scope: "all",
          });
          setEventError(null);
        } catch (error) {
          console.error(error);
          if (!active) return;
          setEventError("イベントの取得に失敗しました");
        } finally {
          if (!active) return;
          setEventLoading(false);
        }

        if (!active) return;
        setCurrentMonthly(monthly ?? null);
        setHousingAssumptions(housing);
        const upcoming = events
          .filter((event) => event.startYm >= currentYm)
          .sort((a, b) => a.startYm.localeCompare(b.startYm));
        setUpcomingEventCount(upcoming.length);
        setUpcomingEvents(upcoming.slice(0, 3));
        setEventCount(events.length);
        setDashboardState(
          resolveDashboardState(monthly, housing, events.length)
        );
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadError("読み込みに失敗しました");
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [currentYm, planId, repos]);

  const hasMonthlyRecord = Boolean(currentMonthly);
  const isMonthlyComplete = currentMonthly?.isFinalized ?? false;
  const hasHousingAssumptions =
    housingAssumptions.length >= REQUIRED_HOUSING_TYPES;
  const hasSelectedHousing = housingAssumptions.some((item) => item.isSelected);
  const hasEvents = eventCount > 0;
  const showForecast = dashboardState === "READY";
  const showHousingSummary = hasHousingAssumptions && hasSelectedHousing;
  const currentMonthLabel = getCurrentMonthLabel();
  const lastUpdated = currentMonthly?.updatedAt
    ? formatDateShort(currentMonthly.updatedAt)
    : undefined;
  const incomeTotal = currentMonthly?.incomeTotalYen;
  const expenseTotal = currentMonthly?.expenseTotalYen;
  const balanceValue =
    incomeTotal !== undefined && expenseTotal !== undefined
      ? incomeTotal - expenseTotal
      : undefined;
  const assetsBalance = currentMonthly?.assetsBalanceYen;
  const liabilitiesBalance = currentMonthly?.liabilitiesBalanceYen;
  const versionLabel = currentVersion ? `v${currentVersion.versionNo}` : "-";
  const versionDate = currentVersion?.createdAt
    ? formatDateShort(currentVersion.createdAt)
    : undefined;
  const versionNote = currentVersion?.changeNote;
  const nextActions = [
    {
      key: "monthly",
      label: "今月の家計を入力",
      done: isMonthlyComplete,
      href: `/plans/${planId}/months/current`,
    },
    {
      key: "housing-assumptions",
      label: "住宅前提を設定",
      done: hasHousingAssumptions,
      href: `/plans/${planId}/housing/assumptions`,
    },
    {
      key: "housing-selection",
      label: "住宅タイプを選択",
      done: hasSelectedHousing,
      href: `/plans/${planId}/housing`,
      visible: hasHousingAssumptions,
    },
    {
      key: "events",
      label: "イベントを追加",
      done: hasEvents,
      href: `/plans/${planId}/events/new`,
    },
  ].filter((item) => item.visible !== false);
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
            <Tabs value={selectedTab} onValueChange={handleTabChange}>
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
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {loadError ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>読み込みに失敗しました</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
            <Button asChild variant="outline">
              <Link href="/">プラン一覧へ戻る</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            読み込み中...
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Primary Cards (8 cols on desktop) */}
            <div className="space-y-6 lg:col-span-8">
              {dashboardState === "FIRST_TIME" && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      まずは今月の合計を入力しましょう
                    </CardTitle>
                    <CardDescription>
                      正確でなくてOK。あとから修正できます。
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/plans/${planId}/months/current`}>
                        今月を入力
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/plans/${planId}/months`}>
                        月次一覧を見る
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )}
              {dashboardState === "NEEDS_HOUSING" && (
                <Card className="shadow-sm border-amber-200 bg-amber-50/40">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      住宅LCC比較を使うには前提の設定が必要です
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/plans/${planId}/housing/assumptions`}>
                        住宅前提を設定
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/plans/${planId}/housing`}>
                        比較トップへ
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )}
              {dashboardState === "NEEDS_SELECTION" && (
                <Card className="shadow-sm border-amber-200 bg-amber-50/40">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      比較する住宅タイプを選択しましょう
                    </CardTitle>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild>
                      <Link href={`/plans/${planId}/housing`}>
                        住宅LCC比較へ
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )}
              {dashboardState === "NEEDS_EVENTS" && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      イベントを追加すると見通しが良くなります
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/plans/${planId}/events/new`}>
                        イベントを追加
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/plans/${planId}/events`}>イベント一覧</Link>
                    </Button>
                  </CardFooter>
                </Card>
              )}
              {/* 1) HERO STATUS CARD: Current Month */}
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">
                        今月（{currentMonthLabel}）の状況
                      </CardTitle>
                      <CardDescription className="mt-1">
                        最終更新:{" "}
                        {hasMonthlyRecord && lastUpdated
                          ? lastUpdated
                          : "未入力"}
                      </CardDescription>
                    </div>
                    {hasMonthlyRecord ? (
                      <Badge
                        variant="default"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        入力済み
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        未入力
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {hasMonthlyRecord ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border bg-muted/50 p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          今月の収支
                        </p>
                        <p
                          className={`mt-2 text-3xl font-bold ${
                            balanceValue === undefined
                              ? "text-muted-foreground"
                              : balanceValue >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {balanceValue !== undefined
                            ? `${balanceValue >= 0 ? "+" : ""}${formatCurrency(
                                balanceValue
                              )}`
                            : "-"}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/50 p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          収入合計
                        </p>
                        <p className="mt-2 text-3xl font-bold text-foreground">
                          {formatCurrencyMaybe(incomeTotal)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/50 p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          支出合計
                        </p>
                        <p className="mt-2 text-3xl font-bold text-foreground">
                          {formatCurrencyMaybe(expenseTotal)}
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
                      {hasMonthlyRecord ? "今月を編集" : "今月を入力"}
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
                    概算でOK。あとから修正できます。
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
                        {formatCurrencyMaybe(assetsBalance)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 p-6">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-sm font-medium">負債残高</p>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-red-900 dark:text-red-300">
                        {formatCurrencyMaybe(liabilitiesBalance)}
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
                  {showForecast ? (
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
                      <CardTitle>住宅・生涯コスト（LCC）</CardTitle>
                      <CardDescription className="mt-1">
                        35年間の累計試算
                      </CardDescription>
                    </div>
                    {showHousingSummary && (
                      <Badge variant="secondary">住宅 選択済み</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showHousingSummary ? (
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
                      {showHousingSummary
                        ? "比較を見る"
                        : hasHousingAssumptions
                        ? "住宅タイプを選択"
                        : "住宅タイプを設定"}
                    </Link>
                  </Button>
                  {showHousingSummary && (
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
                    {nextActions.map((item) => (
                      <div
                        key={item.key}
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
                            item.done
                              ? "text-muted-foreground line-through"
                              : ""
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
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      今後のライフイベント
                    </CardTitle>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2"
                    >
                      <Link href={`/plans/${planId}/events`}>イベント一覧</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {eventVersionMissing ? (
                    <div className="rounded-lg border-2 border-dashed bg-muted/30 p-6 text-center">
                      <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        現行バージョンがありません
                      </p>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="mt-4"
                      >
                        <Link href={`/plans/${planId}/versions/new`}>
                          改定を作成
                        </Link>
                      </Button>
                    </div>
                  ) : eventLoading ? (
                    <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      読み込み中...
                    </div>
                  ) : eventError ? (
                    <Alert variant="destructive">
                      <AlertTitle>読み込みに失敗しました</AlertTitle>
                      <AlertDescription>{eventError}</AlertDescription>
                    </Alert>
                  ) : upcomingEvents.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingEvents.map((event) => {
                        const eventTypeLabel =
                          EVENT_TYPE_LABELS[event.eventType as EventTypeKey] ??
                          event.eventType;
                        const amountText = formatYen(event.amountYen, {
                          showDashForEmpty: false,
                          sign: "never",
                        });
                        return (
                          <Link
                            key={event.id}
                            href={`/plans/${planId}/events/${event.id}/edit`}
                            className="block rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                            aria-label={getEventTitle(event)}
                          >
                            <div className="flex items-start gap-3">
                              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium leading-tight">
                                    {getEventTitle(event)}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {event.cadence === "monthly"
                                      ? "毎月"
                                      : "単発"}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatYearMonth(event.startYm)}</span>
                                  <Badge
                                    variant="secondary"
                                    className={
                                      event.direction === "income"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-rose-100 text-rose-800"
                                    }
                                  >
                                    {event.direction === "income"
                                      ? "収入"
                                      : "支出"}
                                  </Badge>
                                  <Badge variant="outline">
                                    {eventTypeLabel}
                                  </Badge>
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                  {amountText}
                                  {event.cadence === "monthly" && " /月"}
                                  {event.cadence === "monthly" &&
                                    event.durationMonths && (
                                      <>（{event.durationMonths}ヶ月）</>
                                    )}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
                      <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        {eventCount > 0
                          ? "今後のイベントがありません"
                          : "イベントがまだありません"}
                      </p>
                      <Button asChild size="sm" className="mt-4">
                        <Link href={`/plans/${planId}/events/new`}>
                          イベントを追加
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
                {!eventVersionMissing && (
                  <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent sm:w-auto"
                    >
                      <Link href={`/plans/${planId}/events/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        イベントを追加
                      </Link>
                    </Button>
                    {upcomingEventCount > 3 && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Link href={`/plans/${planId}/events`}>もっと見る</Link>
                      </Button>
                    )}
                  </CardFooter>
                )}
              </Card>

              {/* 6) VERSIONING / REVIEW CARD */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">見直し（改定）</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentVersion ? (
                    <>
                      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            現行バージョン
                          </span>
                          <Badge variant="secondary">{versionLabel}</Badge>
                        </div>
                        {versionDate && (
                          <p className="text-xs text-muted-foreground">
                            改定日 {versionDate}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg border-l-4 border-primary bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          最終変更
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {versionNote ?? "変更履歴がまだありません"}
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
        )}
      </main>
    </div>
  );
}
