import { useRouter, useSearchParams } from "next/navigation";

export const useTabNavigation = (planId: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioParam = searchParams.get("scenario");

  const buildScenarioHref = (base: string) => {
    if (!scenarioParam) return base;
    const search = new URLSearchParams();
    search.set("scenario", scenarioParam);
    return `${base}?${search.toString()}`;
  };

  const changeTab = (value: string) => {
    const routes: Record<string, string> = {
      dashboard: buildScenarioHref(`/plans/${planId}`),
      monthly: buildScenarioHref(`/plans/${planId}/months`),
      housing: buildScenarioHref(`/plans/${planId}/housing`),
      events: buildScenarioHref(`/plans/${planId}/events`),
      versions: buildScenarioHref(`/plans/${planId}/versions`),
    };
    const next = routes[value];
    if (next) {
      router.push(next);
    }
  };

  return { changeTab };
};
