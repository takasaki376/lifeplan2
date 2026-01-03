"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  isValidYearMonth,
  validateLifeEventDraft,
} from "@/lib/validation/lifeEvent";
import type { Plan, YearMonth } from "@/lib/domain/types";
import { createRepositories } from "@/lib/repo/factory";

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

const EVENT_TYPE_KEYS = new Set<EventTypeKey>([
  "birth",
  "education",
  "job_change",
  "retirement",
  "care",
  "housing",
  "other",
]);

type FormSnapshot = {
  title: string;
  eventType: EventTypeKey | "";
  memo: string;
  startMonth: string;
  direction: "expense" | "income";
  cadence: "once" | "monthly";
  amountYen: string;
  durationMonths: string;
};

const buildSnapshot = (values: FormSnapshot) => ({ ...values });

const isKnownEventType = (value: string): value is EventTypeKey =>
  EVENT_TYPE_KEYS.has(value as EventTypeKey);

export default function EventEditPage() {
  const router = useRouter();
  const { planId, eventId } = useParams() as {
    planId: string;
    eventId: string;
  };
  const repos = useMemo(() => createRepositories(), []);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventMissing, setEventMissing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const initialSnapshotRef = useRef<FormSnapshot | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventTypeKey | "">("");
  const [memo, setMemo] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [cadence, setCadence] = useState<"once" | "monthly">("once");
  const [amountYen, setAmountYen] = useState("");
  const [durationMonths, setDurationMonths] = useState("");

  const validation = useMemo(
    () =>
      validateLifeEventDraft({
        title,
        startYm: startMonth,
        amountYen,
        direction,
        cadence,
        durationMonths,
      }),
    [title, startMonth, amountYen, direction, cadence, durationMonths],
  );
  const isValid = validation.valid;
  const fieldErrors = showErrors ? validation.errors : {};

  const durationMonthsValue = useMemo(() => {
    if (cadence === "once") return 1;
    if (!durationMonths.trim()) return undefined;
    const parsed = Number(durationMonths);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return undefined;
    return parsed;
  }, [cadence, durationMonths]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setEventMissing(false);
      try {
        const [planData, eventData] = await Promise.all([
          repos.plan.get(planId),
          repos.event.get(eventId),
        ]);
        if (!active) return;
        if (!planData) {
          setLoadError("プランが見つかりません");
          return;
        }
        setPlan(planData);
        if (!eventData) {
          setEventMissing(true);
          return;
        }

        const version = await repos.version.get(eventData.planVersionId);
        if (!active) return;
        if (!version || version.planId !== planId) {
          toast.error("このイベントは別プランに属しています");
          router.replace(`/plans/${planId}/events`);
          return;
        }

        const normalizedEventType = isKnownEventType(eventData.eventType)
          ? (eventData.eventType as EventTypeKey)
          : "other";

        setTitle(eventData.title ?? "");
        setEventType(normalizedEventType);
        setMemo(eventData.note ?? "");
        setStartMonth(eventData.startYm ?? "");
        setDirection(eventData.direction);
        setCadence(eventData.cadence);
        setAmountYen(
          eventData.amountYen !== undefined ? String(eventData.amountYen) : "",
        );
        const durationValue =
          eventData.cadence === "once"
            ? 1
            : eventData.durationMonths ?? 1;
        setDurationMonths(String(durationValue));

        initialSnapshotRef.current = buildSnapshot({
          title: eventData.title ?? "",
          eventType: normalizedEventType,
          memo: eventData.note ?? "",
          startMonth: eventData.startYm ?? "",
          direction: eventData.direction,
          cadence: eventData.cadence,
          amountYen:
            eventData.amountYen !== undefined
              ? String(eventData.amountYen)
              : "",
          durationMonths: String(durationValue),
        });
        setShowErrors(false);
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadError("読み込みに失敗しました");
        toast.error("読み込みに失敗しました");
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [planId, eventId, repos, router]);

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        title,
        eventType,
        memo,
        startMonth,
        direction,
        cadence,
        amountYen,
        durationMonths,
      }),
    [
      title,
      eventType,
      memo,
      startMonth,
      direction,
      cadence,
      amountYen,
      durationMonths,
    ],
  );

  const isDirty = useMemo(() => {
    const initial = initialSnapshotRef.current;
    if (!initial) return false;
    return JSON.stringify(initial) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot]);

  const handleCadenceChange = (value: "once" | "monthly") => {
    setCadence(value);
    if (value === "once") {
      setDurationMonths("1");
    } else if (!durationMonths.trim()) {
      setDurationMonths("1");
    }
  };

  const handleSave = async () => {
    if (!isDirty || isLoading || loadError || eventMissing) return;
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    if (!isValidYearMonth(startMonth)) {
      setShowErrors(true);
      return;
    }

    const amountValue = Number(amountYen);
    const durationValue = cadence === "once" ? 1 : durationMonthsValue;
    if (!Number.isFinite(amountValue) || !durationValue) {
      setShowErrors(true);
      return;
    }

    setIsSaving(true);
    try {
      const startYm = startMonth as YearMonth;
      await repos.event.update({
        id: eventId,
        title: title.trim(),
        eventType: eventType || "other",
        startYm,
        cadence,
        amountYen: amountValue,
        direction,
        durationMonths: durationValue,
        note: memo.trim() ? memo.trim() : undefined,
      });
      toast.success("イベントを更新しました");
      router.push(`/plans/${planId}/events`);
    } catch (error) {
      console.error(error);
      toast.error("更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/plans/${planId}/events`);
  };

  const previewData = useMemo(() => {
    const amount = Number.isFinite(Number(amountYen)) ? Number(amountYen) : 0;
    let totalAmount = amount;
    let durationText = "";

    if (cadence === "monthly") {
      const months = durationMonthsValue ?? 0;
      if (months > 0) {
        totalAmount = amount * months;
        durationText = `${months}ヶ月`;
      }
    }

    return {
      amount,
      totalAmount,
      durationText,
    };
  }, [amountYen, cadence, durationMonthsValue]);

  const formatMonth = (monthStr: string) => {
    if (!monthStr || !isValidYearMonth(monthStr)) return "";
    const [year, month] = monthStr.split("-");
    return `${year}年${month}月`;
  };

  const addMonthsToYearMonth = (ym: string, addMonths: number) => {
    if (!isValidYearMonth(ym)) return "";
    const [year, month] = ym.split("-").map(Number);
    const total = year * 12 + (month - 1) + addMonths;
    const nextYear = Math.floor(total / 12);
    const nextMonth = (total % 12) + 1;
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  };

  const endMonthDisplay = useMemo(() => {
    if (cadence !== "monthly") return "";
    if (!startMonth || !durationMonthsValue || durationMonthsValue < 1) {
      return "";
    }
    return addMonthsToYearMonth(startMonth, durationMonthsValue - 1);
  }, [cadence, startMonth, durationMonthsValue]);

  const saveDisabled =
    isSaving ||
    isLoading ||
    Boolean(loadError) ||
    eventMissing ||
    !isDirty ||
    (showErrors && !isValid);

  const planName = plan?.name ?? (isLoading ? "..." : "プラン");
  const eventTypeLabel = eventType ? EVENT_TYPE_LABELS[eventType] : "未設定";
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
              {planName}
            </a>
            <span>/</span>
            <a
              href={`/plans/${planId}/events`}
              className="hover:text-foreground"
            >
              イベント
            </a>
            <span>/</span>
            <span className="text-foreground">編集</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-balance">
                イベントを編集
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                登録済みのイベント内容を更新できます。
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isDirty && <Badge variant="outline">変更があります</Badge>}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                キャンセル
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveDisabled}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loadError && (
          <div className="mb-6 space-y-3">
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
            <Button asChild size="sm" variant="outline">
              <Link href="/plans">プラン一覧へ戻る</Link>
            </Button>
          </div>
        )}

        {eventMissing && !loadError && (
          <div className="mb-6 space-y-3">
            <Alert>
              <AlertDescription>イベントが見つかりません</AlertDescription>
            </Alert>
            <Button asChild size="sm" variant="outline">
              <Link href={`/plans/${planId}/events`}>イベント一覧へ戻る</Link>
            </Button>
          </div>
        )}

        {isLoading && !loadError && !eventMissing && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {[0, 1, 2].map((index) => (
                <Card key={`event-edit-skeleton-${index}`}>
                  <CardHeader>
                    <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-10 rounded bg-muted animate-pulse" />
                    <div className="h-10 rounded bg-muted animate-pulse" />
                    <div className="h-24 rounded bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-6 lg:col-span-4">
              <Card>
                <CardHeader>
                  <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-40 rounded bg-muted animate-pulse" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!isLoading && !loadError && !eventMissing && (
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
                      data-testid="event-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例：保育料 / 入学準備 / 転職による収入増"
                      className={fieldErrors.title ? "border-destructive" : ""}
                    />
                    {fieldErrors.title && (
                      <p className="text-xs text-destructive">
                        {fieldErrors.title}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventType">種別（任意）</Label>
                    <Select
                      value={eventType}
                      onValueChange={(value) =>
                        setEventType(value as EventTypeKey)
                      }
                    >
                      <SelectTrigger id="eventType">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="birth">出産</SelectItem>
                        <SelectItem value="education">教育</SelectItem>
                        <SelectItem value="job_change">転職</SelectItem>
                        <SelectItem value="retirement">退職</SelectItem>
                        <SelectItem value="care">介護</SelectItem>
                        <SelectItem value="housing">住宅</SelectItem>
                        <SelectItem value="other">その他</SelectItem>
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
                      data-testid="event-start-month"
                      type="month"
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className={fieldErrors.startYm ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      月単位で管理します（例: 2026年4月）
                    </p>
                    {fieldErrors.startYm && (
                      <p className="text-xs text-destructive">
                        {fieldErrors.startYm}
                      </p>
                    )}
                  </div>

                  {cadence === "monthly" && (
                    <div className="space-y-2">
                      <Label htmlFor="endMonth">終了月</Label>
                      <Input
                        id="endMonth"
                        type="month"
                        value={endMonthDisplay}
                        readOnly
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        開始月と期間から自動計算されます
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
                    {fieldErrors.direction && (
                      <p className="text-xs text-destructive">
                        {fieldErrors.direction}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>
                      形態 <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleCadenceChange("once")}
                        className={`rounded-lg border-2 p-4 text-center transition-all ${
                          cadence === "once"
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                      >
                        単発
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCadenceChange("monthly")}
                        className={`rounded-lg border-2 p-4 text-center transition-all ${
                          cadence === "monthly"
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                      >
                        毎月
                      </button>
                    </div>
                    {fieldErrors.cadence && (
                      <p className="text-xs text-destructive">
                        {fieldErrors.cadence}
                      </p>
                    )}
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
                        placeholder="0"
                        min="1"
                        step="1"
                        className={
                          fieldErrors.amountYen
                            ? "pr-16 text-right border-destructive"
                            : "pr-16 text-right"
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {cadence === "monthly" ? "円 / 月" : "円"}
                      </span>
                    </div>
                    {fieldErrors.amountYen && (
                      <p className="text-xs text-destructive">
                        {fieldErrors.amountYen}
                      </p>
                    )}
                  </div>

                  {cadence === "monthly" && (
                    <div className="space-y-3">
                      <Label htmlFor="durationMonths">
                        期間（月数） <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="durationMonths"
                          type="number"
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value)}
                          className={
                            fieldErrors.durationMonths
                              ? "pr-12 border-destructive"
                              : "pr-12"
                          }
                          placeholder="1"
                          min="1"
                          step="1"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          ヶ月
                        </span>
                      </div>
                      {fieldErrors.durationMonths && (
                        <p className="text-xs text-destructive">
                          {fieldErrors.durationMonths}
                        </p>
                      )}
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
                    インフレ反映など詳細な影響設定は今後のアップデートで対応予定です。
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
                      <span className="font-medium">{eventTypeLabel}</span>
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
                        {cadence === "once" ? "単発" : "毎月"}
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
                            previewData.amount,
                          )}
                          {cadence === "monthly" && " / 月"}
                        </span>
                      </div>
                    )}

                    {cadence === "monthly" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">期間</span>
                        <span className="font-medium">
                          {previewData.durationText || "未設定"}
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
                        {cadence === "once" ? (
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
                                previewData.amount,
                              )}
                              円
                            </span>
                            {direction === "expense" ? "支出" : "収入"}
                          </p>
                        ) : (
                          <p>
                            <span className="font-medium">
                              {formatMonth(startMonth)}
                            </span>
                            から
                            {durationMonthsValue && durationMonths && (
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
                                previewData.amount,
                              )}
                              円/月
                            </span>
                            {direction === "expense" ? "支出" : "収入"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {cadence === "monthly" && durationMonthsValue && amountYen && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        総額（概算）
                      </div>
                      <div className="text-xl font-bold">
                        {new Intl.NumberFormat("ja-JP").format(
                          previewData.totalAmount,
                        )}
                        円
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
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
                    <span className="text-primary">?</span>
                    <p>正確でなくてOK。概算から始めましょう。</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary">?</span>
                    <p>毎月の支出は「毎月」を選ぶのがおすすめ</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary">?</span>
                    <p>迷ったら「その他」でOK</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Footer (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 lg:hidden">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={handleCancel}
            disabled={isSaving}
          >
            キャンセル
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saveDisabled}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}
