"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreVertical,
  Archive,
  Copy,
  Trash2,
  Home,
  FileText,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface Plan {
  id: string;
  name: string;
  householdSummary: string;
  currentMonthBalance: number;
  assetBalance: number;
  debtBalance: number;
  status: "pending" | "completed";
  lastUpdated: string;
  currentVersion: string;
  versionDate: string;
  isArchived: boolean;
}

const mockPlans: Plan[] = [
  {
    id: "1",
    name: "山田家 2026",
    householdSummary: "夫婦+子1 / 住宅: 高性能住宅",
    currentMonthBalance: 32000,
    assetBalance: 8450000,
    debtBalance: 28900000,
    status: "pending",
    lastUpdated: "2026/01/02",
    currentVersion: "v3",
    versionDate: "2025/12/15",
    isArchived: false,
  },
  {
    id: "2",
    name: "佐藤家 2026",
    householdSummary: "夫婦+子2 / 住宅: 一般戸建",
    currentMonthBalance: -45000,
    assetBalance: 12300000,
    debtBalance: 35000000,
    status: "completed",
    lastUpdated: "2025/12/28",
    currentVersion: "v2",
    versionDate: "2025/11/20",
    isArchived: false,
  },
  {
    id: "3",
    name: "鈴木家 2026",
    householdSummary: "夫婦 / 住宅: 分譲マンション",
    currentMonthBalance: 58000,
    assetBalance: 15600000,
    debtBalance: 22400000,
    status: "completed",
    lastUpdated: "2025/12/30",
    currentVersion: "v5",
    versionDate: "2025/12/10",
    isArchived: false,
  },
  {
    id: "4",
    name: "田中家 2025",
    householdSummary: "単身 / 住宅: 賃貸",
    currentMonthBalance: 28000,
    assetBalance: 3200000,
    debtBalance: 0,
    status: "pending",
    lastUpdated: "2025/12/25",
    currentVersion: "v1",
    versionDate: "2025/12/01",
    isArchived: false,
  },
  {
    id: "5",
    name: "高橋家 2026",
    householdSummary: "夫婦+子3 / 住宅: 高性能住宅",
    currentMonthBalance: 12000,
    assetBalance: 9800000,
    debtBalance: 42000000,
    status: "completed",
    lastUpdated: "2026/01/01",
    currentVersion: "v4",
    versionDate: "2025/11/30",
    isArchived: false,
  },
  {
    id: "6",
    name: "伊藤家 2025",
    householdSummary: "夫婦+子1 / 住宅: 分譲マンション",
    currentMonthBalance: -15000,
    assetBalance: 6700000,
    debtBalance: 18000000,
    status: "completed",
    lastUpdated: "2025/11/15",
    currentVersion: "v2",
    versionDate: "2025/10/20",
    isArchived: true,
  },
];

export default function PlansListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredPlans = mockPlans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.householdSummary.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch && !plan.isArchived;
    if (activeTab === "pending")
      return matchesSearch && plan.status === "pending" && !plan.isArchived;
    if (activeTab === "recent") return matchesSearch && !plan.isArchived;
    if (activeTab === "archived") return matchesSearch && plan.isArchived;

    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ja-JP") + "円";
  };

  const handleAction = (action: string, planId: string) => {
    console.log(`Action: ${action}, Plan ID: ${planId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            ライフプラン管理
          </h1>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="プランを検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
                aria-label="プランを検索"
              />
            </div>

            <Button asChild size="sm" className="sm:size-default">
              <Link href="/plans/new">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">新規プラン作成</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="container mx-auto px-4 pb-4 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="プランを検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9"
              aria-label="プランを検索"
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                すべて
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                入力が必要
              </TabsTrigger>
              <TabsTrigger
                value="recent"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                最近更新
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                アーカイブ
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {filteredPlans.length === 0 ? (
          /* Empty State */
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-6">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                まだプランがありません
              </h2>
              <p className="text-muted-foreground">
                5分でかんたんに作成できます
              </p>
            </div>
            <Button asChild size="lg" className="mt-4">
              <Link href="/plans/new">
                <Plus className="mr-2 h-5 w-5" />
                新規プラン作成
              </Link>
            </Button>
          </div>
        ) : (
          /* Plans Grid */
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <Card
                key={plan.id}
                className="flex flex-col shadow-sm transition-shadow hover:shadow-md"
              >
                <CardHeader className="space-y-2 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <h3 className="text-lg font-semibold leading-tight text-foreground">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.householdSummary}
                      </p>
                    </div>
                    <Badge
                      variant={
                        plan.status === "pending" ? "destructive" : "default"
                      }
                      className={
                        plan.status === "completed"
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : ""
                      }
                    >
                      {plan.status === "pending" ? "今月未入力" : "入力済み"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4 pb-4">
                  {/* KPI Row */}
                  <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">今月の収支</span>
                      <span
                        className={`font-semibold ${
                          plan.currentMonthBalance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {plan.currentMonthBalance >= 0 ? "+" : ""}
                        {formatCurrency(plan.currentMonthBalance)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">資産残高</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(plan.assetBalance)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">負債残高</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(plan.debtBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>最終更新: {plan.lastUpdated}</p>
                    <p>
                      現行バージョン: {plan.currentVersion}（改定{" "}
                      {plan.versionDate}）
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex items-center gap-2 border-t pt-4">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/plans/${plan.id}`}>開く</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/plans/${plan.id}/months/current`}>
                      月次入力
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">メニューを開く</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => handleAction("housing-lcc", plan.id)}
                      >
                        <Home className="mr-2 h-4 w-4" />
                        住宅LCCを見る
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction("version-history", plan.id)}
                      >
                        <History className="mr-2 h-4 w-4" />
                        改定履歴
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAction("duplicate", plan.id)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        複製
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction("archive", plan.id)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        アーカイブ
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAction("delete", plan.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
