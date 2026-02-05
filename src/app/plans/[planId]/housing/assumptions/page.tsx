"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Home,
  Building,
  Building2,
  KeyRound,
  Save,
  RotateCcw,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  HousingAssumptions,
  HousingType,
  Id,
  RepaymentType,
} from "@/lib/domain/types";
import { HOUSING_TYPE_LABELS } from "@/lib/housing";
import { buildScenarioHref, parseScenario } from "@/lib/scenario";
import { createRepositories } from "@/lib/repo/factory";
import { toast } from "sonner";

type EditMode = "simple" | "advanced";

type HousingByType = {
  [K in HousingType]: Extract<HousingAssumptions, { housingType: K }>;
};

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

const HOUSING_VIEW_KEY = "housingAssumptionsView";

const cloneHousingMap = (input: HousingByType) =>
  JSON.parse(JSON.stringify(input)) as HousingByType;

const setHousingMapValue = <T extends HousingType>(
  target: Partial<HousingByType>,
  type: T,
  value: HousingByType[T],
) => {
  target[type] = value;
};

const isHousingType = (value: string | null | undefined): value is HousingType =>
  typeof value === "string" && HOUSING_TYPES.includes(value as HousingType);

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getLoanYears = (months: number | undefined) =>
  months && months > 0 ? Math.max(1, Math.round(months / 12)) : 35;

const getSimpleRepairAnnual = (item: HousingAssumptions) => {
  if (!("repairsSchedule" in item)) return 0;
  const schedule = item.repairsSchedule ?? [];
  if (schedule.length === 1 && schedule[0]?.cycleYears === 1) {
    return schedule[0]?.amountYen ?? 0;
  }
  return 0;
};

export default function HousingAssumptionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.planId as string;
  const scenario = parseScenario(searchParams.get("scenario"));
  const repos = useMemo(() => createRepositories(), []);

  const [planName, setPlanName] = useState("プラン");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noCurrentVersion, setNoCurrentVersion] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<Id | null>(null);
  const [housingByType, setHousingByType] = useState<HousingByType | null>(null);
  const [activeType, setActiveType] = useState<HousingType>(
    "high_performance_home",
  );
  const [editMode, setEditMode] = useState<EditMode>("simple");
  const [isDirty, setIsDirty] = useState(false);
  const initialSnapshotRef = useRef<HousingByType | null>(null);

  const buildScenarioLink = (base: string, params?: Record<string, string>) =>
    buildScenarioHref(base, {
      scenario,
      params,
      includeWhenMissing: true,
    });

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(HOUSING_VIEW_KEY)
        : null;
    if (stored === "simple" || stored === "advanced") {
      setEditMode(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HOUSING_VIEW_KEY, editMode);
  }, [editMode]);

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
          setCurrentVersionId(null);
          setHousingByType(null);
          return;
        }

        setCurrentVersionId(currentVersion.id);
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

        const map: Partial<HousingByType> = {};
        for (const item of list) {
          setHousingMapValue(
            map,
            item.housingType,
            item as HousingByType[typeof item.housingType],
          );
        }

        const requestedType = searchParams.get("type");
        if (isHousingType(requestedType)) {
          setActiveType(requestedType);
        } else {
          const selected =
            list.find((item) => item.isSelected)?.housingType ??
            list[0]?.housingType ??
            "high_performance_home";
          setActiveType(selected);
        }

        setHousingByType(map as HousingByType);
        initialSnapshotRef.current = cloneHousingMap(map as HousingByType);
        setIsDirty(false);
      } catch (error) {
        console.error(error);
        setLoadError("住宅前提の読み込みに失敗しました。");
        setHousingByType(null);
        setCurrentVersionId(null);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [planId, repos, searchParams]);

  const currentAssumptions = housingByType?.[activeType] ?? null;

  const updateHousing = <T extends HousingType>(
    type: T,
    patch: Partial<Extract<HousingAssumptions, { housingType: T }>>,
  ) => {
    setHousingByType((prev) => {
      if (!prev) return prev;
      const current = prev[type] as Extract<
        HousingAssumptions,
        { housingType: T }
      >;
      const next = { ...prev };
      next[type] = { ...current, ...patch } as HousingByType[T];
      return next;
    });
    setIsDirty(true);
  };

  const updateTypeSpecific = <T extends HousingType>(
    type: T,
    patch: Record<string, number | string | undefined>,
  ) => {
    setHousingByType((prev) => {
      if (!prev) return prev;
      const current = prev[type] as Extract<
        HousingAssumptions,
        { housingType: T }
      >;
      const typeSpecific = { ...(current.typeSpecific ?? {}) };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) {
          delete (typeSpecific as Record<string, unknown>)[key];
        } else {
          (typeSpecific as Record<string, unknown>)[key] = value;
        }
      }
      return {
        ...prev,
        [type]: {
          ...current,
          typeSpecific,
        } as HousingByType[T],
      };
    });
    setIsDirty(true);
  };

  const handleSelectType = (checked: boolean) => {
    updateHousing(activeType, { isSelected: checked });
  };

  const handleSave = async () => {
    if (!currentVersionId || !housingByType) return;
    try {
      for (const type of HOUSING_TYPES) {
        const item = housingByType[type];
        await repos.housing.upsert({
          ...item,
          planVersionId: currentVersionId,
          housingType: type,
        });
      }
      initialSnapshotRef.current = cloneHousingMap(housingByType);
      setIsDirty(false);
      toast("保存しました", { description: "前提が更新されました。" });
    } catch (error) {
      console.error(error);
      toast("保存に失敗しました", { description: "もう一度お試しください。" });
    }
  };

  const handleReset = () => {
    if (!initialSnapshotRef.current) return;
    setHousingByType(cloneHousingMap(initialSnapshotRef.current));
    setIsDirty(false);
    toast("元に戻しました", { description: "前回保存時の状態に戻しました。" });
  };

  const addRepairItem = () => {
    if (!currentAssumptions || !("repairsSchedule" in currentAssumptions)) return;
    const schedule = currentAssumptions.repairsSchedule ?? [];
    updateHousing(activeType, {
      repairsSchedule: [
        ...schedule,
        { cycleYears: 10, amountYen: 1000000, memo: "" },
      ],
    });
  };

  const updateRepairItem = (
    index: number,
    patch: { cycleYears?: number; amountYen?: number; memo?: string },
  ) => {
    if (!currentAssumptions || !("repairsSchedule" in currentAssumptions)) return;
    const schedule = currentAssumptions.repairsSchedule ?? [];
    const next = schedule.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item,
    );
    updateHousing(activeType, { repairsSchedule: next });
  };

  const removeRepairItem = (index: number) => {
    if (!currentAssumptions || !("repairsSchedule" in currentAssumptions)) return;
    const schedule = currentAssumptions.repairsSchedule ?? [];
    updateHousing(activeType, {
      repairsSchedule: schedule.filter((_, idx) => idx !== index),
    });
  };

  const renderCommon = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>光熱費（基準/月）</Label>
        <Input
          type="number"
          value={currentAssumptions?.utilitiesBaseMonthlyYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              utilitiesBaseMonthlyYen: toNumber(e.target.value),
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>住宅性能係数</Label>
        <Input
          type="number"
          step="0.01"
          value={currentAssumptions?.utilitiesFactor ?? 1}
          onChange={(e) =>
            updateHousing(activeType, {
              utilitiesFactor: toNumber(e.target.value),
            })
          }
        />
      </div>
    </div>
  );

  const renderPurchaseSimple = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>購入価格</Label>
        <Input
          type="number"
          value={currentAssumptions?.initialCostYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              initialCostYen: toNumber(e.target.value),
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>頭金</Label>
        <Input
          type="number"
          value={currentAssumptions?.downPaymentYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              downPaymentYen: toNumber(e.target.value),
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>金利（年率%）</Label>
        <Input
          type="number"
          step="0.01"
          value={(currentAssumptions?.loanInterestRate ?? 0) * 100}
          onChange={(e) =>
            updateHousing(activeType, {
              loanInterestRate: toNumber(e.target.value) / 100,
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>ローン年数</Label>
        <Input
          type="number"
          value={getLoanYears(currentAssumptions?.loanTermMonths)}
          onChange={(e) =>
            updateHousing(activeType, {
              loanTermMonths: toNumber(e.target.value) * 12,
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>固定資産税（年額）</Label>
        <Input
          type="number"
          value={currentAssumptions?.propertyTaxAnnualYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              propertyTaxAnnualYen: toNumber(e.target.value),
            })
          }
        />
      </div>
      {(activeType === "high_performance_home" || activeType === "detached") && (
        <div className="space-y-1.5">
          <Label>修繕（年額概算）</Label>
          <Input
            type="number"
            value={currentAssumptions ? getSimpleRepairAnnual(currentAssumptions) : 0}
            onChange={(e) =>
              updateHousing(activeType, {
                repairsSchedule: [
                  {
                    cycleYears: 1,
                    amountYen: toNumber(e.target.value),
                    memo: "",
                  },
                ],
              })
            }
          />
        </div>
      )}
    </div>
  );

  const renderPurchaseAdvanced = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>初期費用（購入価格）</Label>
        <Input
          type="number"
          value={currentAssumptions?.initialCostYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              initialCostYen: toNumber(e.target.value),
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>頭金</Label>
        <Input
          type="number"
          value={currentAssumptions?.downPaymentYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              downPaymentYen: toNumber(e.target.value),
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>諸費用</Label>
        <Input
          type="number"
          value={currentAssumptions?.closingCostYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              closingCostYen: toNumber(e.target.value),
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>ローン元本</Label>
        <Input
          type="number"
          value={currentAssumptions?.loanPrincipalYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              loanPrincipalYen: toNumber(e.target.value),
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>金利（年率%）</Label>
        <Input
          type="number"
          step="0.01"
          value={(currentAssumptions?.loanInterestRate ?? 0) * 100}
          onChange={(e) =>
            updateHousing(activeType, {
              loanInterestRate: toNumber(e.target.value) / 100,
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>ローン年数</Label>
        <Input
          type="number"
          value={getLoanYears(currentAssumptions?.loanTermMonths)}
          onChange={(e) =>
            updateHousing(activeType, {
              loanTermMonths: toNumber(e.target.value) * 12,
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>返済方式</Label>
        <Select
          value={(currentAssumptions?.repaymentType ?? "annuity") as RepaymentType}
          onValueChange={(value) =>
            updateHousing(activeType, {
              repaymentType: value as RepaymentType,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="annuity">元利均等</SelectItem>
            <SelectItem value="equal_principal">元金均等</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>固定資産税（年額）</Label>
        <Input
          type="number"
          value={currentAssumptions?.propertyTaxAnnualYen ?? 0}
          onChange={(e) =>
            updateHousing(activeType, {
              propertyTaxAnnualYen: toNumber(e.target.value),
            })
          }
        />
      </div>
    </div>
  );

  const renderCondoFees = () => {
    if (activeType !== "condo") return null;
    const condo = currentAssumptions as Extract<
      HousingAssumptions,
      { housingType: "condo" }
    >;
    const typeSpecific = condo.typeSpecific ?? {};
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>管理費（月）</Label>
          <Input
            type="number"
            value={typeSpecific.managementFeeMonthlyYen ?? 0}
            onChange={(e) =>
              updateTypeSpecific(activeType, {
                managementFeeMonthlyYen: toNumber(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>修繕積立（月）</Label>
          <Input
            type="number"
            value={typeSpecific.repairReserveMonthlyYen ?? 0}
            onChange={(e) =>
              updateTypeSpecific(activeType, {
                repairReserveMonthlyYen: toNumber(e.target.value),
              })
            }
          />
        </div>
        {editMode === "advanced" && (
          <div className="space-y-1.5">
            <Label>駐車場（月）</Label>
            <Input
              type="number"
              value={typeSpecific.parkingFeeMonthlyYen ?? 0}
              onChange={(e) =>
                updateTypeSpecific(activeType, {
                  parkingFeeMonthlyYen: toNumber(e.target.value),
                })
              }
            />
          </div>
        )}
      </div>
    );
  };

  const renderRent = () => {
    if (activeType !== "rent") return null;
    const rent = currentAssumptions as Extract<
      HousingAssumptions,
      { housingType: "rent" }
    >;
    const typeSpecific = rent.typeSpecific ?? {};
    const increaseRate = (typeSpecific.rentIncreaseRateAnnual ?? 0) * 100;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>家賃（月）</Label>
          <Input
            type="number"
            value={typeSpecific.rentMonthlyYen ?? 0}
            onChange={(e) =>
              updateTypeSpecific(activeType, {
                rentMonthlyYen: toNumber(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>家賃上昇率（年率%）</Label>
          <Input
            type="number"
            step="0.1"
            value={increaseRate}
            onChange={(e) =>
              updateTypeSpecific(activeType, {
                rentIncreaseRateAnnual: toNumber(e.target.value) / 100,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>引越費用</Label>
          <Input
            type="number"
            value={typeSpecific.movingCostYen ?? 0}
            onChange={(e) =>
              updateTypeSpecific(activeType, {
                movingCostYen: toNumber(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>更新料（1回）</Label>
          <Input
            type="number"
            value={typeSpecific.renewalFeeYen ?? 0}
            onChange={(e) =>
              updateTypeSpecific(activeType, {
                renewalFeeYen: toNumber(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>更新周期（年）</Label>
          <Input
            type="number"
            value={typeSpecific.renewalCycleYears ?? 0}
            onChange={(e) =>
              updateTypeSpecific(activeType, {
                renewalCycleYears: toNumber(e.target.value),
              })
            }
          />
        </div>
        {editMode === "advanced" && (
          <>
            <div className="space-y-1.5">
              <Label>敷金</Label>
              <Input
                type="number"
                value={typeSpecific.depositYen ?? 0}
                onChange={(e) =>
                  updateTypeSpecific(activeType, {
                    depositYen: toNumber(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>礼金</Label>
              <Input
                type="number"
                value={typeSpecific.keyMoneyYen ?? 0}
                onChange={(e) =>
                  updateTypeSpecific(activeType, {
                    keyMoneyYen: toNumber(e.target.value),
                  })
                }
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const renderRepairsSchedule = () => {
    if (activeType !== "high_performance_home" && activeType !== "detached") {
      return null;
    }
    const housing = currentAssumptions as
      | Extract<HousingAssumptions, { housingType: "high_performance_home" }>
      | Extract<HousingAssumptions, { housingType: "detached" }>;
    const schedule = housing.repairsSchedule ?? [];
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>修繕スケジュール</Label>
          <Button variant="outline" size="sm" onClick={addRepairItem}>
            <Plus className="mr-1 h-3 w-3" />
            行を追加
          </Button>
        </div>
        <div className="space-y-2">
          {schedule.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-start"
            >
              <div className="col-span-3">
                <Input
                  type="number"
                  placeholder="周期（年）"
                  value={item.cycleYears}
                  onChange={(e) =>
                    updateRepairItem(index, {
                      cycleYears: toNumber(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="number"
                  placeholder="金額"
                  value={item.amountYen}
                  onChange={(e) =>
                    updateRepairItem(index, {
                      amountYen: toNumber(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-span-4">
                <Input
                  placeholder="メモ"
                  value={item.memo ?? ""}
                  onChange={(e) =>
                    updateRepairItem(index, {
                      memo: e.target.value,
                    })
                  }
                />
              </div>
              <div className="col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRepairItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-5xl p-6">
          <p className="text-muted-foreground">読み込み中です…</p>
        </div>
      </div>
    );
  }

  if (noCurrentVersion) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-5xl p-6">
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              現行バージョンがありません。改定履歴で現行版を設定してください。
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href={`/plans/${planId}/versions`}>改定履歴へ</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-5xl p-6">
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">{loadError}</AlertDescription>
          </Alert>
          <Button asChild>
            <Link href={buildScenarioLink(`/plans/${planId}/housing`)}>
              比較へ戻る
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!currentAssumptions || !housingByType) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-5xl p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">前提がありません</CardTitle>
              <CardDescription>
                もう一度読み込み直してください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={buildScenarioLink(`/plans/${planId}/housing`)}>
                  比較へ戻る
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const Icon = HOUSING_TYPE_ICONS[activeType];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/plans" className="hover:text-foreground">
              プラン一覧
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/plans/${planId}`} className="hover:text-foreground">
              {planName}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={buildScenarioLink(`/plans/${planId}/housing`)}
              className="hover:text-foreground"
            >
              住宅LCC
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">前提</span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold">住宅前提の編集</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                かんたん / 詳細を切り替えながら、4タイプの前提を調整します。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isDirty && <Badge variant="outline">変更があります</Badge>}
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                元に戻す
              </Button>
              <Button variant="outline" asChild>
                <Link href={buildScenarioLink(`/plans/${planId}/housing`)}>
                  比較へ戻る
                </Link>
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Card>
              <CardHeader className="space-y-4">
                <Tabs value={activeType} onValueChange={(v) => setActiveType(v as HousingType)}>
                  <TabsList className="grid w-full grid-cols-4">
                    {HOUSING_TYPES.map((type) => {
                      const ItemIcon = HOUSING_TYPE_ICONS[type];
                      return (
                        <TabsTrigger key={type} value={type} className="gap-2">
                          <ItemIcon className="h-4 w-4" />
                          {HOUSING_TYPE_LABELS[type]}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Tabs value={editMode} onValueChange={(v) => setEditMode(v as EditMode)}>
                    <TabsList>
                      <TabsTrigger value="simple">かんたん</TabsTrigger>
                      <TabsTrigger value="advanced">詳細</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentAssumptions?.isSelected ?? false}
                      onCheckedChange={handleSelectType}
                    />
                    <Label className="text-sm">
                      この住宅タイプを選択中にする
                    </Label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span>{HOUSING_TYPE_LABELS[activeType]} の前提</span>
                </div>

                {editMode === "simple" && (
                  <div className="space-y-6">
                    {(activeType === "high_performance_home" ||
                      activeType === "detached" ||
                      activeType === "condo") &&
                      renderPurchaseSimple()}

                    {activeType === "condo" && renderCondoFees()}

                    {activeType === "rent" && renderRent()}

                    <Separator />
                    {renderCommon()}
                  </div>
                )}

                {editMode === "advanced" && (
                  <div className="space-y-6">
                    {(activeType === "high_performance_home" ||
                      activeType === "detached" ||
                      activeType === "condo") &&
                      renderPurchaseAdvanced()}

                    {activeType === "condo" && renderCondoFees()}

                    {activeType === "rent" && renderRent()}

                    {(activeType === "high_performance_home" ||
                      activeType === "detached") && (
                      <>
                        <Separator />
                        {renderRepairsSchedule()}
                      </>
                    )}

                    <Separator />
                    {renderCommon()}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  元に戻す
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">編集のヒント</CardTitle>
                <CardDescription>
                  迷う項目は空欄でもOK。あとから調整できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>・金額は概算で入力</p>
                <p>・詳細は必要なところだけでOK</p>
                <p>・保存後に比較に反映されます</p>
              </CardContent>
            </Card>

            {isDirty && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4 text-sm">
                  変更があります。保存すると比較結果に反映されます。
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
