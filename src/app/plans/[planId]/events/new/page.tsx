"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function EventCreatePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const router = useRouter();
  const { planId } = use(params);

  // Form state
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [cadence, setCadence] = useState<"onetime" | "monthly">("onetime");
  const [amountYen, setAmountYen] = useState("");
  const [durationMode, setDurationMode] = useState<"unlimited" | "limited">(
    "unlimited"
  );
  const [durationMonths, setDurationMonths] = useState("");

  // Validation
  const isValid = useMemo(() => {
    return (
      title.trim() !== "" &&
      startMonth !== "" &&
      amountYen !== "" &&
      Number.parseFloat(amountYen) > 0
    );
  }, [title, startMonth, amountYen]);

  // Handle sample data
  const fillSample = () => {
    setTitle("保育料");
    setEventType("教育");
    setStartMonth("2026-04");
    setCadence("monthly");
    setDurationMode("limited");
    setDurationMonths("24");
    setAmountYen("40000");
    setDirection("expense");
    toast.success("サンプルデータを入力しました");
  };

  // Handle save
  const handleSave = () => {
    if (!isValid) return;

    toast.success("イベントを保存しました");
    router.push(`/plans/${planId}/events`);
  };

  const handleCancel = () => {
    router.push(`/plans/${planId}/events`);
  };

  // Preview calculations
  const previewData = useMemo(() => {
    const amount = Number.parseFloat(amountYen) || 0;
    let totalAmount = amount;
    let durationText = "";

    if (cadence === "monthly") {
      if (durationMode === "limited" && durationMonths) {
        const months = Number.parseInt(durationMonths);
        totalAmount = amount * months;
        durationText = `${months}ヶ月間`;
      } else {
        durationText = "期間なし";
      }
    }

    return {
      amount,
      totalAmount,
      durationText,
    };
  }, [amountYen, cadence, durationMode, durationMonths]);

  // Format month for display
  const formatMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    return `${year}年${month}月`;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <a href={`/plans`} className="hover:text-foreground">
              プラン一覧
            </a>
            <span>/</span>
            <a href={`/plans/${planId}`} className="hover:text-foreground">
              マイライフプラン
            </a>
            <span>/</span>
            <a
              href={`/plans/${planId}/events`}
              className="hover:text-foreground"
            >
              イベント
            </a>
            <span>/</span>
            <span className="text-foreground">追加</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-balance">
                イベントを追加
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                将来の支出や収入の変化を登録します。正確でなくてOK。
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                キャンセル
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!isValid}>
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Form */}
          <div className="space-y-6 lg:col-span-8">
            {/* Card 1: Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    イベント名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例：保育料 / 入学準備 / 転職による収入増"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventType">種別（任意）</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger id="eventType">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="出産">出産</SelectItem>
                      <SelectItem value="教育">教育</SelectItem>
                      <SelectItem value="転職">転職</SelectItem>
                      <SelectItem value="退職">退職</SelectItem>
                      <SelectItem value="介護">介護</SelectItem>
                      <SelectItem value="住居">住居</SelectItem>
                      <SelectItem value="その他">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">メモ（任意）</Label>
                  <Textarea
                    id="memo"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="メモや補足事項"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">発生タイミング</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="startMonth">
                    発生月 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startMonth"
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    月単位で管理します（例：2026年4月）
                  </p>
                </div>

                {cadence === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="endMonth">終了月（任意）</Label>
                    <Input
                      id="endMonth"
                      type="month"
                      value={endMonth}
                      onChange={(e) => setEndMonth(e.target.value)}
                      min={startMonth}
                    />
                    <p className="text-xs text-muted-foreground">
                      設定すると期間が自動計算されます
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Amount and Cadence */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">金額と形態</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>
                    収支区分 <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDirection("expense")}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                        direction === "expense"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <ArrowDownRight
                        className={`h-5 w-5 ${
                          direction === "expense"
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="font-medium">支出</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection("income")}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                        direction === "income"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <ArrowUpRight
                        className={`h-5 w-5 ${
                          direction === "income"
                            ? "text-green-500"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="font-medium">収入</span>
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>
                    形態 <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCadence("onetime")}
                      className={`rounded-lg border-2 p-4 text-center transition-all ${
                        cadence === "onetime"
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      単発
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadence("monthly")}
                      className={`rounded-lg border-2 p-4 text-center transition-all ${
                        cadence === "monthly"
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      毎月
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="amountYen">
                    金額 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="amountYen"
                      type="number"
                      value={amountYen}
                      onChange={(e) => setAmountYen(e.target.value)}
                      className="pr-16 text-right"
                      placeholder="0"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {cadence === "monthly" ? "円 / 月" : "円"}
                    </span>
                  </div>
                </div>

                {cadence === "monthly" && (
                  <div className="space-y-3">
                    <Label>期間</Label>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setDurationMode("unlimited")}
                        className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                          durationMode === "unlimited"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                      >
                        <div className="font-medium">期間なし（ずっと）</div>
                        <div className="text-xs text-muted-foreground">
                          将来にわたって継続
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDurationMode("limited")}
                        className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                          durationMode === "limited"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                      >
                        <div className="font-medium">期間を指定</div>
                      </button>

                      {durationMode === "limited" && (
                        <div className="ml-4 space-y-2">
                          <Label htmlFor="durationMonths">期間（月数）</Label>
                          <div className="relative">
                            <Input
                              id="durationMonths"
                              type="number"
                              value={durationMonths}
                              onChange={(e) =>
                                setDurationMonths(e.target.value)
                              }
                              className="pr-12"
                              placeholder="0"
                              min="1"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              ヶ月
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 4: Optional Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  オプション（任意）
                  <Badge variant="secondary" className="text-xs">
                    将来対応
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  インフレ反映や詳細な影響設定は、今後のアップデートで対応予定です。
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Preview + Tips */}
          <div className="space-y-6 lg:col-span-4">
            {/* Preview Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  プレビュー
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  このイベントの反映イメージ
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">種別</span>
                    <span className="font-medium">{eventType || "未設定"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">区分</span>
                    <div className="flex items-center gap-1.5">
                      {direction === "expense" ? (
                        <>
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                          <span className="font-medium">支出</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                          <span className="font-medium">収入</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">形態</span>
                    <span className="font-medium">
                      {cadence === "onetime" ? "単発" : "毎月"}
                    </span>
                  </div>

                  {startMonth && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">開始月</span>
                      <span className="font-medium">
                        {formatMonth(startMonth)}
                      </span>
                    </div>
                  )}

                  {amountYen && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">金額</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat("ja-JP").format(
                          Number.parseFloat(amountYen)
                        )}
                        円{cadence === "monthly" && "/月"}
                      </span>
                    </div>
                  )}

                  {cadence === "monthly" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">期間</span>
                      <span className="font-medium">
                        {previewData.durationText}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {startMonth && amountYen && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      反映イメージ
                    </div>
                    <div className="text-sm">
                      {cadence === "onetime" ? (
                        <p>
                          <span className="font-medium">
                            {formatMonth(startMonth)}
                          </span>
                          に
                          <span
                            className={`mx-1 font-bold ${
                              direction === "expense"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {direction === "expense" ? "▼" : "▲"}
                            {new Intl.NumberFormat("ja-JP").format(
                              previewData.amount
                            )}
                            円
                          </span>
                          （{direction === "expense" ? "支出" : "収入"}）
                        </p>
                      ) : (
                        <p>
                          <span className="font-medium">
                            {formatMonth(startMonth)}
                          </span>
                          から
                          {durationMode === "limited" && durationMonths && (
                            <>
                              <span className="mx-1 font-medium">
                                {previewData.durationText}
                              </span>
                            </>
                          )}
                          <span
                            className={`mx-1 font-bold ${
                              direction === "expense"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {direction === "expense" ? "▼" : "▲"}
                            {new Intl.NumberFormat("ja-JP").format(
                              previewData.amount
                            )}
                            円/月
                          </span>
                          （{direction === "expense" ? "支出" : "収入"}）
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {cadence === "monthly" &&
                  durationMode === "limited" &&
                  durationMonths &&
                  amountYen && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        総額（概算）
                      </div>
                      <div className="text-xl font-bold">
                        {new Intl.NumberFormat("ja-JP").format(
                          previewData.totalAmount
                        )}
                        円
                      </div>
                    </div>
                  )}

                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-900 dark:text-blue-100">
                  前提はあとから変更できます
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  入力のコツ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="text-primary">•</span>
                  <p>正確でなくてOK。概算から始めましょう</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">•</span>
                  <p>毎月のものは「毎月」を選ぶのがおすすめ</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">•</span>
                  <p>迷ったら「その他」でOK</p>
                </div>

                <Separator className="my-4" />

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={fillSample}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  サンプルを入れる
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Sticky Footer (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 lg:hidden">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => toast.info("下書きとして保存しました")}
          >
            下書き保存
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={!isValid}>
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

// React 19 use() hook polyfill for params
function use<T>(promise: Promise<T>): T {
  if ("use" in React) {
    return React.use(promise);
  }
  throw promise;
}

import React from "react";
