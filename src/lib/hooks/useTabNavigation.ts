import { useRouter, useSearchParams } from "next/navigation";
import { buildScenarioHref } from "@/lib/scenario";

export const useTabNavigation = (planId: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioParam = searchParams.get("scenario");

  const changeTab = (value: string) => {
    const routes: Record<string, string> = {
      dashboard: buildScenarioHref(`/plans/${planId}`, {
        scenario: scenarioParam,
      }),
      monthly: buildScenarioHref(`/plans/${planId}/months`, {
        scenario: scenarioParam,
      }),
      housing: buildScenarioHref(`/plans/${planId}/housing`, {
        scenario: scenarioParam,
      }),
      events: buildScenarioHref(`/plans/${planId}/events`, {
        scenario: scenarioParam,
      }),
      versions: buildScenarioHref(`/plans/${planId}/versions`, {
        scenario: scenarioParam,
      }),
    };
    const next = routes[value];
    if (next) {
      router.push(next);
    }
  };

  return { changeTab };
};
