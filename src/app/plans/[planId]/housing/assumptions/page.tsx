"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Home,
  Building2,
  Building,
  KeyRound,
  SlidersHorizontal,
  Save,
  RotateCcw,
  Info,
  AlertTriangle,
  Flame,
  Receipt,
  Wrench,
  PiggyBank,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
// import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

// Toggle this to simulate first-time vs existing assumptions state
const HAS_ASSUMPTIONS = true;

type HousingType = "wellnest" | "detached" | "condo" | "rent";
type EditMode = "simple" | "advanced";
type Scenario = "conservative" | "base" | "optimistic";
type Preset = "base" | "conservative" | "optimistic";

interface RepairItem {
  id: string;
  cycle: number;
  amount: number;
  memo: string;
}

interface Assumptions {
  initialCost: number;
  loanAmount: number;
  interestRate: number;
  loanYears: number;
  propertyTax: number;
  repairCostYearly: number;
  utilityBase: number;
  utilityCoefficient: number;
  managementFee?: number;
  repairReserve?: number;
  parkingFee?: number;
  rent?: number;
  rentIncrease?: number;
  renewalFee?: number;
  renewalCycle?: number;
  movingCost?: number;
  repairSchedule?: RepairItem[];
  downPayment?: number;
  fees?: number;
  isSelected: boolean;
}

const HOUSING_TYPES = [
  { id: "wellnest" as HousingType, label: "WELLNEST HOME", icon: Home },
  { id: "detached" as HousingType, label: "一般戸建", icon: Home },
  { id: "condo" as HousingType, label: "分譲マンション", icon: Building2 },
  { id: "rent" as HousingType, label: "賃貸", icon: Building },
];

const DEFAULT_ASSUMPTIONS: Record<HousingType, Assumptions> = {
  wellnest: {
    initialCost: 5000000,
    loanAmount: 35000000,
    interestRate: 1.2,
    loanYears: 35,
    propertyTax: 150000,
    repairCostYearly: 200000,
    utilityBase: 18000,
    utilityCoefficient: 0.85,
    repairSchedule: [
      { id: "1", cycle: 10, amount: 1500000, memo: "外壁塗装" },
      { id: "2", cycle: 20, amount: 2000000, memo: "屋根・設備交換" },
    ],
    isSelected: true,
  },
  detached: {
    initialCost: 4500000,
    loanAmount: 35000000,
    interestRate: 1.5,
    loanYears: 35,
    propertyTax: 140000,
    repairCostYearly: 300000,
    utilityBase: 20000,
    utilityCoefficient: 1.0,
    repairSchedule: [
      { id: "1", cycle: 10, amount: 2000000, memo: "外壁・屋根" },
      { id: "2", cycle: 20, amount: 2500000, memo: "設備交換" },
    ],
    isSelected: false,
  },
  condo: {
    initialCost: 3000000,
    loanAmount: 35000000,
    interestRate: 1.3,
    loanYears: 35,
    propertyTax: 120000,
    repairCostYearly: 0,
    utilityBase: 16000,
    utilityCoefficient: 0.95,
    managementFee: 15000,
    repairReserve: 12000,
    parkingFee: 10000,
    repairSchedule: [
      { id: "1", cycle: 12, amount: 1000000, memo: "大規模修繕一時金" },
    ],
    isSelected: false,
  },
  rent: {
    initialCost: 500000,
    loanAmount: 0,
    interestRate: 0,
    loanYears: 0,
    propertyTax: 0,
    repairCostYearly: 0,
    utilityBase: 18000,
    utilityCoefficient: 1.0,
    rent: 120000,
    rentIncrease: 1.5,
    renewalFee: 120000,
    renewalCycle: 2,
    movingCost: 300000,
    isSelected: false,
  },
};

export default function HousingAssumptionsPage() {
  const router = useRouter();
  const params = useParams();
  //   const { toast } = useToast();

  const planId = params.planId as string;
  const [activeType, setActiveType] = useState<HousingType>("wellnest");
  const [editMode, setEditMode] = useState<EditMode>("simple");
  const [scenario, setScenario] = useState<Scenario>("base");
  const [horizonYears, setHorizonYears] = useState(35);
  const [isDirty, setIsDirty] = useState(false);
  const [assumptions, setAssumptions] =
    useState<Record<HousingType, Assumptions>>(DEFAULT_ASSUMPTIONS);
  const [selectedPreset, setSelectedPreset] = useState<Preset>("base");

  const currentAssumptions = assumptions[activeType];

  const formatYen = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateLCC = () => {
    const a = currentAssumptions;
    const years = horizonYears;

    let totalLCC = a.initialCost;

    if (activeType === "rent") {
      const baseRent = (a.rent || 0) * 12;
      const rentGrowth = 1 + (a.rentIncrease || 0) / 100;
      for (let i = 0; i < years; i++) {
        totalLCC += baseRent * Math.pow(rentGrowth, i);
      }
      totalLCC += ((a.renewalFee || 0) * years) / (a.renewalCycle || 2);
      totalLCC += (a.movingCost || 0) * Math.floor(years / 10);
      totalLCC += a.utilityBase * 12 * a.utilityCoefficient * years;
    } else {
      // Loan
      const monthlyPayment =
        a.loanAmount > 0
          ? (a.loanAmount *
              (a.interestRate / 100 / 12) *
              Math.pow(1 + a.interestRate / 100 / 12, a.loanYears * 12)) /
            (Math.pow(1 + a.interestRate / 100 / 12, a.loanYears * 12) - 1)
          : 0;
      totalLCC += monthlyPayment * Math.min(years, a.loanYears) * 12;

      // Tax
      totalLCC += a.propertyTax * years;

      // Repair/Management
      totalLCC += a.repairCostYearly * years;
      if (a.managementFee) totalLCC += a.managementFee * 12 * years;
      if (a.repairReserve) totalLCC += a.repairReserve * 12 * years;
      if (a.parkingFee) totalLCC += a.parkingFee * 12 * years;

      // Utility
      totalLCC += a.utilityBase * 12 * a.utilityCoefficient * years;
    }

    return Math.round(totalLCC);
  };

  const calculateBreakdown = () => {
    const a = currentAssumptions;
    const years = horizonYears;

    if (activeType === "rent") {
      const baseRent = (a.rent || 0) * 12;
      const rentGrowth = 1 + (a.rentIncrease || 0) / 100;
      let rentTotal = 0;
      for (let i = 0; i < years; i++) {
        rentTotal += baseRent * Math.pow(rentGrowth, i);
      }

      return {
        initial: a.initialCost,
        loanRent:
          rentTotal + ((a.renewalFee || 0) * years) / (a.renewalCycle || 2),
        tax: 0,
        repair: (a.movingCost || 0) * Math.floor(years / 10),
        utility: a.utilityBase * 12 * a.utilityCoefficient * years,
      };
    }

    const monthlyPayment =
      a.loanAmount > 0
        ? (a.loanAmount *
            (a.interestRate / 100 / 12) *
            Math.pow(1 + a.interestRate / 100 / 12, a.loanYears * 12)) /
          (Math.pow(1 + a.interestRate / 100 / 12, a.loanYears * 12) - 1)
        : 0;

    let repairTotal = a.repairCostYearly * years;
    if (a.managementFee) repairTotal += a.managementFee * 12 * years;
    if (a.repairReserve) repairTotal += a.repairReserve * 12 * years;
    if (a.parkingFee) repairTotal += a.parkingFee * 12 * years;

    return {
      initial: a.initialCost,
      loanRent: monthlyPayment * Math.min(years, a.loanYears) * 12,
      tax: a.propertyTax * years,
      repair: repairTotal,
      utility: a.utilityBase * 12 * a.utilityCoefficient * years,
    };
  };

  const breakdown = calculateBreakdown();

  const updateAssumption = (
    key: keyof Assumptions,
    value: Assumptions[keyof Assumptions]
  ) => {
    setAssumptions((prev) => ({
      ...prev,
      [activeType]: { ...prev[activeType], [key]: value },
    }));
    setIsDirty(true);
  };

  const applyPreset = (preset: Preset) => {
    const multiplier =
      preset === "conservative" ? 1.15 : preset === "optimistic" ? 0.85 : 1.0;
    const baseAssumptions = DEFAULT_ASSUMPTIONS[activeType];

    setAssumptions((prev) => ({
      ...prev,
      [activeType]: {
        ...baseAssumptions,
        initialCost: Math.round(baseAssumptions.initialCost * multiplier),
        loanAmount: baseAssumptions.loanAmount,
        interestRate: baseAssumptions.interestRate * multiplier,
        propertyTax: Math.round(baseAssumptions.propertyTax * multiplier),
        repairCostYearly: Math.round(
          baseAssumptions.repairCostYearly * multiplier
        ),
        utilityBase: Math.round(baseAssumptions.utilityBase * multiplier),
        managementFee: baseAssumptions.managementFee
          ? Math.round(baseAssumptions.managementFee * multiplier)
          : undefined,
        repairReserve: baseAssumptions.repairReserve
          ? Math.round(baseAssumptions.repairReserve * multiplier)
          : undefined,
        rent: baseAssumptions.rent
          ? Math.round(baseAssumptions.rent * multiplier)
          : undefined,
        isSelected: prev[activeType].isSelected,
      },
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    // toast({
    //   title: "保存しました",
    //   description: "前提が更新されました",
    // });
    toast("保存しました", {
      description: "前提が更新されました",
    });
    setIsDirty(false);
  };

  const handleReset = () => {
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setIsDirty(false);
    // toast({
    //   title: "元に戻しました",
    //   description: "前回保存時の状態に戻しました",
    // });
    toast("元に戻しました", {
      description: "前回保存時の状態に戻しました",
    });
  };

  const addRepairItem = () => {
    const newItem: RepairItem = {
      id: Date.now().toString(),
      cycle: 10,
      amount: 1000000,
      memo: "",
    };
    setAssumptions((prev) => ({
      ...prev,
      [activeType]: {
        ...prev[activeType],
        repairSchedule: [...(prev[activeType].repairSchedule || []), newItem],
      },
    }));
    setIsDirty(true);
  };

  const removeRepairItem = (id: string) => {
    setAssumptions((prev) => ({
      ...prev,
      [activeType]: {
        ...prev[activeType],
        repairSchedule:
          prev[activeType].repairSchedule?.filter((item) => item.id !== id) ||
          [],
      },
    }));
    setIsDirty(true);
  };

  const updateRepairItem = (
    id: string,
    key: keyof RepairItem,
    value: RepairItem[keyof RepairItem]
  ) => {
    setAssumptions((prev) => ({
      ...prev,
      [activeType]: {
        ...prev[activeType],
        repairSchedule:
          prev[activeType].repairSchedule?.map((item) =>
            item.id === id ? { ...item, [key]: value } : item
          ) || [],
      },
    }));
    setIsDirty(true);
  };

  if (!HAS_ASSUMPTIONS) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-4xl p-6">
          <Card className="mt-12">
            <CardHeader>
              <CardTitle className="text-2xl">前提を設定しましょう</CardTitle>
              <CardDescription>
                まずは「かんたん」でざっくり設定しましょう。わからない項目はあとで変更できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                onClick={() => {
                  setAssumptions(DEFAULT_ASSUMPTIONS);
                  toast("標準プリセットを適用しました", {});
                }}
              >
                標準プリセットを適用
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/plans/${planId}/housing`)}
              >
                あとで設定する（比較へ）
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-6 py-4">
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
              我が家のライフプラン
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/plans/${planId}/housing`}
              className="hover:text-foreground transition-colors"
            >
              住宅LCC
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">前提</span>
          </div>

          {/* Title & Actions */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                住宅LCC 前提の編集
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                数値は概算でOK。前提を変えると結果も変わります。
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isDirty && <Badge variant="outline">変更があります</Badge>}
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                元に戻す
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/plans/${planId}/housing`)}
              >
                比較へ戻る
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Editor */}
          <div className="lg:col-span-8">
            <Card>
              <CardHeader>
                <Tabs
                  value={activeType}
                  onValueChange={(v) => setActiveType(v as HousingType)}
                >
                  <TabsList className="grid w-full grid-cols-4">
                    {HOUSING_TYPES.map((type) => (
                      <TabsTrigger
                        key={type.id}
                        value={type.id}
                        className="gap-2"
                      >
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="mt-4 flex items-center justify-between">
                  <Tabs
                    value={editMode}
                    onValueChange={(v) => setEditMode(v as EditMode)}
                  >
                    <TabsList>
                      <TabsTrigger value="simple">かんたん</TabsTrigger>
                      <TabsTrigger value="advanced">詳細</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentAssumptions.isSelected}
                      onCheckedChange={(checked) =>
                        updateAssumption("isSelected", checked)
                      }
                    />
                    <Label className="text-sm">
                      この住宅タイプを選択中にする
                    </Label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {editMode === "simple" ? (
                  <>
                    {/* Simple Mode */}
                    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          おすすめプリセット
                        </span>
                      </div>
                      <Select
                        value={selectedPreset}
                        onValueChange={(v) => {
                          setSelectedPreset(v as Preset);
                          applyPreset(v as Preset);
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="base">標準（おすすめ）</SelectItem>
                          <SelectItem value="conservative">
                            保守（高めに見積もる）
                          </SelectItem>
                          <SelectItem value="optimistic">
                            楽観（低めに見積もる）
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Common Simple Fields */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold">初期費用</h3>
                      </div>
                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="initialCost">初期費用（合計）</Label>
                          <div className="relative">
                            <Input
                              id="initialCost"
                              type="number"
                              value={currentAssumptions.initialCost}
                              onChange={(e) =>
                                updateAssumption(
                                  "initialCost",
                                  Number(e.target.value)
                                )
                              }
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              円
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Type-Specific Simple Fields */}
                    {activeType === "rent" ? (
                      <>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">家賃</h3>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="rent">家賃（月）</Label>
                              <div className="relative">
                                <Input
                                  id="rent"
                                  type="number"
                                  value={currentAssumptions.rent || 0}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "rent",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="rentIncrease">
                                家賃上昇率（年）
                              </Label>
                              <div className="relative">
                                <Input
                                  id="rentIncrease"
                                  type="number"
                                  step="0.1"
                                  value={currentAssumptions.rentIncrease || 0}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "rentIncrease",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="renewalFee">更新料</Label>
                              <div className="relative">
                                <Input
                                  id="renewalFee"
                                  type="number"
                                  value={currentAssumptions.renewalFee || 0}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "renewalFee",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="renewalCycle">更新周期</Label>
                              <div className="relative">
                                <Input
                                  id="renewalCycle"
                                  type="number"
                                  value={currentAssumptions.renewalCycle || 0}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "renewalCycle",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  年
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="movingCost">引越費用</Label>
                              <div className="relative">
                                <Input
                                  id="movingCost"
                                  type="number"
                                  value={currentAssumptions.movingCost || 0}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "movingCost",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : activeType === "condo" ? (
                      <>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">住宅ローン</h3>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="loanAmount">借入額</Label>
                              <div className="relative">
                                <Input
                                  id="loanAmount"
                                  type="number"
                                  value={currentAssumptions.loanAmount}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "loanAmount",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="interestRate">金利</Label>
                              <div className="relative">
                                <Input
                                  id="interestRate"
                                  type="number"
                                  step="0.1"
                                  value={currentAssumptions.interestRate}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "interestRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="loanYears">返済期間</Label>
                              <div className="relative">
                                <Input
                                  id="loanYears"
                                  type="number"
                                  value={currentAssumptions.loanYears}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "loanYears",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  年
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">管理・修繕</h3>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="managementFee">
                                管理費（月）
                              </Label>
                              <div className="relative">
                                <Input
                                  id="managementFee"
                                  type="number"
                                  value={currentAssumptions.managementFee || 0}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "managementFee",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="repairReserve">
                                修繕積立金（月）
                              </Label>
                              <div className="relative">
                                <Input
                                  id="repairReserve"
                                  type="number"
                                  value={currentAssumptions.repairReserve || 0}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "repairReserve",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="parkingFee">駐車場（月）</Label>
                              <div className="relative">
                                <Input
                                  id="parkingFee"
                                  type="number"
                                  value={currentAssumptions.parkingFee || 0}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "parkingFee",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Wellnest / Detached */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">住宅ローン</h3>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="loanAmount">借入額</Label>
                              <div className="relative">
                                <Input
                                  id="loanAmount"
                                  type="number"
                                  value={currentAssumptions.loanAmount}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "loanAmount",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="interestRate">金利</Label>
                              <div className="relative">
                                <Input
                                  id="interestRate"
                                  type="number"
                                  step="0.1"
                                  value={currentAssumptions.interestRate}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "interestRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="loanYears">返済期間</Label>
                              <div className="relative">
                                <Input
                                  id="loanYears"
                                  type="number"
                                  value={currentAssumptions.loanYears}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "loanYears",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  年
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">修繕</h3>
                          </div>
                          <div className="grid gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="repairCostYearly">
                                修繕（年平均）
                              </Label>
                              <div className="relative">
                                <Input
                                  id="repairCostYearly"
                                  type="number"
                                  value={currentAssumptions.repairCostYearly}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "repairCostYearly",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {activeType !== "rent" && (
                      <>
                        <Separator />

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">税（概算）</h3>
                          </div>
                          <div className="grid gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="propertyTax">
                                固定資産税（年）
                              </Label>
                              <div className="relative">
                                <Input
                                  id="propertyTax"
                                  type="number"
                                  value={currentAssumptions.propertyTax}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "propertyTax",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Utility (Common) */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold">光熱費</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="utilityBase">光熱費（基準/月）</Label>
                          <div className="relative">
                            <Input
                              id="utilityBase"
                              type="number"
                              value={currentAssumptions.utilityBase}
                              onChange={(e) =>
                                updateAssumption(
                                  "utilityBase",
                                  Number(e.target.value)
                                )
                              }
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              円
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="utilityCoefficient">光熱費係数</Label>
                          <div className="relative">
                            <Input
                              id="utilityCoefficient"
                              type="number"
                              step="0.01"
                              value={currentAssumptions.utilityCoefficient}
                              onChange={(e) =>
                                updateAssumption(
                                  "utilityCoefficient",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            例: 0.85（高性能） / 1.0（標準）
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Advanced Mode */}
                    <div className="rounded-lg border bg-blue-50 p-3 dark:bg-blue-950/20">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          詳細はわからなければ触らなくてOK。かんたんモードで十分です。
                        </p>
                      </div>
                    </div>

                    <Accordion type="multiple" className="space-y-2">
                      {/* Initial Cost Details */}
                      <AccordionItem
                        value="initial"
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <PiggyBank className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              初期費用（内訳）
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="downPayment">頭金</Label>
                            <div className="relative">
                              <Input
                                id="downPayment"
                                type="number"
                                value={currentAssumptions.downPayment || 0}
                                onChange={(e) =>
                                  updateAssumption(
                                    "downPayment",
                                    Number(e.target.value)
                                  )
                                }
                                className="pr-12"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                円
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="fees">諸費用</Label>
                            <div className="relative">
                              <Input
                                id="fees"
                                type="number"
                                value={currentAssumptions.fees || 0}
                                onChange={(e) =>
                                  updateAssumption(
                                    "fees",
                                    Number(e.target.value)
                                  )
                                }
                                className="pr-12"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                円
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="initialCostAdv">初期費用合計</Label>
                            <div className="relative">
                              <Input
                                id="initialCostAdv"
                                type="number"
                                value={currentAssumptions.initialCost}
                                onChange={(e) =>
                                  updateAssumption(
                                    "initialCost",
                                    Number(e.target.value)
                                  )
                                }
                                className="pr-12"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                円
                              </span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Loan Details (Non-rent only) */}
                      {activeType !== "rent" && (
                        <AccordionItem
                          value="loan"
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <KeyRound className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">ローン詳細</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="loanAmountAdv">借入元本</Label>
                              <div className="relative">
                                <Input
                                  id="loanAmountAdv"
                                  type="number"
                                  value={currentAssumptions.loanAmount}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "loanAmount",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="interestRateAdv">金利</Label>
                              <div className="relative">
                                <Input
                                  id="interestRateAdv"
                                  type="number"
                                  step="0.1"
                                  value={currentAssumptions.interestRate}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "interestRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="loanMonths">期間（月）</Label>
                              <div className="relative">
                                <Input
                                  id="loanMonths"
                                  type="number"
                                  value={currentAssumptions.loanYears * 12}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "loanYears",
                                      Number(e.target.value) / 12
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  月
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="repaymentType">返済方式</Label>
                              <Select defaultValue="equal-payment">
                                <SelectTrigger id="repaymentType">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equal-payment">
                                    元利均等
                                  </SelectItem>
                                  <SelectItem value="equal-principal">
                                    元金均等
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Tax Details (Non-rent only) */}
                      {activeType !== "rent" && (
                        <AccordionItem
                          value="tax"
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">税（概算）</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="propertyTaxAdv">
                                固定資産税（年）
                              </Label>
                              <div className="relative">
                                <Input
                                  id="propertyTaxAdv"
                                  type="number"
                                  value={currentAssumptions.propertyTax}
                                  onChange={(e) =>
                                    updateAssumption(
                                      "propertyTax",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  円
                                </span>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Repair/Management Details */}
                      <AccordionItem
                        value="repair"
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {activeType === "condo"
                                ? "管理・修繕"
                                : activeType === "rent"
                                ? "家賃"
                                : "修繕"}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-4">
                          {activeType === "rent" ? (
                            <>
                              <div className="space-y-1.5">
                                <Label htmlFor="rentAdv">家賃（月）</Label>
                                <div className="relative">
                                  <Input
                                    id="rentAdv"
                                    type="number"
                                    value={currentAssumptions.rent || 0}
                                    onChange={(e) =>
                                      updateAssumption(
                                        "rent",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    円
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="rentIncreaseAdv">
                                  家賃上昇率（年）
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="rentIncreaseAdv"
                                    type="number"
                                    step="0.1"
                                    value={currentAssumptions.rentIncrease || 0}
                                    onChange={(e) =>
                                      updateAssumption(
                                        "rentIncrease",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    %
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="renewalFeeAdv">更新料</Label>
                                <div className="relative">
                                  <Input
                                    id="renewalFeeAdv"
                                    type="number"
                                    value={currentAssumptions.renewalFee || 0}
                                    onChange={(e) =>
                                      updateAssumption(
                                        "renewalFee",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    円
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="renewalCycleAdv">
                                  更新周期
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="renewalCycleAdv"
                                    type="number"
                                    value={currentAssumptions.renewalCycle || 0}
                                    onChange={(e) =>
                                      updateAssumption(
                                        "renewalCycle",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    年
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="movingCostAdv">引越費用</Label>
                                <div className="relative">
                                  <Input
                                    id="movingCostAdv"
                                    type="number"
                                    value={currentAssumptions.movingCost || 0}
                                    onChange={(e) =>
                                      updateAssumption(
                                        "movingCost",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    円
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : activeType === "condo" ? (
                            <>
                              <div className="space-y-1.5">
                                <Label htmlFor="managementFeeAdv">
                                  管理費（月）
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="managementFeeAdv"
                                    type="number"
                                    value={
                                      currentAssumptions.managementFee || 0
                                    }
                                    onChange={(e) =>
                                      updateAssumption(
                                        "managementFee",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    円
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="repairReserveAdv">
                                  修繕積立（月）
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="repairReserveAdv"
                                    type="number"
                                    value={
                                      currentAssumptions.repairReserve || 0
                                    }
                                    onChange={(e) =>
                                      updateAssumption(
                                        "repairReserve",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    円
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="parkingFeeAdv">
                                  駐車場（月）
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="parkingFeeAdv"
                                    type="number"
                                    value={currentAssumptions.parkingFee || 0}
                                    onChange={(e) =>
                                      updateAssumption(
                                        "parkingFee",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="pr-12"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                    円
                                  </span>
                                </div>
                              </div>

                              <Separator />

                              <div>
                                <div className="mb-2 flex items-center justify-between">
                                  <Label>一時金（大規模修繕等）</Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addRepairItem}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    行を追加
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {currentAssumptions.repairSchedule?.map(
                                    (item) => (
                                      <div
                                        key={item.id}
                                        className="grid grid-cols-12 gap-2 items-start"
                                      >
                                        <div className="col-span-3">
                                          <Input
                                            type="number"
                                            placeholder="周期"
                                            value={item.cycle}
                                            onChange={(e) =>
                                              updateRepairItem(
                                                item.id,
                                                "cycle",
                                                Number(e.target.value)
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="col-span-4">
                                          <Input
                                            type="number"
                                            placeholder="金額"
                                            value={item.amount}
                                            onChange={(e) =>
                                              updateRepairItem(
                                                item.id,
                                                "amount",
                                                Number(e.target.value)
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="col-span-4">
                                          <Input
                                            placeholder="メモ"
                                            value={item.memo}
                                            onChange={(e) =>
                                              updateRepairItem(
                                                item.id,
                                                "memo",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="col-span-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              removeRepairItem(item.id)
                                            }
                                            className="h-10 w-10"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <div className="mb-2 flex items-center justify-between">
                                  <Label>修繕スケジュール</Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addRepairItem}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    行を追加
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {currentAssumptions.repairSchedule?.map(
                                    (item) => (
                                      <div
                                        key={item.id}
                                        className="grid grid-cols-12 gap-2 items-start"
                                      >
                                        <div className="col-span-3">
                                          <Input
                                            type="number"
                                            placeholder="周期（年）"
                                            value={item.cycle}
                                            onChange={(e) =>
                                              updateRepairItem(
                                                item.id,
                                                "cycle",
                                                Number(e.target.value)
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="col-span-4">
                                          <Input
                                            type="number"
                                            placeholder="金額（円）"
                                            value={item.amount}
                                            onChange={(e) =>
                                              updateRepairItem(
                                                item.id,
                                                "amount",
                                                Number(e.target.value)
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="col-span-4">
                                          <Input
                                            placeholder="メモ"
                                            value={item.memo}
                                            onChange={(e) =>
                                              updateRepairItem(
                                                item.id,
                                                "memo",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="col-span-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              removeRepairItem(item.id)
                                            }
                                            className="h-10 w-10"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      {/* Utility Details */}
                      <AccordionItem
                        value="utility"
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Flame className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">光熱費</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="utilityBaseAdv">
                              基準光熱費（月）
                            </Label>
                            <div className="relative">
                              <Input
                                id="utilityBaseAdv"
                                type="number"
                                value={currentAssumptions.utilityBase}
                                onChange={(e) =>
                                  updateAssumption(
                                    "utilityBase",
                                    Number(e.target.value)
                                  )
                                }
                                className="pr-12"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                円
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="utilityCoefficientAdv">
                              性能係数
                            </Label>
                            <Input
                              id="utilityCoefficientAdv"
                              type="number"
                              step="0.01"
                              value={currentAssumptions.utilityCoefficient}
                              onChange={(e) =>
                                updateAssumption(
                                  "utilityCoefficient",
                                  Number(e.target.value)
                                )
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              0.85: 高性能 / 1.0: 標準 / 1.15: 低性能
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Preview & Guidance */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">プレビュー（概算）</CardTitle>
                <CardDescription>
                  入力中の前提から計算した概算です
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>期間</Label>
                  <Select
                    value={horizonYears.toString()}
                    onValueChange={(v) => setHorizonYears(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30年</SelectItem>
                      <SelectItem value="35">35年</SelectItem>
                      <SelectItem value="40">40年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    累計LCC
                  </div>
                  <div className="text-3xl font-bold">
                    {formatYen(calculateLCC())}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium mb-2">内訳</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">初期費用</span>
                      <span className="font-medium">
                        {formatYen(breakdown.initial)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {activeType === "rent" ? "家賃" : "ローン"}
                      </span>
                      <span className="font-medium">
                        {formatYen(breakdown.loanRent)}
                      </span>
                    </div>
                    {activeType !== "rent" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          税（概算）
                        </span>
                        <span className="font-medium">
                          {formatYen(breakdown.tax)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {activeType === "rent" ? "引越等" : "修繕/管理"}
                      </span>
                      <span className="font-medium">
                        {formatYen(breakdown.repair)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">光熱費</span>
                      <span className="font-medium">
                        {formatYen(breakdown.utility)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => router.push(`/plans/${planId}/housing`)}
                >
                  比較を更新して見る
                </Button>
              </CardFooter>
            </Card>

            {/* Guidance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  入力のコツ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>わからない項目はそのままでOK</p>
                <p>後からいつでも修正できます</p>
                <p>税・制度は概算です</p>
              </CardContent>
            </Card>

            {/* Changes Alert */}
            {isDirty && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        前提の変更点
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-200">
                        保存すると比較結果に反映されます
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Footer (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={handleReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            元に戻す
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
