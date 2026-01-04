import { useRouter } from "next/navigation";

export const useTabNavigation = (planId: string) => {
  const router = useRouter();

  const changeTab = (value: string) => {
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

  return { changeTab };
};
