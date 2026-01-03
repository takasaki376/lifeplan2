"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  Plus,
  MoreVertical,
  AlertCircle,
  FileText,
  Copy,
  Edit,
  Archive,
  Trash2,
  BarChart3,
  Home,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Mock data
const PLAN_NAME = "山田家ライフプラン";
const CURRENT_VERSION_ID = "v3";

type Version = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  startMonth: string;
  memo: string;
  isCurrent: boolean;
};

const MOCK_VERSIONS: Version[] = [
  {
    id: "v3",
    name: "住宅購入を織り込む",
    createdAt: "2026/03/01",
    updatedAt: "2026/04/12",
    startMonth: "2026-05",
    memo: "ローン・修繕を追加",
    isCurrent: true,
  },
  {
    id: "v2",
    name: "教育費を見直し",
    createdAt: "2025/10/10",
    updatedAt: "2026/02/05",
    startMonth: "2025-11",
    memo: "塾費用をイベント化",
    isCurrent: false,
  },
  {
    id: "v1",
    name: "初期作成",
    createdAt: "2025/01/15",
    updatedAt: "2025/01/15",
    startMonth: "2025-01",
    memo: "初回",
    isCurrent: false,
  },
];

export default function VersionsPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;

  const [tab, setTab] = useState<"all" | "current" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "name">(
    "updated"
  );
  const [versions] = useState<Version[]>(MOCK_VERSIONS);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const currentVersion = versions.find((v) => v.isCurrent);

  // Filter and sort versions
  const filteredVersions = versions
    .filter((v) => {
      if (tab === "current") return v.isCurrent;
      if (tab === "archived") return false; // No archived versions in mock
      return true;
    })
    .filter((v) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(query) ||
        v.memo.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === "updated")
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      if (sortBy === "created")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      return a.name.localeCompare(b.name);
    });

  const handleSwitchVersion = (version: Version) => {
    setSelectedVersion(version);
    setSwitchDialogOpen(true);
  };

  const confirmSwitch = () => {
    toast.success("現行バージョンを切り替えました");
    setSwitchDialogOpen(false);
    setSelectedVersion(null);
  };

  const handleDuplicate = (versionId: string) => {
    router.push(`/plans/${planId}/versions/new?from=${versionId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
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
              {PLAN_NAME}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">改定履歴</span>
          </div>

          {/* Title & Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">改定履歴</h1>
              <p className="text-sm text-muted-foreground mt-1">
                前提や計画を見直した履歴を管理します。現行バージョンを切り替えて比較できます。
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/plans/${planId}`}>
                  <Home className="mr-2 h-4 w-4" />
                  ダッシュボードへ
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/plans/${planId}/versions/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  新規バージョン作成
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Column */}
          <div className="lg:col-span-8">
            {/* KPI Summary */}
            <div className="grid gap-4 mb-6 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>現行バージョン</CardDescription>
                  <CardTitle className="text-2xl">
                    {currentVersion?.id}
                    <Badge className="ml-2" variant="default">
                      現行
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>総バージョン数</CardDescription>
                  <CardTitle className="text-2xl">{versions.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>最終改定</CardDescription>
                  <CardTitle className="text-2xl">
                    {currentVersion?.updatedAt}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <Tabs
                    value={tab}
                    onValueChange={(v) => setTab(v as typeof tab)}
                  >
                    <TabsList>
                      <TabsTrigger value="all">すべて</TabsTrigger>
                      <TabsTrigger value="current">現行</TabsTrigger>
                      <TabsTrigger value="archived">アーカイブ</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="flex gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="バージョン名 / メモで検索"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Select
                      value={sortBy}
                      onValueChange={(v) => setSortBy(v as typeof sortBy)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updated">更新が新しい順</SelectItem>
                        <SelectItem value="created">作成が新しい順</SelectItem>
                        <SelectItem value="name">名前順</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Versions Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>バージョン</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>最終更新</TableHead>
                    <TableHead>有効開始月</TableHead>
                    <TableHead>改定メモ</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVersions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            条件に一致するバージョンがありません
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVersions.map((version) => (
                      <TableRow
                        key={version.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {version.id} {version.name}
                            </span>
                            {version.isCurrent && (
                              <Badge variant="default" className="text-xs">
                                現行
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {version.createdAt}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {version.updatedAt}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {version.startMonth}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {version.memo}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!version.isCurrent && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleSwitchVersion(version)}
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    このバージョンに切り替える
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem disabled>
                                <FileText className="mr-2 h-4 w-4" />
                                詳細を見る
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(version.id)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                複製して新規作成
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                <Edit className="mr-2 h-4 w-4" />
                                名前/メモを編集
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled>
                                <Archive className="mr-2 h-4 w-4" />
                                アーカイブ
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4">
            <div className="space-y-6">
              {/* Guide: Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">改定の運用ヒント</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>改定メモを残すと比較が簡単になります</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      標準シナリオで整合→保守/楽観で比較すると迷いにくい
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      住宅前提やイベントを見直すタイミングで改定すると履歴が綺麗です
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">よくある操作</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    asChild
                  >
                    <Link href={`/plans/${planId}/versions/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      新規バージョン作成
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    asChild
                  >
                    <Link href={`/plans/${planId}/housing/assumptions`}>
                      <Home className="mr-2 h-4 w-4" />
                      住宅前提編集へ
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    asChild
                  >
                    <Link href={`/plans/${planId}/housing`}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      住宅LCC比較へ
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Switch Version Dialog */}
      <Dialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>現行バージョンを切り替えますか？</DialogTitle>
            <DialogDescription>
              切替後、ダッシュボードや住宅LCCはこのバージョンの前提で表示されます。元に戻すこともできます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">現在:</span>
              <span className="font-medium">{currentVersion?.id}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary/50 bg-primary/5 p-3">
              <span className="text-sm text-muted-foreground">切替先:</span>
              <span className="font-medium">{selectedVersion?.id}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSwitchDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button onClick={confirmSwitch}>切り替える</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
