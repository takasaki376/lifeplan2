"use client";

import { Home, Calendar, History, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabNavigation } from "@/lib/hooks/useTabNavigation";

type PlanTabValue = "dashboard" | "monthly" | "housing" | "events" | "versions";

const TAB_DEFS: Array<{
  value: PlanTabValue;
  label: string;
  icon: typeof Home;
}> = [
  { value: "dashboard", label: "ダッシュボード", icon: Home },
  { value: "monthly", label: "月次", icon: Calendar },
  { value: "housing", label: "住宅LCC", icon: Home },
  { value: "events", label: "イベント", icon: Calendar },
  { value: "versions", label: "見直し（改定）", icon: History },
];

type PlanNavigationTabsProps = {
  planId: string;
  currentTab: PlanTabValue;
};

export const PlanNavigationTabs = ({
  planId,
  currentTab,
}: PlanNavigationTabsProps) => {
  const { changeTab } = useTabNavigation(planId);
  const current = TAB_DEFS.find((tab) => tab.value === currentTab) ?? TAB_DEFS[0];
  const CurrentIcon = current.icon;

  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Desktop Tabs */}
        <div className="hidden sm:block">
          <Tabs value={currentTab} onValueChange={changeTab}>
            <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0">
              {TAB_DEFS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
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
                  <CurrentIcon className="h-4 w-4" />
                  {current.label}
                </span>
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {TAB_DEFS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <DropdownMenuItem
                    key={tab.value}
                    onSelect={() => changeTab(tab.value)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
