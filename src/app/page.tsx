"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreVertical,
  Archive,
  Copy,
  Trash2,
  Home,
  History,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Plan } from "@/lib/domain/types";
import { getCurrentYearMonth } from "@/lib/format";
import { createRepositories } from "@/lib/repo/factory";

type PlanRow = Plan & { needsInput: boolean };
type ConfirmAction = { type: "archive" | "restore"; plan: PlanRow };

const formatUpdatedAt = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ja-JP");
};

export default function PlansListPage() {
  const repos = useMemo(() => createRepositories(), []);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await repos.plan.list();
      const currentYm = getCurrentYearMonth();
      const needsInput = new Map<string, boolean>();
      await Promise.all(
        list.map(async (plan) => {
          const record = await repos.monthly.getByYm(plan.id, currentYm);
          needsInput.set(plan.id, !record);
        }),
      );
      const enriched = list.map((plan) => ({
        ...plan,
        needsInput: needsInput.get(plan.id) ?? true,
      }));
      setPlans(enriched);
    } catch (fetchError) {
      console.error(fetchError);
      setError("プランの読み込みに失敗しました。");
      toast.error("プランの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [repos]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const filteredPlans = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = (plan: PlanRow) =>
      normalizedQuery.length === 0 ||
      plan.name.toLowerCase().includes(normalizedQuery);

    const filtered = plans.filter((plan) => {
      if (!matchesSearch(plan)) return false;
      if (activeTab === "archived") return plan.status === "archived";
      if (activeTab === "pending")
        return plan.status === "active" && plan.needsInput;
      if (activeTab === "recent") return plan.status === "active";
      if (activeTab === "all") return plan.status === "active";
      return true;
    });

    const sorted = [...filtered];
    if (activeTab === "recent" || activeTab === "archived") {
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    }
    return sorted;
  }, [activeTab, plans, searchQuery]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === "archive") {
        await repos.plan.archive(confirmAction.plan.id);
        toast.success("アーカイブしました");
      } else {
        await repos.plan.restore(confirmAction.plan.id);
        toast.success("復元しました");
      }
      await loadPlans();
    } catch (actionError) {
      console.error(actionError);
      toast.error(
        confirmAction.type === "archive"
          ? "アーカイブに失敗しました"
          : "復元に失敗しました",
      );
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, loadPlans, repos]);

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
        {error ? (
          <div className="mb-6">
            <Alert variant="destructive">
              <AlertTitle>読み込みに失敗しました</AlertTitle>
              <AlertDescription>
                <p>{error}</p>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={`plan-skeleton-${index}`}
                className="flex flex-col gap-4 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-5 w-16 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                <div className="mt-auto h-9 w-full rounded bg-muted animate-pulse" />
              </Card>
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
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
                    </div>
                    <Badge
                      variant={plan.needsInput ? "destructive" : "default"}
                      className={
                        plan.needsInput
                          ? ""
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }
                    >
                      {plan.needsInput ? "今月未入力" : "入力済み"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-2 pb-4 text-xs text-muted-foreground">
                  <p>最終更新: {formatUpdatedAt(plan.updatedAt)}</p>
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
                      <DropdownMenuItem asChild>
                        <Link href={`/plans/${plan.id}/housing`}>
                          <Home className="mr-2 h-4 w-4" />
                          住宅LCCを見る
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/plans/${plan.id}/versions`}>
                          <History className="mr-2 h-4 w-4" />
                          改定履歴
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled>
                        <Copy className="mr-2 h-4 w-4" />
                        複製
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setConfirmAction({
                            type:
                              plan.status === "archived"
                                ? "restore"
                                : "archive",
                            plan,
                          })
                        }
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {plan.status === "archived" ? "復元" : "アーカイブ"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled
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

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) {
            setConfirmAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "archive"
                ? "アーカイブしますか？"
                : "復元しますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "archive"
                ? "プランは一覧から非表示になります。"
                : "プランを一覧に戻します。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={actionLoading}
            >
              {confirmAction?.type === "archive"
                ? "アーカイブする"
                : "復元する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
