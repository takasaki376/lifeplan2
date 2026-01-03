"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Home } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import type { HouseholdType, HousingType } from "@/lib/domain/types";
import { createRepositories } from "@/lib/repo/factory";
import { createPlanWizard } from "@/lib/usecases/createPlanWizard";

interface FormData {
  planName: string;
  householdType: string;
  notes: string;
  housingType: string;
  annualIncome: string;
  assetBalance: string;
  loanBalance: string;
}

const housingOptions = [
  {
    value: "high_performance_home",
    title: "高性能住宅",
    description:
      "高断熱・高性能住宅。光熱費や修繕費を抑える前提です。",
  },
  {
    value: "detached",
    title: "一般戸建",
    description: "標準的な一戸建て住宅。",
  },
  {
    value: "condo",
    title: "分譲マンション",
    description: "マンションでの生活スタイル。",
  },
  {
    value: "rent",
    title: "賃貸",
    description: "購入せず住み替えを前提とした選択肢。",
  },
] as const;

const isHousingType = (value: string): value is HousingType =>
  housingOptions.some((option) => option.value === value);

const parseNumberInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapHouseholdType = (value: string): HouseholdType | undefined => {
  if (value === "single") return "single";
  if (value === "couple") return "couple";
  if (value === "family") return "couple_kids";
  if (value === "other") return "other";
  return undefined;
};

export default function PlanCreationWizard() {
  const router = useRouter();
  const repos = useMemo(() => createRepositories(), []);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    planName: "",
    householdType: "couple",
    notes: "",
    housingType: "",
    annualIncome: "",
    assetBalance: "",
    loanBalance: "0",
  });

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && !formData.planName.trim()) {
      toast.error("プラン名を入力してください");
      return;
    }
    if (step === 2 && !formData.housingType) {
      toast.error("住宅タイプを選択してください");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.planName.trim()) {
      toast.error("プラン名を入力してください");
      setStep(1);
      return;
    }
    if (!isHousingType(formData.housingType)) {
      toast.error("住宅タイプを選択してください");
      setStep(2);
      return;
    }

    const annualIncomeYen = parseNumberInput(formData.annualIncome);
    const incomeMonthlyYen =
      annualIncomeYen !== undefined
        ? Math.round(annualIncomeYen / 12)
        : undefined;
    const assetsBalanceYen = parseNumberInput(formData.assetBalance);
    const liabilitiesBalanceYen = parseNumberInput(formData.loanBalance);

    setIsSaving(true);
    try {
      const result = await createPlanWizard({
        repos,
        input: {
          name: formData.planName.trim(),
          householdType: mapHouseholdType(formData.householdType),
          note: formData.notes.trim() || undefined,
          housingType: formData.housingType,
          incomeMonthlyYen,
          assetsBalanceYen,
          liabilitiesBalanceYen,
        },
      });
      toast.success("プランを作成しました");
      router.push(`/plans/${result.planId}`);
    } catch (error) {
      console.error(error);
      toast.error("プラン作成に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const getHouseholdTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      single: "単身",
      couple: "夫婦",
      family: "夫婦＋子ども",
      other: "その他",
    };
    return labels[type] || type;
  };

  const getHousingTypeLabel = (type: string) => {
    const option = housingOptions.find((opt) => opt.value === type);
    return option?.title || type;
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-xl">
        {/* Step Indicator */}
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">Step {step} / 3</p>
          <div className="mt-2 flex gap-2 justify-center">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-colors ${
                  s === step
                    ? "bg-primary"
                    : s < step
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">プランの基本情報</CardTitle>
              <CardDescription>
                まずは基本となる情報を入力してください。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="planName">
                  プラン名<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="planName"
                  placeholder="例：山田家ライフプラン"
                  value={formData.planName}
                  onChange={(e) => updateFormData("planName", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="householdType">世帯構成</Label>
                <Select
                  value={formData.householdType}
                  onValueChange={(value) =>
                    updateFormData("householdType", value)
                  }
                >
                  <SelectTrigger id="householdType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">単身</SelectItem>
                    <SelectItem value="couple">夫婦</SelectItem>
                    <SelectItem value="family">夫婦＋子ども</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備考（任意）</Label>
                <Textarea
                  id="notes"
                  placeholder="メモがあれば記入してください"
                  value={formData.notes}
                  onChange={(e) => updateFormData("notes", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleNext}>
                次へ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Housing Type */}
        {step === 2 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">住宅タイプ</CardTitle>
              <CardDescription>
                お住まいのタイプを選択してください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.housingType}
                onValueChange={(value) => updateFormData("housingType", value)}
              >
                <div className="space-y-3">
                  {housingOptions.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className="flex cursor-pointer items-start gap-4 rounded-lg border-2 border-muted p-4 transition-colors hover:border-muted-foreground/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold leading-none">
                            {option.title}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                戻る
              </Button>
              <Button onClick={handleNext}>
                次へ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Initial Summary */}
        {step === 3 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">
                初期サマリー（ざっくり）
              </CardTitle>
              <CardDescription>
                おおよその数字でOKです。あとから修正できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="annualIncome">
                  世帯年収（手取り・概算）
                </Label>
                <div className="relative">
                  <Input
                    id="annualIncome"
                    type="number"
                    placeholder="0"
                    value={formData.annualIncome}
                    onChange={(e) =>
                      updateFormData("annualIncome", e.target.value)
                    }
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    円
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  正確でなくてOK。あとで修正できます。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetBalance">貯蓄・資産残高（概算）</Label>
                <div className="relative">
                  <Input
                    id="assetBalance"
                    type="number"
                    placeholder="0"
                    value={formData.assetBalance}
                    onChange={(e) =>
                      updateFormData("assetBalance", e.target.value)
                    }
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    円
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loanBalance">
                  住宅ローン残高（なければ0）
                </Label>
                <div className="relative">
                  <Input
                    id="loanBalance"
                    type="number"
                    placeholder="0"
                    value={formData.loanBalance}
                    onChange={(e) =>
                      updateFormData("loanBalance", e.target.value)
                    }
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    円
                  </span>
                </div>
              </div>

              <Separator />

              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <h3 className="font-semibold text-sm">プラン概要</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">プラン名</span>
                    <span className="font-medium">{formData.planName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">世帯構成</span>
                    <span className="font-medium">
                      {getHouseholdTypeLabel(formData.householdType)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">住宅タイプ</span>
                    <span className="font-medium">
                      {getHousingTypeLabel(formData.housingType)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                あとからいつでも修正できます。
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleBack} disabled={isSaving}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                戻る
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                <Check className="mr-2 h-4 w-4" />
                この内容でプランを作成
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
