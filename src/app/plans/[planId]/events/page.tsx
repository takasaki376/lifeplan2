"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Mock data types
type EventDirection = "expense" | "income";
type EventCadence = "once" | "monthly";
type EventType =
  | "birth"
  | "education"
  | "job_change"
  | "retirement"
  | "care"
  | "housing"
  | "other";

interface LifeEvent {
  id: string;
  title: string;
  eventType: EventType;
  startMonth: string; // YYYY-MM
  cadence: EventCadence;
  durationMonths?: number; // for monthly events
  amountYen: number;
  direction: EventDirection;
  note?: string;
}

// Mock plan
const MOCK_PLAN = {
  id: "plan-1",
  name: "山田家 2026",
};

// Initial mock events
const INITIAL_MOCK_EVENTS: LifeEvent[] = [
  {
    id: "evt-1",
    title: "保育料",
    eventType: "education",
    startMonth: "2026-04",
    cadence: "monthly",
    durationMonths: 24,
    amountYen: 40000,
    direction: "expense",
    note: "認可保育園",
  },
  {
    id: "evt-2",
    title: "入学金",
    eventType: "education",
    startMonth: "2027-03",
    cadence: "once",
    amountYen: 200000,
    direction: "expense",
  },
  {
    id: "evt-3",
    title: "転職に伴う収入増",
    eventType: "job_change",
    startMonth: "2030-04",
    cadence: "once",
    amountYen: 600000,
    direction: "income",
    note: "基本給アップ分",
  },
  {
    id: "evt-4",
    title: "引越し費用",
    eventType: "housing",
    startMonth: "2025-04",
    cadence: "once",
    amountYen: 300000,
    direction: "expense",
  },
];

// Event type labels
const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birth: "出産",
  education: "教育",
  job_change: "転職",
  retirement: "退職",
  care: "介護",
  housing: "住居",
  other: "その他",
};

// Cadence labels
const CADENCE_LABELS: Record<EventCadence, string> = {
  once: "単発",
  monthly: "毎月",
};

type TimeFilter = "upcoming" | "past" | "all";
type typeFilter = EventType | "all";
type cadenceFilter = EventCadence | "all";

export default function EventsPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;

  const [events, setEvents] = useState<LifeEvent[]>(INITIAL_MOCK_EVENTS);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [cadenceFilter, setCadenceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const currentMonth = "2026-02"; // Mock current date

  // Filter events
  const filteredEvents = events.filter((event) => {
    // Time filter
    if (timeFilter === "upcoming" && event.startMonth <= currentMonth)
      return false;
    if (timeFilter === "past" && event.startMonth > currentMonth) return false;

    // Type filter
    if (typeFilter !== "all" && event.eventType !== typeFilter) return false;

    // Cadence filter
    if (cadenceFilter !== "all" && event.cadence !== cadenceFilter)
      return false;

    // Search query
    if (
      searchQuery &&
      !event.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    return true;
  });

  // Group events by year and month
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const [year, month] = event.startMonth.split("-");
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
  const upcomingCount = events.filter(
    (e) => e.startMonth > currentMonth
  ).length;
  const pastCount = events.filter((e) => e.startMonth <= currentMonth).length;

  // Calculate next 12 months impact
  const next12MonthsImpact = events
    .filter((e) => {
      const eventDate = new Date(e.startMonth + "-01");
      const currentDate = new Date(currentMonth + "-01");
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
    .filter((e) => e.startMonth > currentMonth)
    .sort((a, b) => a.startMonth.localeCompare(b.startMonth))[0];

  const handleAddSampleEvents = () => {
    const sampleEvents: LifeEvent[] = [
      {
        id: `evt-${Date.now()}-1`,
        title: "学習塾",
        eventType: "education",
        startMonth: "2026-09",
        cadence: "monthly",
        durationMonths: 36,
        amountYen: 25000,
        direction: "expense",
      },
      {
        id: `evt-${Date.now()}-2`,
        title: "車両購入",
        eventType: "other",
        startMonth: "2028-06",
        cadence: "once",
        amountYen: 2500000,
        direction: "expense",
      },
    ];
    setEvents([...events, ...sampleEvents]);
    toast.success("サンプルイベントを追加しました");
  };

  const handleDuplicate = (event: LifeEvent) => {
    const duplicated: LifeEvent = {
      ...event,
      id: `evt-${event.id}`,
      title: `${event.title}（コピー）`,
    };
    setEvents([...events, duplicated]);
    toast.success("イベントを複製しました");
  };

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      setEvents(events.filter((e) => e.id !== eventToDelete));
      toast.success("イベントを削除しました");
    }
    setDeleteDialogOpen(false);
    setEventToDelete(null);
  };

  const handleResetFilters = () => {
    setTimeFilter("upcoming");
    setTypeFilter("all");
    setCadenceFilter("all");
    setSearchQuery("");
  };

  const formatYen = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (yyyymm: string) => {
    const [year, month] = yyyymm.split("-");
    return `${year}/${month}`;
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
              {MOCK_PLAN.name}
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

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
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
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="種別" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="birth">出産</SelectItem>
                        <SelectItem value="education">教育</SelectItem>
                        <SelectItem value="job_change">転職</SelectItem>
                        <SelectItem value="retirement">退職</SelectItem>
                        <SelectItem value="care">介護</SelectItem>
                        <SelectItem value="housing">住居</SelectItem>
                        <SelectItem value="other">その他</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Cadence Filter */}
                    <Select
                      value={cadenceFilter}
                      onValueChange={setCadenceFilter}
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
                    </Button>
                    <Button variant="outline" onClick={handleAddSampleEvents}>
                      例を追加（サンプル）
                    </Button>
                  </div>
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
                            const isPast = event.startMonth <= currentMonth;
                            const isCurrent = event.startMonth === currentMonth;
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
                                        {formatMonth(event.startMonth)}
                                      </Badge>

                                      {/* Middle: Title and details */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="font-semibold text-foreground">
                                            {event.title}
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
                                            {EVENT_TYPE_LABELS[event.eventType]}
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
                                            {formatYen(event.amountYen)}
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
                                              onClick={() =>
                                                handleDuplicate(event)
                                              }
                                            >
                                              <Copy className="mr-2 h-4 w-4" />
                                              複製
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onClick={() =>
                                                handleDeleteClick(event.id)
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
                        {formatMonth(nextEvent.startMonth)}
                      </div>
                      <div className="font-medium">{nextEvent.title}</div>
                      <div className="text-sm font-semibold">
                        {formatYen(nextEvent.amountYen)}
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
                    {formatYen(next12MonthsImpact)}
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
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>イベントを削除しますか？</DialogTitle>
            <DialogDescription>この操作は取り消せません。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
