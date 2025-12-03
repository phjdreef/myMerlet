import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { logger } from "../utils/logger";
import { getCurrentWeekNumber } from "../utils/week-utils";
import { CurriculumTimeline } from "./curriculum/CurriculumTimeline";
import { PlanEditor } from "./curriculum/PlanEditor";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { parseSchoolYear } from "../utils/curriculum-week";
import { GlobalBlockedWeeksManager } from "./settings/GlobalBlockedWeeksManager";
import type { CurriculumPlan } from "../services/curriculum-database";

export function CurriculumPlanner() {
  const { t, i18n } = useTranslation();
  const [plans, setPlans] = useState<CurriculumPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CurriculumPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"plans" | "blocked-weeks">(
    "plans",
  );
  const currentWeek = getCurrentWeekNumber();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const result = await window.curriculumAPI.getAllPlans();
      if (result.success && result.data) {
        const plansData = result.data as { plans: CurriculumPlan[] };
        setPlans(plansData.plans || []);
        logger.log("Loaded curriculum plans:", plansData.plans?.length || 0);
      } else {
        logger.error("Failed to load plans:", result.error);
      }
    } catch (error) {
      logger.error("Error loading plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async (plan: CurriculumPlan) => {
    try {
      const result = await window.curriculumAPI.savePlan(plan);
      if (result.success) {
        await loadPlans();
        setIsEditing(false);
        // Keep the plan selected so user can see it in the timeline
        setSelectedPlan(plan);
        logger.log("Plan saved successfully");
      } else {
        logger.error("Failed to save plan:", result.error);
      }
    } catch (error) {
      logger.error("Error saving plan:", error);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm(t("confirmDeletePlan"))) {
      return;
    }

    try {
      const result = await window.curriculumAPI.deletePlan(planId);
      if (result.success) {
        await loadPlans();
        if (selectedPlan?.id === planId) {
          setSelectedPlan(null);
        }
        logger.log("Plan deleted successfully");
      } else {
        logger.error("Failed to delete plan:", result.error);
      }
    } catch (error) {
      logger.error("Error deleting plan:", error);
    }
  };

  const handleCreateNew = () => {
    const currentYearValue = new Date().getFullYear();
    const newPlan: CurriculumPlan = {
      id: crypto.randomUUID(),
      classNames: [],
      subject: "",
      schoolYear: `${currentYearValue}-${currentYearValue + 1}`,
      schoolYearStart: currentYearValue,
      schoolYearEnd: currentYearValue + 1,
      weekRangeStart: 1,
      weekRangeEnd: 52,
      topics: [],
      paragraphs: [],
      studyGoals: [],
      blockedWeeks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedPlan(newPlan);
    setIsEditing(true);
  };

  const handleEditPlan = (plan: CurriculumPlan) => {
    setSelectedPlan(plan);
    setIsEditing(true);
  };

  const handleUpdatePlan = async (updatedPlan: CurriculumPlan) => {
    // Optimistically update local state so UI reflects changes immediately
    setSelectedPlan(updatedPlan);
    setPlans((prev) => {
      const exists = prev.some((plan) => plan.id === updatedPlan.id);
      return exists
        ? prev.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan))
        : [...prev, updatedPlan];
    });

    try {
      const result = await window.curriculumAPI.savePlan(updatedPlan);
      if (result.success) {
        logger.log("Plan updated successfully");
      } else {
        logger.error("Failed to update plan:", result.error);
      }
    } catch (error) {
      logger.error("Error updating plan:", error);
    }
  };

  const handleExportPlan = async (plan: CurriculumPlan) => {
    try {
      const result = await window.curriculumAPI.exportPlanToDocx(
        plan.id,
        i18n.language as "nl" | "en",
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg">{t("loadingPlanning")}</div>
      </div>
    );
  }

  if (isEditing && selectedPlan) {
    return (
      <PlanEditor
        plan={selectedPlan}
        onSave={handleSavePlan}
        onCancel={() => {
          setIsEditing(false);
          setSelectedPlan(null);
        }}
      />
    );
  }

  return (
    <div className="container mx-auto flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("curriculumPlanning")}</h1>
        {activeTab === "plans" && (
          <Button onClick={handleCreateNew}>+ {t("newPlan")}</Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "plans" | "blocked-weeks")
        }
        className="flex flex-1 flex-col"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="plans">
            {t("plansTabTitle")} ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="blocked-weeks">
            {t("globalBlockedWeeks")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          {plans.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-lg">{t("noPlansFound")}</p>
                <Button onClick={handleCreateNew}>
                  {t("createFirstPlan")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-3">
                <label className="mb-1 block text-sm font-medium">
                  {t("selectPlanLabel")}
                </label>
                <select
                  className="w-full max-w-md rounded border p-2"
                  value={selectedPlan?.id || ""}
                  onChange={(e) => {
                    const plan = plans.find((p) => p.id === e.target.value);
                    setSelectedPlan(plan || null);
                  }}
                >
                  <option value="">{t("selectPlanPlaceholder")}</option>
                  {plans.map((plan) => {
                    const displayName =
                      plan.classNames.length > 0
                        ? `${plan.classNames.join(", ")} - ${plan.subject}`
                        : plan.subject || t("namelessPlan");
                    return (
                      <option key={plan.id} value={plan.id}>
                        {displayName} ({plan.schoolYear})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedPlan && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="sticky top-[76px] z-10 bg-white dark:bg-gray-900 pb-3">
                    <div className="rounded-lg border bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold">
                            {selectedPlan.subject?.trim() || t("namelessPlan")}
                          </div>
                          {selectedPlan.classNames.length > 0 && (
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              {selectedPlan.classNames.join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {selectedPlan.schoolYear && (
                            <div>
                              {t("schoolYear")}: {selectedPlan.schoolYear}
                            </div>
                          )}
                          {(() => {
                            const parsedYears = parseSchoolYear(
                              selectedPlan.schoolYear,
                            );
                            const startYear =
                              selectedPlan.schoolYearStart ??
                              parsedYears.startYear;
                            const endYear =
                              selectedPlan.schoolYearEnd ?? parsedYears.endYear;
                            if (!startYear) {
                              return null;
                            }
                            return (
                              <div>
                                {t("schoolYearStartLabel")}: {startYear}
                                {endYear ? ` → ${endYear}` : ""}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportPlan(selectedPlan)}
                      >
                        {t("exportPlan")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPlan(selectedPlan)}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePlan(selectedPlan.id)}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <CurriculumTimeline
                      plan={selectedPlan}
                      currentWeek={currentWeek}
                      onUpdate={handleUpdatePlan}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blocked-weeks" className="mt-0 flex-1 overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col">
          <GlobalBlockedWeeksManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
