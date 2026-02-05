"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Home,
  BarChart3,
  SlidersHorizontal,
  Info,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Building2,
  Building,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlanNavigationTabs } from "@/components/plan/PlanNavigationTabs";
import type {
  HousingAssumptions,
  HousingType,
  Id,
  ScenarioKey,
} from "@/lib/domain/types";
import { calcLcc } from "@/lib/calc/lcc";
import { formatYen } from "@/lib/format";
import { HOUSING_TYPE_LABELS } from "@/lib/housing";
import { createRepositories } from "@/lib/repo/factory";
import type { ScenarioAssumptionsSet } from "@/lib/repo/types";
import { DEFAULT_SCENARIO_SET } from "@/lib/domain/defaults/scenario";
import {
  formatScenarioLabel,
  parseScenario,
  scenarioKeys,
  buildScenarioHref,
} from "@/lib/scenario";
import { useScenarioNavigation } from "@/lib/hooks/useScenarioNavigation";

const HOUSING_TYPES: HousingType[] = [
  "high_performance_home",
  "detached",
  "condo",
  "rent",
];

const HOUSING_TYPE_ICONS: Record<HousingType, typeof Home> = {
  high_performance_home: Home,
  detached: Building2,
  condo: Building,
  rent: KeyRound,
};

type HorizonYears = "30" | "35" | "40";
type ChartView = "total" | "annual" | "breakdown";

export default function HousingLCCPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.planId as string;
  const repos = useMemo(() => createRepositories(), []);
  const [planName, setPlanName] = useState("プラン");
  const { changeScenario } = useScenarioNavigation();

  const scenarioParam = searchParams.get("scenario");
  const parsedScenario = parseScenario(scenarioParam);
  const [horizonYears, setHorizonYears] = useState<string>("35");
  const [selectedType, setSelectedType] = useState<HousingType | null>(null);
  const [chartView, setChartView] = useState<ChartView>("total");
  const [currentVersionId, setCurrentVersionId] = useState<Id | null>(null);
  const [housingList, setHousingList] = useState<HousingAssumptions[]>([]);
  const [scenarioSet, setScenarioSet] =
    useState<ScenarioAssumptionsSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noCurrentVersion, setNoCurrentVersion] = useState(false);
  const [isSavingSelection, setIsSavingSelection] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setNoCurrentVersion(false);
        const plan = await repos.plan.get(planId);
        if (plan?.name) {
          setPlanName(plan.name);
        }
        const currentVersion = await repos.version.getCurrent(planId);
        if (!currentVersion) {
          setNoCurrentVersion(true);
          setHousingList([]);
          setScenarioSet(null);
          setCurrentVersionId(null);
          setSelectedType(null);
          return;
        }

        setCurrentVersionId(currentVersion.id);
        let scenario: ScenarioAssumptionsSet | null = null;
        try {
          scenario = await repos.version.getScenarioSet(currentVersion.id);
        } catch (error) {
          console.error(error);
        }
        setScenarioSet(scenario);

        let list = await repos.housing.listByVersion(currentVersion.id);
        const missingTypes = HOUSING_TYPES.filter(
          (type) => !list.some((item) => item.housingType === type),
        );
        if (missingTypes.length > 0) {
          for (const type of missingTypes) {
            await repos.housing.applyPreset(currentVersion.id, type, "base");
          }
          list = await repos.housing.listByVersion(currentVersion.id);
        }

        const selected = list.find((item) => item.isSelected);
        if (!selected && list.length > 0) {
          const defaultType = HOUSING_TYPES.find((type) =>
            list.some((item) => item.housingType === type),
          );
          if (defaultType) {
            await repos.housing.setSelected(currentVersion.id, defaultType);
            list = await repos.housing.listByVersion(currentVersion.id);
          }
        }

        setHousingList(list);
        setSelectedType(list.find((item) => item.isSelected)?.housingType ?? null);
      } catch (error) {
        console.error(error);
        setLoadError("住宅LCCの読み込みに失敗しました。");
        setHousingList([]);
        setScenarioSet(null);
        setCurrentVersionId(null);
        setSelectedType(null);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [planId, repos]);

  const horizonMonths = Number.parseInt(horizonYears, 10) * 12;
  const fallbackScenario = useMemo(() => {
    if (!currentVersionId) return undefined;
    const base = DEFAULT_SCENARIO_SET.base;
    return {
      id: `fallback-${currentVersionId}`,
      planVersionId: currentVersionId,
      createdAt: new Date().toISOString(),
      ...base,
      utilitiesIncreaseRateAnnual:
        base.utilitiesIncreaseRateAnnual ?? base.inflationRate,
    };
  }, [currentVersionId]);
  const scenarioAssumptions =
    scenarioSet?.[parsedScenario] ?? scenarioSet?.base ?? fallbackScenario;
  const scenarioFallbackUsed = Boolean(
    !scenarioSet || !scenarioSet[parsedScenario],
  );
  const buildScenarioLink = (base: string, params?: Record<string, string>) =>
    buildScenarioHref(base, {
      scenario: parsedScenario,
      params,
      includeWhenMissing: true,
    });

  const lccMap = useMemo(() => {
    const map = new Map<HousingType, ReturnType<typeof calcLcc>>();
    for (const item of housingList) {
      const result = calcLcc({
        housing: item,
        scenario: scenarioAssumptions,
        horizonMonths,
      });
      map.set(item.housingType, result);
    }
    return map;
  }, [housingList, scenarioAssumptions, horizonMonths]);

  const orderedHousing = HOUSING_TYPES.map((type) =>
    housingList.find((item) => item.housingType === type),
  );
  const availableHousing = orderedHousing.filter(
    (item): item is HousingAssumptions => Boolean(item),
  );
  const hasSelected = housingList.some((item) => item.isSelected);
  const selectedTypeForDisplay =
    selectedType ??
    housingList.find((item) => item.isSelected)?.housingType ??
    null;
  const summaryResult = selectedTypeForDisplay
    ? lccMap.get(selectedTypeForDisplay)
    : availableHousing[0]
    ? lccMap.get(availableHousing[0].housingType)
    : undefined;

  const handleSelectType = async (type: HousingType) => {
    if (!currentVersionId || isSavingSelection) return;
    try {
      setIsSavingSelection(true);
      await repos.housing.setSelected(currentVersionId, type);
      const list = await repos.housing.listByVersion(currentVersionId);
      setHousingList(list);
      setSelectedType(type);
    } catch (error) {
      console.error(error);
      setLoadError("住宅タイプの選択に失敗しました。");
    } finally {
      setIsSavingSelection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/plans" className="hover:text-foreground">
              プラン一覧
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{planName}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">住宅LCC</span>
          </nav>
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-bold">
              住宅の生涯コスト（LCC）比較
            </h1>
            <p className="text-muted-foreground">読み込み中です…</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {HOUSING_TYPES.map((type) => (
              <Card key={type} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 w-32 rounded bg-muted" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-6 w-40 rounded bg-muted" />
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-muted" />
                    <div className="h-2 w-5/6 rounded bg-muted" />
                    <div className="h-2 w-4/6 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (noCurrentVersion) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/plans" className="hover:text-foreground">
              プラン一覧
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{planName}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">住宅LCC</span>
          </nav>
          <Card className="border-2 border-dashed">
            <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-12 text-center">
              <div className="rounded-full bg-muted p-6">
                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  現行バージョンがありません
                </h3>
                <p className="mb-6 text-muted-foreground">
                  まずは改定履歴から現行バージョンを設定してください。
                </p>
                <Button asChild size="lg">
                  <Link href={`/plans/${planId}/versions`}>改定履歴へ</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/plans" className="hover:text-foreground">
              プラン一覧
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{planName}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">住宅LCC</span>
          </nav>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {loadError}
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href={`/plans/${planId}/housing`}>再読み込み</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/plans" className="hover:text-foreground">
            プラン一覧
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/plans/${planId}`} className="hover:text-foreground">
            {planName}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">住宅LCC</span>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">
              住宅の生涯コスト（LCC）比較
            </h1>
            <p className="text-muted-foreground">
              前提を変えると結果も変わります。単発の答えではなく、見直しながら使う比較です。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scenario selector */}
            <Tabs
              value={parsedScenario}
              onValueChange={(value) =>
                changeScenario(value as ScenarioKey, parsedScenario)
              }
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                {scenarioKeys.map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {formatScenarioLabel(key)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Horizon selector */}
            <Select value={horizonYears} onValueChange={setHorizonYears}>
              <SelectTrigger className="w-[120px] bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30年</SelectItem>
                <SelectItem value="35">35年</SelectItem>
                <SelectItem value="40">40年</SelectItem>
              </SelectContent>
            </Select>

            {/* Assumptions button */}
            <Button asChild>
              <Link
                href={buildScenarioLink(
                  `/plans/${planId}/housing/assumptions`,
                )}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                前提を調整
              </Link>
            </Button>
          </div>
        </div>

        <PlanNavigationTabs planId={planId} currentTab="housing" />

        {!hasSelected && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              比較する住宅タイプが未選択です。
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Strip */}
        <Card className="mb-6">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                選択中の住宅:
              </span>
              {selectedTypeForDisplay ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {selectedTypeForDisplay
                    ? HOUSING_TYPE_LABELS[selectedTypeForDisplay]
                    : "未選択"}
                </Badge>
              ) : (
                <Badge variant="outline">未選択</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {horizonYears}年累計 LCC（
                {formatScenarioLabel(
                  scenarioAssumptions?.scenarioKey ?? parsedScenario,
                )}
                ）:
              </span>
              <span className="text-lg font-bold">
                {summaryResult
                  ? formatYen(summaryResult.summary.totalNominalYen)
                  : "—"}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  （概算）
                </span>
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>税・制度は概算。詳細は前提で調整できます。</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="ghost" asChild>
                <Link href={buildScenarioLink(`/plans/${planId}`)}>
                  ダッシュボードへ戻る
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {scenarioFallbackUsed && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              シナリオ前提が不足しているため標準で表示しています。
            </AlertDescription>
          </Alert>
        )}

        {/* Comparison Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {orderedHousing.map((housing, index) => {
            const housingType = HOUSING_TYPES[index];
            if (!housing) {
              return (
                <Card key={housingType} className="border-dashed">
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold">
                      {HOUSING_TYPE_LABELS[housingType]}
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      前提が未設定です。
                    </p>
                    <Button size="sm" asChild>
                      <Link
                        href={buildScenarioLink(
                          `/plans/${planId}/housing/assumptions`,
                          { type: housingType },
                        )}
                      >
                        前提を設定する
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            const Icon = HOUSING_TYPE_ICONS[housing.housingType];
            const isSelected = housing.isSelected;
            const lccResult = lccMap.get(housing.housingType);
            const breakdown = lccResult?.summary.breakdownNominalYen;
            const total = lccResult?.summary.totalNominalYen ?? 0;
            const warnings = lccResult?.summary.warnings ?? [];
            const breakdownItems = [
              {
                label: "初期",
                value: breakdown?.initial ?? 0,
              },
              {
                label: housing.housingType === "rent" ? "家賃" : "ローン",
                value: breakdown?.loanOrRent ?? 0,
              },
              {
                label: "税",
                value: breakdown?.tax ?? 0,
              },
              {
                label:
                  housing.housingType === "condo"
                    ? "修繕/管理"
                    : housing.housingType === "rent"
                    ? "管理"
                    : "修繕",
                value: breakdown?.repairsOrManagement ?? 0,
              },
              {
                label: "光熱",
                value: breakdown?.utilities ?? 0,
              },
              {
                label: housing.housingType === "rent" ? "更新/引越" : "その他",
                value: breakdown?.other ?? 0,
              },
            ].map((item) => ({
              ...item,
              percent: total > 0 ? (item.value / total) * 100 : 0,
            }));

            return (
              <Card
                key={housing.housingType}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : ""
                }`}
                onClick={() => void handleSelectType(housing.housingType)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">
                        {HOUSING_TYPE_LABELS[housing.housingType]}
                      </h3>
                    </div>
                    <Badge variant={isSelected ? "default" : "secondary"}>
                      {isSelected ? "選択中" : "比較中"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">累計LCC</div>
                    <div className="text-2xl font-bold">
                      {formatYen(lccResult?.summary.totalNominalYen)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {breakdownItems.map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="font-medium">
                            {formatYen(item.value)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary/60"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {warnings.length > 0 && (
                    <p className="text-xs text-amber-700">
                      前提不足（概算）
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    前提は編集画面で調整できます。
                  </p>
                </CardContent>
                <CardFooter className="flex gap-2 pt-3">
                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleSelectType(housing.housingType);
                    }}
                    className="flex-1"
                    disabled={isSavingSelection}
                  >
                    {isSelected ? "選択中" : "このタイプを選択"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={buildScenarioLink(
                        `/plans/${planId}/housing/${housing.housingType}`,
                      )}
                    >
                      詳細
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={buildScenarioLink(
                        `/plans/${planId}/housing/assumptions`,
                        { type: housing.housingType },
                      )}
                    >
                      前提
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <h3 className="font-semibold">比較チャート</h3>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={chartView}
                onValueChange={(v: string) => setChartView(v as ChartView)}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="total">累計LCC</TabsTrigger>
                  <TabsTrigger value="annual">年間平均</TabsTrigger>
                  <TabsTrigger value="breakdown">内訳</TabsTrigger>
                </TabsList>

                <TabsContent value="total" className="space-y-3 pt-4">
                  {availableHousing.map((housing) => {
                    const totals = availableHousing
                      .map((item) => lccMap.get(item.housingType))
                      .map((item) => item?.summary.totalNominalYen ?? 0);
                    const maxTotal = Math.max(0, ...totals);
                    const total = lccMap.get(housing.housingType)?.summary
                      .totalNominalYen ?? 0;
                    const percent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                    const isSelected =
                      selectedTypeForDisplay === housing.housingType;

                    return (
                      <div key={housing.housingType} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={
                              isSelected
                                ? "font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {HOUSING_TYPE_LABELS[housing.housingType]}
                          </span>
                          <span className="font-medium">
                            {formatYen(total)}
                          </span>
                        </div>
                        <div className="h-8 w-full overflow-hidden rounded-md bg-muted">
                          <div
                            className={`h-full ${
                              isSelected ? "bg-primary" : "bg-primary/40"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="annual" className="space-y-3 pt-4">
                  {availableHousing.map((housing) => {
                    const total =
                      lccMap.get(housing.housingType)?.summary.totalNominalYen ??
                      0;
                    const annualAvg = total / Number.parseInt(horizonYears, 10);
                    const maxAnnual = Math.max(
                      0,
                      ...availableHousing.map((item) => {
                        const itemTotal =
                          lccMap.get(item.housingType)?.summary
                            .totalNominalYen ?? 0;
                        return itemTotal / Number.parseInt(horizonYears, 10);
                      }),
                    );
                    const percent =
                      maxAnnual > 0 ? (annualAvg / maxAnnual) * 100 : 0;
                    const isSelected =
                      selectedTypeForDisplay === housing.housingType;

                    return (
                      <div key={housing.housingType} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={
                              isSelected
                                ? "font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {HOUSING_TYPE_LABELS[housing.housingType]}
                          </span>
                          <span className="font-medium">
                            {formatYen(annualAvg)}/年
                          </span>
                        </div>
                        <div className="h-8 w-full overflow-hidden rounded-md bg-muted">
                          <div
                            className={`h-full ${
                              isSelected ? "bg-primary" : "bg-primary/40"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="breakdown" className="space-y-3 pt-4">
                  {availableHousing.map((housing) => {
                    const isSelected =
                      selectedTypeForDisplay === housing.housingType;
                    const breakdown =
                      lccMap.get(housing.housingType)?.summary
                        .breakdownNominalYen;
                    const total =
                      lccMap.get(housing.housingType)?.summary.totalNominalYen ??
                      0;

                    return (
                      <div key={housing.housingType} className="space-y-1">
                        <div className="text-sm font-medium">
                          {HOUSING_TYPE_LABELS[housing.housingType]}
                        </div>
                        <div className="flex h-8 w-full overflow-hidden rounded-md">
                          <div
                            className="bg-chart-1"
                            style={{
                              width: `${
                                total > 0
                                  ? ((breakdown?.loanOrRent ?? 0) / total) * 100
                                  : 0
                              }%`,
                            }}
                            title={`${
                              housing.housingType === "rent" ? "家賃" : "ローン"
                            }: ${formatYen(breakdown?.loanOrRent)}`}
                          />
                          <div
                            className="bg-chart-2"
                            style={{
                              width: `${
                                total > 0
                                  ? ((breakdown?.repairsOrManagement ?? 0) /
                                      total) *
                                    100
                                  : 0
                              }%`,
                            }}
                            title={`修繕/管理: ${formatYen(
                              breakdown?.repairsOrManagement
                            )}`}
                          />
                          <div
                            className="bg-chart-3"
                            style={{
                              width: `${
                                total > 0
                                  ? ((breakdown?.utilities ?? 0) / total) * 100
                                  : 0
                              }%`,
                            }}
                            title={`光熱費: ${formatYen(
                              breakdown?.utilities
                            )}`}
                          />
                          <div
                            className="bg-chart-4"
                            style={{
                              width: `${
                                total > 0
                                  ? ((breakdown?.tax ?? 0) / total) * 100
                                  : 0
                              }%`,
                            }}
                            title={`税金: ${formatYen(breakdown?.tax)}`}
                          />
                          <div
                            className="bg-chart-5"
                            style={{
                              width: `${
                                total > 0
                                  ? (((breakdown?.initial ?? 0) +
                                      (breakdown?.other ?? 0)) /
                                      total) *
                                    100
                                  : 0
                              }%`,
                            }}
                            title={`初期費用他: ${formatYen(
                              (breakdown?.initial ?? 0) +
                                (breakdown?.other ?? 0)
                            )}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm bg-chart-1" />
                      <span>ローン/家賃</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm bg-chart-2" />
                      <span>修繕/管理</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm bg-chart-3" />
                      <span>光熱費</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm bg-chart-4" />
                      <span>税金</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-sm bg-chart-5" />
                      <span>初期費用他</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <p className="text-xs text-muted-foreground">
                チャートは概算。前提変更で再計算されます。
              </p>
            </CardContent>
          </Card>

          {/* Breakdown Table */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">
                内訳サマリー（{horizonYears}年）
              </h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">費目</th>
                      {availableHousing.map((housing) => (
                        <th
                          key={housing.housingType}
                          className="py-2 text-right font-medium"
                        >
                          {HOUSING_TYPE_LABELS[housing.housingType]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">初期費用</td>
                      {availableHousing.map((housing) => (
                        <td key={housing.housingType} className="py-2 text-right">
                          {formatYen(
                            lccMap.get(housing.housingType)?.summary
                              .breakdownNominalYen.initial,
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">
                        ローン / 家賃
                      </td>
                      {availableHousing.map((housing) => (
                        <td key={housing.housingType} className="py-2 text-right">
                          {formatYen(
                            lccMap.get(housing.housingType)?.summary
                              .breakdownNominalYen.loanOrRent,
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">税（概算）</td>
                      {availableHousing.map((housing) => (
                        <td key={housing.housingType} className="py-2 text-right">
                          {formatYen(
                            lccMap.get(housing.housingType)?.summary
                              .breakdownNominalYen.tax,
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">
                        修繕 / 管理費
                      </td>
                      {availableHousing.map((housing) => (
                        <td key={housing.housingType} className="py-2 text-right">
                          {formatYen(
                            lccMap.get(housing.housingType)?.summary
                              .breakdownNominalYen.repairsOrManagement,
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">光熱費</td>
                      {availableHousing.map((housing) => (
                        <td key={housing.housingType} className="py-2 text-right">
                          {formatYen(
                            lccMap.get(housing.housingType)?.summary
                              .breakdownNominalYen.utilities,
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">その他</td>
                      {availableHousing.map((housing) => (
                        <td key={housing.housingType} className="py-2 text-right">
                          {formatYen(
                            lccMap.get(housing.housingType)?.summary
                              .breakdownNominalYen.other,
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t-2 font-semibold">
                      <td className="py-2">合計</td>
                      {availableHousing.map((housing) => (
                        <td key={housing.housingType} className="py-2 text-right">
                          {formatYen(
                            lccMap.get(housing.housingType)?.summary
                              .totalNominalYen,
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assumption Callout */}
        <Alert className="mt-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="ml-2 space-y-3">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100">
              前提が重要です
            </h4>
            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
              <li>• 金利・インフレ・昇給率（シナリオ）で結果が変わります</li>
              <li>• 修繕周期・単価、光熱費係数は調整可能です</li>
              <li>• 税・制度は概算モデルです</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Button size="sm" asChild>
                <Link
                  href={buildScenarioLink(
                    `/plans/${planId}/housing/assumptions`,
                  )}
                >
                  前提を調整
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/plans/${planId}/settings`}>シナリオ設定へ</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
