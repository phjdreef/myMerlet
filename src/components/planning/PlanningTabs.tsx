import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { CurriculumPlanner } from "../CurriculumPlanner";
import { PlanningTestsTab } from "./PlanningTestsTab";

export function PlanningTabs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"plans" | "tests">("plans");

  return (
    <div className="container mx-auto flex h-full flex-col gap-6 px-6 py-8">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "plans" | "tests")}
        className="flex h-full flex-col"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("planning")}</h1>
            <p className="text-muted-foreground text-sm">
              {activeTab === "plans"
                ? t("planningTabDescription")
                : t("testsTabDescription")}
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="plans">{t("plansTabTitle")}</TabsTrigger>
            <TabsTrigger value="tests">{t("testsTabTitle")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="plans" className="flex-1 overflow-y-auto">
          <CurriculumPlanner />
        </TabsContent>

        <TabsContent value="tests" className="flex-1 overflow-y-auto">
          <PlanningTestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
