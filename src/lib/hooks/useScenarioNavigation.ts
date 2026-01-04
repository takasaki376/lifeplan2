import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ScenarioKey } from "@/lib/domain/types";

export const useScenarioNavigation = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const changeScenario = (
    value: ScenarioKey,
    currentScenario: ScenarioKey
  ) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("scenario", value);
    const query = nextParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    void router.replace(nextUrl);
  };

  return { changeScenario };
};
