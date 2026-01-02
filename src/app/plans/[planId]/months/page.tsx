"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  Copy,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  FileText,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

// Mock data types
type MonthData = {
  month: string; // "2026-01"
  label: string; // "2026年1月"
  status: "entered" | "missing";
  incomeTotal?: number;
  expenseTotal?: number;
  assetsBalance?: number;
  liabilitiesBalance?: number;
  lastUpdated?: string;
  isCurrentMonth?: boolean;
};

// Mock plan
const MOCK_PLAN = {
  id: "plan-001",
  name: "山田家 2026",
};

// Generate mock months for a year
function generateMockMonths(year: number): MonthData[] {
  const months: MonthData[] = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;

  for (let i = 1; i <= 12; i++) {
    const monthStr = `${year}-${i.toString().padStart(2, "0")}`;
    const isCurrentMonth = year === currentYear && i === currentMonthNum;

    // Mock: some months have data, some don't
    const hasData = i <= 8 || i === 10;

    months.push({
      month: monthStr,
      label: `${year}年${i}月`,
      status: hasData ? "entered" : "missing",
      incomeTotal: hasData ? 450000 + Math.random() * 100000 : undefined,
      expenseTotal: hasData ? 320000 + Math.random() * 80000 : undefined,
      assetsBalance: hasData ? 5000000 + i * 100000 : undefined,
      liabilitiesBalance: hasData ? 2000000 - i * 50000 : undefined,
      lastUpdated: hasData
        ? `${year}/${i.toString().padStart(2, "0")}/15`
        : undefined,
      isCurrentMonth,
    });
  }

  return months;
}

const formatYen = (value: number) => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function MonthlyListPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [selectedYear, setSelectedYear] = useState(2026);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "missing" | "entered"
  >("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [monthToDelete, setMonthToDelete] = useState<string | null>(null);

  const allMonths = generateMockMonths(selectedYear);

  // Filter months based on status
  const filteredMonths = allMonths.filter((month) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "missing") return month.status === "missing";
    if (statusFilter === "entered") return month.status === "entered";
    return true;
  });

  const enteredCount = allMonths.filter((m) => m.status === "entered").length;

  const handleCopyPreviousMonth = (currentMonth: string) => {
    toast.success("前月の値をコピーしました", {
      description: `${currentMonth}にデータを反映しました`,
    });
  };

  const handleDeleteMonth = (month: string) => {
    setMonthToDelete(month);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (monthToDelete) {
      toast.success("月次データを削除しました", {
        description: `${monthToDelete}のデータを削除しました`,
      });
      setDeleteDialogOpen(false);
      setMonthToDelete(null);
    }
  };

  // Check if it's empty state (no data at all)
  const isEmpty = enteredCount === 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container max-w-5xl py-6">
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
              {MOCK_PLAN.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">月次</span>
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

      {/* Main content */}
      <div className="container max-w-5xl py-8">
        {isEmpty ? (
          // Empty state
          <Card className="p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">
              まだ月次データがありません
            </h2>
            <p className="text-muted-foreground mb-6">
              まずは今月の合計（収入/支出/資産/負債）を入力しましょう
            </p>
            <Button asChild size="lg">
              <Link href={`/plans/${planId}/months/current`}>今月を入力</Link>
            </Button>
          </Card>
        ) : (
          <>
            {/* Control bar */}
            <Card className="p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                  {/* Year selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">年:</span>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(Number(value))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
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
                  const net =
                    month.incomeTotal && month.expenseTotal
                      ? month.incomeTotal - month.expenseTotal
                      : undefined;

                  return (
                    <AccordionItem
                      key={month.month}
                      value={month.month}
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
                                  {month.incomeTotal &&
                                    formatYen(month.incomeTotal)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  支出
                                </div>
                                <div className="font-medium">
                                  {month.expenseTotal &&
                                    formatYen(month.expenseTotal)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  収支
                                </div>
                                <div
                                  className={`font-medium ${
                                    net && net >= 0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {net !== undefined && formatYen(net)}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                最終更新: {month.lastUpdated}
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
                            <Button size="sm" variant="outline" asChild>
                              <Link
                                href={`/plans/${planId}/months/${month.month}`}
                              >
                                編集
                              </Link>
                            </Button>
                          ) : (
                            <Button size="sm" asChild>
                              <Link
                                href={`/plans/${planId}/months/${month.month}`}
                              >
                                入力する
                              </Link>
                            </Button>
                          )}

                          <Button size="sm" variant="ghost" asChild>
                            <Link
                              href={`/plans/${planId}/months/${month.month}/detail`}
                            >
                              詳細
                            </Link>
                          </Button>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleCopyPreviousMonth(month.label)
                                  }
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>前月の値をコピー</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleCopyPreviousMonth(month.label)
                                }
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                この月を複製
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteMonth(month.label)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                データを削除
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
                                  {month.incomeTotal &&
                                    formatYen(month.incomeTotal)}
                                </div>
                              </div>
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="text-xs text-red-700 mb-1">
                                  支出合計
                                </div>
                                <div className="font-semibold text-red-900">
                                  {month.expenseTotal &&
                                    formatYen(month.expenseTotal)}
                                </div>
                              </div>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-xs text-blue-700 mb-1">
                                  資産残高
                                </div>
                                <div className="font-semibold text-blue-900">
                                  {month.assetsBalance &&
                                    formatYen(month.assetsBalance)}
                                </div>
                              </div>
                              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="text-xs text-orange-700 mb-1">
                                  負債残高
                                </div>
                                <div className="font-semibold text-orange-900">
                                  {month.liabilitiesBalance &&
                                    formatYen(month.liabilitiesBalance)}
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
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>データを削除しますか？</DialogTitle>
            <DialogDescription>
              {monthToDelete}のデータを削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
