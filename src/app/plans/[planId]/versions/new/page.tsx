"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  AlertCircle,
  FileText,
  Copy,
  Home,
  Calendar,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Mock data
const MOCK_DATA = {
  planId: "plan_001",
  planName: "山田家ライフプラン",
  currentVersion: "v3",
  updatedAt: "2026/04/12",
  scenarios: ["保守", "標準", "楽観"],
};

export default function NewVersionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form state
  const [versionName, setVersionName] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveMonth, setEffectiveMonth] = useState("2026-05");
  const [copyRange, setCopyRange] = useState("all");
  const [inheritScenarios, setInheritScenarios] = useState(true);
  const [switchToStandard, setSwitchToStandard] = useState(true);

  // Validation
  const [errors, setErrors] = useState<{
    versionName?: string;
    effectiveMonth?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!versionName.trim()) {
      newErrors.versionName = "バージョン名を入力してください";
    }
    if (!effectiveMonth) {
      newErrors.effectiveMonth = "有効開始月を選択してください";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setLoading(true);
    setShowConfirm(false);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success("新しいバージョンを作成しました", {
      description: `${versionName} を作成し、切り替えました。`,
    });

    setLoading(false);
    router.push(`/plans/${MOCK_DATA.planId}`);
  };

  const copyRangeOptions = [
    {
      value: "all",
      label: "現行バージョンをすべてコピー",
      description:
        "住宅前提、イベント、月次入力、シナリオをすべて引き継ぎます（推奨）",
      recommended: true,
    },
    {
      value: "housing",
      label: "住宅前提のみコピー",
      description: "4タイプの住宅前提とLCC設定のみをコピーします",
    },
    {
      value: "events",
      label: "イベントのみコピー",
      description: "ライフイベントのみをコピーします",
    },
    {
      value: "minimal",
      label: "最小構成",
      description: "シナリオと住宅4タイプの初期前提のみで開始します",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
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
              href={`/plans/${MOCK_DATA.planId}`}
              className="hover:text-foreground transition-colors"
            >
              {MOCK_DATA.planName}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/plans/${MOCK_DATA.planId}/versions`}
              className="hover:text-foreground transition-colors"
            >
              改定履歴
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">
              新規バージョン作成
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold">新しいバージョンを作成</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              現行バージョンを複製して、前提や計画を見直すための改定版を作ります。
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          {/* Left Column: Form */}
          <div className="space-y-6">
            {/* Section A: Source Version */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  作成元
                </CardTitle>
                <CardDescription>複製するバージョンの情報</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">
                      作成元バージョン
                    </Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="font-medium">
                        {MOCK_DATA.currentVersion}
                      </span>
                      <Badge variant="default" className="text-xs">
                        現行
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">最終更新</Label>
                    <p className="mt-1.5 font-medium">{MOCK_DATA.updatedAt}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">シナリオ</Label>
                  <div className="mt-1.5 flex gap-2">
                    {MOCK_DATA.scenarios.map((scenario) => (
                      <Badge key={scenario} variant="outline">
                        {scenario}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section B: New Version Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Copy className="h-5 w-5" />
                  新バージョン情報
                </CardTitle>
                <CardDescription>
                  バージョン名と改定理由を入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="version-name">
                    バージョン名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="version-name"
                    placeholder="例: v4: 住宅購入を織り込む"
                    value={versionName}
                    onChange={(e) => {
                      setVersionName(e.target.value);
                      if (errors.versionName) {
                        setErrors({ ...errors, versionName: undefined });
                      }
                    }}
                    className={errors.versionName ? "border-destructive" : ""}
                  />
                  {errors.versionName && (
                    <p className="text-sm text-destructive">
                      {errors.versionName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">改定理由 / メモ</Label>
                  <Textarea
                    id="reason"
                    placeholder="例: 転職予定を反映、教育費を見直し…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    後から差分比較する際に役立ちます
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effective-month">
                    有効開始月 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={effectiveMonth}
                    onValueChange={setEffectiveMonth}
                  >
                    <SelectTrigger
                      id="effective-month"
                      className={
                        errors.effectiveMonth ? "border-destructive" : ""
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026-04">2026年4月</SelectItem>
                      <SelectItem value="2026-05">2026年5月</SelectItem>
                      <SelectItem value="2026-06">2026年6月</SelectItem>
                      <SelectItem value="2026-07">2026年7月</SelectItem>
                      <SelectItem value="2026-08">2026年8月</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.effectiveMonth && (
                    <p className="text-sm text-destructive">
                      {errors.effectiveMonth}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section C: Copy Range */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  コピー範囲
                </CardTitle>
                <CardDescription>
                  どのデータを新バージョンに引き継ぎますか？
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={copyRange} onValueChange={setCopyRange}>
                  <div className="space-y-3">
                    {copyRangeOptions.map((option) => (
                      <div
                        key={option.value}
                        className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="mt-0.5"
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={option.value}
                            className="flex items-center gap-2 font-medium cursor-pointer"
                          >
                            {option.label}
                            {option.recommended && (
                              <Badge variant="secondary" className="text-xs">
                                推奨
                              </Badge>
                            )}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Section D: Scenario Handling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  シナリオの扱い
                </CardTitle>
                <CardDescription>
                  シナリオ前提の引き継ぎ方法を選択してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="inherit-scenarios"
                      className="font-medium cursor-pointer"
                    >
                      シナリオ前提を引き継ぐ
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      保守・標準・楽観の各前提を現行バージョンからコピーします
                    </p>
                  </div>
                  <Switch
                    id="inherit-scenarios"
                    checked={inheritScenarios}
                    onCheckedChange={setInheritScenarios}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="switch-standard"
                      className="font-medium cursor-pointer"
                    >
                      作成後に標準シナリオへ自動切替
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      新バージョン作成後、標準シナリオを選択した状態で表示します
                    </p>
                  </div>
                  <Switch
                    id="switch-standard"
                    checked={switchToStandard}
                    onCheckedChange={setSwitchToStandard}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section E: Notice */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                この操作はデータを複製します。元のバージョンは変更されません。
              </AlertDescription>
            </Alert>
          </div>

          {/* Right Column: Guide */}
          <div className="space-y-6">
            {/* Hints Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">改定のヒント</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <p>
                    前提の見直しは「住宅」「イベント」「月次入力」から始めるとスムーズ
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <p>まずは標準シナリオで整合→保守/楽観で比較</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <p>改定メモを残すと差分比較がしやすい</p>
                </div>
              </CardContent>
            </Card>

            {/* Steps Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">作成後の流れ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { num: 1, text: "バージョン作成" },
                    { num: 2, text: "住宅前提を確認" },
                    { num: 3, text: "イベントを更新" },
                    { num: 4, text: "ダッシュボードで差分を確認" },
                  ].map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {step.num}
                      </div>
                      <p className="text-sm leading-6">{step.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 border-t bg-card shadow-lg">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/plans/${MOCK_DATA.planId}/versions`)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "作成中..." : "作成する"}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この内容でバージョンを作成しますか？</DialogTitle>
            <DialogDescription>
              確認後、新しいバージョンに切り替わります。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">作成元</span>
                <span className="font-medium">{MOCK_DATA.currentVersion}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">新規バージョン名</span>
                <span className="font-medium">{versionName}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">コピー範囲</span>
                <span className="font-medium">
                  {
                    copyRangeOptions.find((opt) => opt.value === copyRange)
                      ?.label
                  }
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">有効開始月</span>
                <span className="font-medium">{effectiveMonth}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              戻る
            </Button>
            <Button onClick={handleConfirmCreate} disabled={loading}>
              {loading ? "作成中..." : "作成する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
