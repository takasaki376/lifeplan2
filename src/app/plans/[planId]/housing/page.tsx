"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useParams,
  useRouter,
  useSearchParams,
  usePathname,
} from "next/navigation";
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
  Calendar,
  History,
  Menu,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { ScenarioKey } from "@/lib/domain/types";
import { createRepositories } from "@/lib/repo/factory";
import {
  formatScenarioLabel,
  parseScenario,
  scenarioKeys,
} from "@/lib/scenario";

// Toggle for empty state testing
const HAS_HOUSING_ASSUMPTIONS = true;

type HousingType = "high_performance_home" | "detached" | "condo" | "rent";

interface LCCBreakdown {
  initial: number;
  loanOrRent: number;
  tax: number;
  repairsOrFees: number;
  utilities: number;
  other: number;
}

interface HousingLCC {
  type: HousingType;
  name: string;
  icon: typeof Home;
  total: number;
  breakdown: LCCBreakdown;
  note: string;
}

const formatYen = (amount: number) => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
};

type HorizonYears = "30" | "35" | "40";
type ChartView = "total" | "annual" | "breakdown";

export default function HousingLCCPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const planId = params.planId as string;
  const repos = useMemo(() => createRepositories(), []);
  const tabValue = "housing";
  const [planName, setPlanName] = useState("プラン");

  const scenarioParam = searchParams.get("scenario");
  const parsedScenario = parseScenario(scenarioParam);
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>(parsedScenario);
  const [horizonYears, setHorizonYears] = useState<string>("35");
  const [selectedType, setSelectedType] = useState<HousingType | null>(
    "high_performance_home"
  );
  const [chartView, setChartView] = useState<ChartView>("total");

  useEffect(() => {
    setScenarioKey(parsedScenario);
  }, [parsedScenario]);

  useEffect(() => {
    const load = async () => {
      try {
        const plan = await repos.plan.get(planId);
        if (plan?.name) {
          setPlanName(plan.name);
        }
      } catch (error) {
        console.error(error);
      }
    };
    void load();
  }, [planId, repos]);

  // Mock LCC data per scenario
  const mockLCCData: Record<ScenarioKey, HousingLCC[]> = {
    base: [
      {
        type: "high_performance_home",
        name: "高性能住宅",
        icon: Home,
        total: 82500000,
        breakdown: {
          initial: 8500000,
          loanOrRent: 48000000,
          tax: 5200000,
          repairsOrFees: 8300000,
          utilities: 10500000,
          other: 2000000,
        },
        note: "光熱費係数・修繕周期は前提で調整",
      },
      {
        type: "detached",
        name: "一般戸建",
        icon: Building2,
        total: 98000000,
        breakdown: {
          initial: 9000000,
          loanOrRent: 52000000,
          tax: 6800000,
          repairsOrFees: 12500000,
          utilities: 15200000,
          other: 2500000,
        },
        note: "修繕費・光熱費は前提で調整",
      },
      {
        type: "condo",
        name: "分譲マンション",
        icon: Building,
        total: 105000000,
        breakdown: {
          initial: 10000000,
          loanOrRent: 55000000,
          tax: 7200000,
          repairsOrFees: 18000000,
          utilities: 12800000,
          other: 2000000,
        },
        note: "修繕積立金・管理費は前提で調整",
      },
      {
        type: "rent",
        name: "賃貸",
        icon: KeyRound,
        total: 110000000,
        breakdown: {
          initial: 1200000,
          loanOrRent: 92400000,
          tax: 0,
          repairsOrFees: 2800000,
          utilities: 12600000,
          other: 1000000,
        },
        note: "家賃上昇・更新料は前提で調整",
      },
    ],
    conservative: [
      {
        type: "high_performance_home",
        name: "高性能住宅",
        icon: Home,
        total: 92000000,
        breakdown: {
          initial: 9000000,
          loanOrRent: 52000000,
          tax: 6000000,
          repairsOrFees: 10000000,
          utilities: 12500000,
          other: 2500000,
        },
        note: "光熱費係数・修繕周期は前提で調整",
      },
      {
        type: "detached",
        name: "一般戸建",
        icon: Building2,
        total: 110000000,
        breakdown: {
          initial: 10000000,
          loanOrRent: 58000000,
          tax: 7500000,
          repairsOrFees: 15000000,
          utilities: 17000000,
          other: 2500000,
        },
        note: "修繕費・光熱費は前提で調整",
      },
      {
        type: "condo",
        name: "分譲マンション",
        icon: Building,
        total: 118000000,
        breakdown: {
          initial: 11000000,
          loanOrRent: 61000000,
          tax: 8000000,
          repairsOrFees: 21000000,
          utilities: 14500000,
          other: 2500000,
        },
        note: "修繕積立金・管理費は前提で調整",
      },
      {
        type: "rent",
        name: "賃貸",
        icon: KeyRound,
        total: 125000000,
        breakdown: {
          initial: 1500000,
          loanOrRent: 105000000,
          tax: 0,
          repairsOrFees: 3500000,
          utilities: 14000000,
          other: 1000000,
        },
        note: "家賃上昇・更新料は前提で調整",
      },
    ],
    optimistic: [
      {
        type: "high_performance_home",
        name: "高性能住宅",
        icon: Home,
        total: 75000000,
        breakdown: {
          initial: 8000000,
          loanOrRent: 45000000,
          tax: 4500000,
          repairsOrFees: 7000000,
          utilities: 9000000,
          other: 1500000,
        },
        note: "光熱費係数・修繕周期は前提で調整",
      },
      {
        type: "detached",
        name: "一般戸建",
        icon: Building2,
        total: 88000000,
        breakdown: {
          initial: 8500000,
          loanOrRent: 48000000,
          tax: 6000000,
          repairsOrFees: 10500000,
          utilities: 13500000,
          other: 1500000,
        },
        note: "修繕費・光熱費は前提で調整",
      },
      {
        type: "condo",
        name: "分譲マンション",
        icon: Building,
        total: 95000000,
        breakdown: {
          initial: 9500000,
          loanOrRent: 52000000,
          tax: 6500000,
          repairsOrFees: 16000000,
          utilities: 10000000,
          other: 1000000,
        },
        note: "修繕積立金・管理費は前提で調整",
      },
      {
        type: "rent",
        name: "賃貸",
        icon: KeyRound,
        total: 98000000,
        breakdown: {
          initial: 1000000,
          loanOrRent: 82000000,
          tax: 0,
          repairsOrFees: 2500000,
          utilities: 11500000,
          other: 1000000,
        },
        note: "家賃上昇・更新料は前提で調整",
      },
    ],
  };

  const currentData = mockLCCData[scenarioKey];
  const selectedHousing = currentData.find((h) => h.type === selectedType);

  const handleScenarioChange = (value: ScenarioKey) => {
    if (value === scenarioKey) return;
    setScenarioKey(value);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("scenario", value);
    const query = nextParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    void router.replace(nextUrl);
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

  if (!HAS_HOUSING_ASSUMPTIONS) {
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
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">
              住宅の生涯コスト（LCC）比較
            </h1>
            <p className="text-muted-foreground">
              前提を変えると結果も変わります。単発の答えではなく、見直しながら使う比較です。
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b bg-card mb-6">
            <div className="px-4 sm:px-6">
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
                        <Home className="h-4 w-4" />
                        住宅LCC
                      </span>
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuItem
                      onSelect={() => handleTabChange("dashboard")}
                    >
                      <Home className="mr-2 h-4 w-4" />
                      ダッシュボード
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleTabChange("monthly")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      月次
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleTabChange("housing")}
                    >
                      <Home className="mr-2 h-4 w-4" />
                      住宅LCC
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleTabChange("events")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      イベント
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleTabChange("versions")}
                    >
                      <History className="mr-2 h-4 w-4" />
                      見直し（改定）
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <Card className="border-2 border-dashed">
            <CardContent className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-12 text-center">
              <div className="rounded-full bg-muted p-6">
                <Home className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  住宅前提が未設定です
                </h3>
                <p className="mb-6 text-muted-foreground">
                  まずは住宅タイプを選び、ざっくり前提を設定しましょう
                </p>
                <Button asChild size="lg">
                  <Link href={`/plans/${planId}/housing/assumptions`}>
                    前提を設定する
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
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
              value={scenarioKey}
              onValueChange={(value) =>
                handleScenarioChange(value as ScenarioKey)
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
              <Link href={`/plans/${planId}/housing/assumptions`}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                前提を調整
              </Link>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b bg-card mb-6">
          <div className="px-4 sm:px-6">
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
                      <Home className="h-4 w-4" />
                      住宅LCC
                    </span>
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem
                    onSelect={() => handleTabChange("dashboard")}
                  >
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
                  <DropdownMenuItem
                    onSelect={() => handleTabChange("versions")}
                  >
                    <History className="mr-2 h-4 w-4" />
                    見直し（改定）
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Summary Strip */}
        <Card className="mb-6">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                選択中の住宅:
              </span>
              {selectedType ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {currentData.find((h) => h.type === selectedType)?.name}
                </Badge>
              ) : (
                <Badge variant="outline">未選択</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {horizonYears}年累計 LCC（{formatScenarioLabel(scenarioKey)}）:
              </span>
              <span className="text-lg font-bold">
                {selectedHousing
                  ? formatYen(selectedHousing.total)
                  : formatYen(currentData[0].total)}
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
              {!selectedType && (
                <Button size="sm" variant="outline">
                  住宅タイプを選択
                </Button>
              )}
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/plans/${planId}`}>ダッシュボードへ戻る</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {currentData.map((housing) => {
            const Icon = housing.icon;
            const isSelected = selectedType === housing.type;
            const breakdownItems = [
              {
                label: housing.type === "rent" ? "家賃" : "ローン",
                value: housing.breakdown.loanOrRent,
                percent: (housing.breakdown.loanOrRent / housing.total) * 100,
              },
              {
                label:
                  housing.type === "condo"
                    ? "修繕積立/管理費"
                    : housing.type === "rent"
                    ? "更新料"
                    : "修繕",
                value: housing.breakdown.repairsOrFees,
                percent:
                  (housing.breakdown.repairsOrFees / housing.total) * 100,
              },
              {
                label: "光熱費",
                value: housing.breakdown.utilities,
                percent: (housing.breakdown.utilities / housing.total) * 100,
              },
            ];

            return (
              <Card
                key={housing.type}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : ""
                }`}
                onClick={() => setSelectedType(housing.type)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">{housing.name}</h3>
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
                      {formatYen(housing.total)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {breakdownItems.map((item, idx) => (
                      <div key={idx} className="space-y-1">
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

                  <p className="text-xs text-muted-foreground">
                    {housing.note}
                  </p>
                </CardContent>
                <CardFooter className="flex gap-2 pt-3">
                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedType(housing.type);
                    }}
                    className="flex-1"
                  >
                    {isSelected ? "選択中" : "このタイプを選択"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/plans/${planId}/housing/${housing.type}`}>
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
                      href={`/plans/${planId}/housing/assumptions?type=${housing.type}`}
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
                  {currentData.map((housing) => {
                    const maxTotal = Math.max(
                      ...currentData.map((h) => h.total)
                    );
                    const percent = (housing.total / maxTotal) * 100;
                    const isSelected = selectedType === housing.type;

                    return (
                      <div key={housing.type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={
                              isSelected
                                ? "font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {housing.name}
                          </span>
                          <span className="font-medium">
                            {formatYen(housing.total)}
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
                  {currentData.map((housing) => {
                    const annualAvg =
                      housing.total / Number.parseInt(horizonYears);
                    const maxAnnual = Math.max(
                      ...currentData.map(
                        (h) => h.total / Number.parseInt(horizonYears)
                      )
                    );
                    const percent = (annualAvg / maxAnnual) * 100;
                    const isSelected = selectedType === housing.type;

                    return (
                      <div key={housing.type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={
                              isSelected
                                ? "font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {housing.name}
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
                  {currentData.map((housing) => {
                    const isSelected = selectedType === housing.type;

                    return (
                      <div key={housing.type} className="space-y-1">
                        <div className="text-sm font-medium">
                          {housing.name}
                        </div>
                        <div className="flex h-8 w-full overflow-hidden rounded-md">
                          <div
                            className="bg-chart-1"
                            style={{
                              width: `${
                                (housing.breakdown.loanOrRent / housing.total) *
                                100
                              }%`,
                            }}
                            title={`${
                              housing.type === "rent" ? "家賃" : "ローン"
                            }: ${formatYen(housing.breakdown.loanOrRent)}`}
                          />
                          <div
                            className="bg-chart-2"
                            style={{
                              width: `${
                                (housing.breakdown.repairsOrFees /
                                  housing.total) *
                                100
                              }%`,
                            }}
                            title={`修繕/管理: ${formatYen(
                              housing.breakdown.repairsOrFees
                            )}`}
                          />
                          <div
                            className="bg-chart-3"
                            style={{
                              width: `${
                                (housing.breakdown.utilities / housing.total) *
                                100
                              }%`,
                            }}
                            title={`光熱費: ${formatYen(
                              housing.breakdown.utilities
                            )}`}
                          />
                          <div
                            className="bg-chart-4"
                            style={{
                              width: `${
                                (housing.breakdown.tax / housing.total) * 100
                              }%`,
                            }}
                            title={`税金: ${formatYen(housing.breakdown.tax)}`}
                          />
                          <div
                            className="bg-chart-5"
                            style={{
                              width: `${
                                ((housing.breakdown.initial +
                                  housing.breakdown.other) /
                                  housing.total) *
                                100
                              }%`,
                            }}
                            title={`初期費用他: ${formatYen(
                              housing.breakdown.initial +
                                housing.breakdown.other
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
                      {currentData.map((housing) => (
                        <th
                          key={housing.type}
                          className="py-2 text-right font-medium"
                        >
                          {housing.name.includes("HOME")
                            ? "高性能住宅"
                            : housing.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">初期費用</td>
                      {currentData.map((housing) => (
                        <td key={housing.type} className="py-2 text-right">
                          {formatYen(housing.breakdown.initial)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">
                        ローン / 家賃
                      </td>
                      {currentData.map((housing) => (
                        <td key={housing.type} className="py-2 text-right">
                          {formatYen(housing.breakdown.loanOrRent)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">税（概算）</td>
                      {currentData.map((housing) => (
                        <td key={housing.type} className="py-2 text-right">
                          {formatYen(housing.breakdown.tax)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">
                        修繕 / 管理費
                      </td>
                      {currentData.map((housing) => (
                        <td key={housing.type} className="py-2 text-right">
                          {formatYen(housing.breakdown.repairsOrFees)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-muted-foreground">光熱費</td>
                      {currentData.map((housing) => (
                        <td key={housing.type} className="py-2 text-right">
                          {formatYen(housing.breakdown.utilities)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t-2 font-semibold">
                      <td className="py-2">合計</td>
                      {currentData.map((housing) => (
                        <td key={housing.type} className="py-2 text-right">
                          {formatYen(housing.total)}
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
                <Link href={`/plans/${planId}/housing/assumptions`}>
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
