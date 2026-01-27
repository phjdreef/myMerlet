import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurriculumTimeline } from "@/components/curriculum/CurriculumTimeline";
import type { CurriculumPlan } from "@/services/curriculum-database";
import { useTranslation } from "react-i18next";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/utils/logger";

interface PlansViewProps {
  classPlans: CurriculumPlan[];
  selectedClass: string | null;
  selectedPlanTab: string;
  onSelectPlan: (planId: string) => void;
  currentWeek: number;
  onReloadPlans?: () => void;
}

export function PlansView({
  classPlans,
  selectedClass,
  selectedPlanTab,
  onSelectPlan,
  currentWeek,
  onReloadPlans,
}: PlansViewProps) {
  const { t, i18n } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();

  // For templates, use current school year from context
  const getEffectivePlan = useMemo(() => {
    return (plan: CurriculumPlan) => {
      // Check if this is a template (explicitly marked or old template with multiple/zero classes)
      const isTemplatePlan =
        plan.isTemplate === true ||
        (plan.isTemplate === undefined && plan.classNames.length !== 1);

      if (isTemplatePlan) {
        // This is a template, always use current school year from settings
        return {
          ...plan,
          schoolYear: currentSchoolYear,
          schoolYearStart: parseInt(currentSchoolYear.split("-")[0], 10),
          schoolYearEnd: parseInt(currentSchoolYear.split("-")[1], 10),
        };
      }
      return plan;
    };
  }, [currentSchoolYear]);

  const handleUpdatePlan = async (updatedPlan: CurriculumPlan) => {
    if (!selectedClass) {
      return;
    }

    try {
      // Simply save the plan - no more automatic copy-on-write
      // Class-specific copies should already exist (created when assigning class in PlanEditor)
      const result = await window.curriculumAPI.savePlan(updatedPlan);
      if (result.success) {
        // Reload plans to update the UI
        if (onReloadPlans) {
          onReloadPlans();
        }
      } else {
        console.error("Failed to update plan:", result.error);
        alert(t("planUpdateError") || "Failed to update plan.");
      }
    } catch (error) {
      console.error("Failed to update plan:", error);
      alert(t("planUpdateError") || "Failed to update plan.");
    }
  };

  const handleExportPlan = async (plan: CurriculumPlan) => {
    try {
      const result = await window.curriculumAPI.exportPlanToDocx(
        plan.id,
        i18n.language as "nl" | "en",
        selectedClass || undefined,
      );
      if (result.success) {
        const data = result.data as { filePath?: string } | undefined;
        const filePath = data?.filePath;
        if (filePath) {
          alert(t("exportPlanSuccessWithPath", { filePath }));
        } else {
          alert(t("exportPlanSuccess"));
        }
        logger.log("Curriculum plan exported", filePath);
      } else if (result.error !== "cancelled") {
        const errorMessage = result.error || t("unknownError");
        alert(t("exportPlanError", { error: errorMessage }));
        logger.error("Failed to export plan:", result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(t("exportPlanError", { error: message }));
      logger.error("Error exporting plan:", error);
    }
  };

  if (classPlans.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          {selectedClass
            ? `${t("noPlansFoundForClass")} "${selectedClass}".`
            : t("selectClassToViewPlans")}
        </p>
      </div>
    );
  }

  return (
    <Tabs
      value={selectedPlanTab}
      onValueChange={onSelectPlan}
      className="flex h-full flex-col"
    >
      <div className="sticky top-0 z-10 bg-white pb-2 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            {classPlans.map((plan) => (
              <TabsTrigger key={plan.id} value={plan.id}>
                {plan.subject} ({plan.schoolYear})
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedPlanTab && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const selectedPlan = classPlans.find(
                  (p) => p.id === selectedPlanTab,
                );
                if (selectedPlan) handleExportPlan(selectedPlan);
              }}
            >
              {t("exportPlan")}
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {classPlans.map((plan) => {
          const effectivePlan = getEffectivePlan(plan);
          const isTemplatePlan =
            plan.isTemplate === true ||
            (plan.isTemplate === undefined && plan.classNames.length !== 1);

          return (
            <TabsContent key={plan.id} value={plan.id} className="space-y-4">
              {isTemplatePlan && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t("sharedPlanInfo") ||
                      "This is a shared plan across multiple classes"}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {t("sharedPlanClasses")}: {plan.classNames.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    {t("copyOnWriteInfo") ||
                      "When you make changes, a class-specific copy will be created automatically."}
                  </p>
                </div>
              )}
              <CurriculumTimeline
                plan={effectivePlan}
                currentWeek={currentWeek}
                onUpdate={handleUpdatePlan}
              />
            </TabsContent>
          );
        })}
      </div>
    </Tabs>
  );
}
