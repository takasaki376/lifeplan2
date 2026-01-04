"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Home,
  History,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { LifeEvent, Plan } from "@/lib/domain/types";
import type { EventTypeKey } from "@/lib/domain/eventTypes";
import { formatYearMonth, formatYen, getCurrentYearMonth } from "@/lib/format";
import { createRepositories } from "@/lib/repo/factory";
import { RepoNotFoundError } from "@/lib/repo/types";
import { EVENT_TYPE_LABELS } from "@/lib/domain/eventTypes";

const EVENT_TYPE_OPTIONS: EventTypeKey[] = [
  "birth",
  "education",
  "job_change",
  "retirement",
  "care",
  "housing",
  "other",
];

const CADENCE_LABELS: Record<LifeEvent["cadence"], string> = {
  once: "単発",
  monthly: "毎月",
};

type TimeFilter = "upcoming" | "past" | "all";
type TypeFilter = EventTypeKey | "all";
type CadenceFilter = LifeEvent["cadence"] | "all";

export default function EventsPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const repos = useMemo(() => createRepositories(), []);
  const currentYm = getCurrentYearMonth();
  const tabValue = "events";

  const [plan, setPlan] = useState<Plan | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [cadenceFilter, setCadenceFilter] = useState<CadenceFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVersionMissing, setCurrentVersionMissing] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LifeEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

        const currentVersion = await repos.version.getCurrent(planId);
        if (!currentVersion) {
          setCurrentVersionMissing(true);
          setEvents([]);
          return;
        }
        setCurrentVersionMissing(false);
        const list = await repos.event.listByVersion(currentVersion.id, {
          scope: "all",
        });
        setEvents(list);
      } catch (loadError) {
        console.error(loadError);
        setError("イベントの取得に失敗しました");
        toast.error("イベントの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [planId, repos]);

  // Filter events
  const filteredEvents = events
    .filter((event) => {
      // Time filter
      if (timeFilter === "upcoming" && event.startYm < currentYm) return false;
      if (timeFilter === "past" && event.startYm >= currentYm) return false;

      // Type filter
      if (typeFilter !== "all" && event.eventType !== typeFilter) return false;

      // Cadence filter
      if (cadenceFilter !== "all" && event.cadence !== cadenceFilter)
        return false;

      // Search query
      if (searchQuery) {
        const title = event.title ?? "";
        if (!title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => a.startYm.localeCompare(b.startYm));

  // Group events by year and month
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const [year, month] = event.startYm.split("-");
    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];
    acc[year][month].push(event);
    return acc;
  }, {} as Record<string, Record<string, LifeEvent[]>>);

  // Sort years and months
  const sortedYears = Object.keys(groupedEvents).sort();
  const sortedGroupedEvents = sortedYears.map((year) => ({
    year,
    months: Object.keys(groupedEvents[year])
      .sort()
      .map((month) => ({
        month,
        events: groupedEvents[year][month],
      })),
  }));

  // Calculate counts
  const upcomingCount = events.filter((e) => e.startYm >= currentYm).length;
  const pastCount = events.filter((e) => e.startYm < currentYm).length;

  // Calculate next 12 months impact
  const next12MonthsImpact = events
    .filter((e) => {
      const eventDate = new Date(e.startYm + "-01");
      const currentDate = new Date(currentYm + "-01");
      const twelveMonthsLater = new Date(currentDate);
      twelveMonthsLater.setMonth(currentDate.getMonth() + 12);
      return eventDate > currentDate && eventDate <= twelveMonthsLater;
    })
    .reduce((sum, e) => {
      if (e.direction === "expense") {
        if (e.cadence === "monthly" && e.durationMonths) {
          return sum + e.amountYen * Math.min(e.durationMonths, 12);
        }
        return sum + e.amountYen;
      }
      return sum;
    }, 0);

  // Next event
  const nextEvent = events
    .filter((e) => e.startYm >= currentYm)
    .sort((a, b) => a.startYm.localeCompare(b.startYm))[0];

  const handleResetFilters = () => {
    setTimeFilter("upcoming");
    setTypeFilter("all");
    setCadenceFilter("all");
    setSearchQuery("");
  };

  const formatEventMonth = (ym: string) => {
    const formatted = formatYearMonth(ym, { showDashForEmpty: false });
    return formatted || ym;
  };

  const formatAmount = (amount: number) =>
    formatYen(amount, { showDashForEmpty: false, sign: "never" });

  const getEventTitle = (event: LifeEvent) => {
    if (event.title && event.title.trim().length > 0) {
      return event.title;
    }
    return EVENT_TYPE_LABELS[event.eventType as EventTypeKey] ?? event.eventType;
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

  const handleDuplicate = async (eventId: string) => {
    if (duplicatingId) return;
    setDuplicatingId(eventId);
    try {
      const duplicated = await repos.event.duplicate(eventId);
      toast.success("イベントを複製しました");
      router.push(`/plans/${planId}/events/${duplicated.id}/edit`);
    } catch (duplicateError) {
      console.error(duplicateError);
      if (duplicateError instanceof RepoNotFoundError) {
        toast.error("イベントが見つかりません");
      } else {
        toast.error("複製に失敗しました");
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || deletingId) return;
    setDeletingId(confirmDelete.id);
    try {
      await repos.event.delete(confirmDelete.id);
      setEvents((prev) => prev.filter((event) => event.id !== confirmDelete.id));
      toast.success("削除しました");
      setConfirmDelete(null);
    } catch (deleteError) {
      console.error(deleteError);
      if (deleteError instanceof RepoNotFoundError) {
        setEvents((prev) =>
          prev.filter((event) => event.id !== confirmDelete.id),
        );
        toast.error("イベントが見つかりません");
        setConfirmDelete(null);
      } else {
        toast.error("削除に失敗しました");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              プラン一覧
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/plans/${planId}`} className="hover:text-foreground">
              {plan?.name ?? "プラン"}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">イベント</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                ライフイベント
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                出産・教育・転職・退職など、将来の支出/収入の変化を登録します。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/plans/${planId}/events/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  イベントを追加
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/plans/${planId}`}>
                  <Home className="mr-2 h-4 w-4" />
                  ダッシュボードへ
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

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
                    イベント
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
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>読み込みに失敗しました</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            読み込み中...
          </Card>
        ) : currentVersionMissing ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                現行バージョンがありません
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                まずは改定を作成して、イベントを登録できる状態にしてください。
              </p>
              <Button asChild>
                <Link href={`/plans/${planId}/versions/new`}>
                  改定を作成
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left: Main content */}
          <div className="space-y-6">
            {/* Filter Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Time Tabs */}
                    <Tabs
                      value={timeFilter}
                      onValueChange={(v) => setTimeFilter(v as TimeFilter)}
                    >
                      <TabsList>
                        <TabsTrigger value="upcoming">今後</TabsTrigger>
                        <TabsTrigger value="past">過去</TabsTrigger>
                        <TabsTrigger value="all">すべて</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {/* Type Filter */}
                    <Select
                      value={typeFilter}
                      onValueChange={(value) =>
                        setTypeFilter(value as TypeFilter)
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="種別" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        {EVENT_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {EVENT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Cadence Filter */}
                    <Select
                      value={cadenceFilter}
                      onValueChange={(value) =>
                        setCadenceFilter(value as CadenceFilter)
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="形態" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="once">単発</SelectItem>
                        <SelectItem value="monthly">毎月</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="イベント名で検索"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      今後: {upcomingCount}件 / 過去: {pastCount}件
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event List */}
            {events.length === 0 ? (
              // Empty state: no events at all
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    イベントがまだありません
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    将来の大きな支出や収入の変化を登録すると、見通しが良くなります。
                  </p>
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link href={`/plans/${planId}/events/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        イベントを追加
                      </Link>
                    </Button></div>
                </CardContent>
              </Card>
            ) : filteredEvents.length === 0 ? (
              // Empty state: filtered result empty
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    条件に合うイベントがありません
                  </h3>
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="mt-4 bg-transparent"
                  >
                    フィルタをリセット
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // Event list grouped by year and month
              <div className="space-y-6">
                {sortedGroupedEvents.map(({ year, months }) => (
                  <div key={year} className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground">
                      {year}年
                    </h2>
                    {months.map(({ month, events: monthEvents }) => (
                      <div key={month} className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground ml-2">
                          {Number.parseInt(month)}月
                        </h3>
                        <div className="space-y-2">
                          {monthEvents.map((event) => {
                            const isPast = event.startYm < currentYm;
                            const isCurrent = event.startYm === currentYm;
                            const displayTitle = getEventTitle(event);
                            return (
                              <Card
                                key={event.id}
                                className={`transition-colors hover:bg-accent/50 ${
                                  isCurrent ? "border-l-4 border-l-primary" : ""
                                } ${isPast ? "opacity-70" : ""}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    {/* Left: Date badge */}
                                    <div className="flex items-start gap-4 flex-1">
                                      <Badge
                                        variant="outline"
                                        className="shrink-0"
                                      >
                                        {formatEventMonth(event.startYm)}
                                      </Badge>

                                      {/* Middle: Title and details */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="font-semibold text-foreground">
                                            {displayTitle}
                                          </h4>
                                          {isPast && (
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                             完了
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-1">
                                          <Badge
                                            variant={
                                              event.direction === "income"
                                                ? "default"
                                                : "secondary"
                                            }
                                            className={
                                              event.direction === "income"
                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                                : ""
                                            }
                                          >
                                            {event.direction === "income"
                                              ? "収入"
                                              : "支出"}
                                          </Badge>
                                          <Badge variant="outline">
                                            {EVENT_TYPE_LABELS[
                                              event.eventType as EventTypeKey
                                            ] ?? event.eventType}
                                          </Badge>
                                          <Badge variant="outline">
                                            {CADENCE_LABELS[event.cadence]}
                                          </Badge>
                                          {event.cadence === "monthly" &&
                                            event.durationMonths && (
                                              <Badge variant="outline">
                                                {event.durationMonths}ヶ月
                                              </Badge>
                                            )}
                                        </div>
                                        {event.note && (
                                          <p className="text-sm text-muted-foreground">
                                            {event.note}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right: Amount and actions */}
                                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                                      <div className="text-right">
                                        <div className="flex items-center gap-1">
                                          {event.direction === "income" ? (
                                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                                          )}
                                          <span
                                            className={`text-lg font-bold ${
                                              event.direction === "income"
                                                ? "text-green-600"
                                                : "text-foreground"
                                            }`}
                                          >
                                            {formatAmount(event.amountYen)}
                                          </span>
                                        </div>
                                        {event.cadence === "monthly" && (
                                          <span className="text-xs text-muted-foreground">
                                            /月
                                          </span>
                                        )}
                                      </div>

                                      {/* Actions */}
                                      <div className="flex gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          asChild
                                          className="hidden sm:flex bg-transparent"
                                        >
                                          <Link
                                            href={`/plans/${planId}/events/${event.id}/edit`}
                                          >
                                            編集
                                          </Link>
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                              <MoreVertical className="h-4 w-4" />
                                              <span className="sr-only">
                                                メニュー
                                              </span>
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              asChild
                                              className="sm:hidden"
                                            >
                                              <Link
                                                href={`/plans/${planId}/events/${event.id}/edit`}
                                              >
                                                編集
                                              </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onSelect={() =>
                                                void handleDuplicate(event.id)
                                              }
                                              disabled={
                                                duplicatingId === event.id
                                              }
                                            >
                                              <Copy className="mr-2 h-4 w-4" />
                                              複製
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onSelect={() =>
                                                setConfirmDelete(event)
                                              }
                                              disabled={
                                                duplicatingId === event.id ||
                                                deletingId === event.id
                                              }
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              削除
                                            </DropdownMenuItem>
                                            <DropdownMenuItem disabled>
                                              月次に反映を見る（将来）
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Summary Panel (desktop) */}
          <div className="hidden lg:block">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>サマリー</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {nextEvent ? (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">次のイベント</h4>
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {formatEventMonth(nextEvent.startYm)}
                      </div>
                      <div className="font-medium">{getEventTitle(nextEvent)}</div>
                      <div className="text-sm font-semibold">
                        {formatAmount(nextEvent.amountYen)}
                        {nextEvent.cadence === "monthly" && "/月"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    今後のイベントはありません
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    今後12ヶ月の追加支出（概算）
                  </h4>
                  <div className="text-2xl font-bold">
                    {formatAmount(next12MonthsImpact)}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button className="w-full" asChild>
                    <Link href={`/plans/${planId}/events/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      イベントを追加
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    asChild
                  >
                    <Link href={`/plans/${planId}/forecast`}>将来見通しへ</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </main>

      <AlertDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setConfirmDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>イベントを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。将来の見通しからも反映が消えます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmDelete && (
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <div className="font-medium">
                {getEventTitle(confirmDelete)}
              </div>
              <div className="text-muted-foreground">
                {formatEventMonth(confirmDelete.startYm)}
              </div>
              <div className="font-semibold">
                {confirmDelete.direction === "income" ? "収入" : "支出"} ・
                {formatAmount(confirmDelete.amountYen)}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={Boolean(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}















