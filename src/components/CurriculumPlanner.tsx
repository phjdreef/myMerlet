import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { logger } from "../utils/logger";
import { getCurrentWeekNumber } from "../utils/week-utils";
import { CurriculumTimeline } from "./curriculum/CurriculumTimeline";
import { PlanEditor } from "./curriculum/PlanEditor";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { GlobalBlockedWeeksManager } from "./settings/GlobalBlockedWeeksManager";
import { useSchoolYear } from "../contexts/SchoolYearContext";
import type { CurriculumPlan } from "../services/curriculum-database";

export function CurriculumPlanner() {
  const { t } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();
  const [plans, setPlans] = useState<CurriculumPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CurriculumPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"plans" | "blocked-weeks">(
    "plans",
  );
  const currentWeek = getCurrentWeekNumber();

  // For templates (multiple classes or no classes), use current school year from context
  const effectiveSelectedPlan = useMemo(() => {
    if (!selectedPlan) return null;

    // Templates don't have schoolYear set, so we use the current one from settings
    if (!selectedPlan.schoolYear || !selectedPlan.schoolYearStart) {
      return {
        ...selectedPlan,
        schoolYear: currentSchoolYear,
        schoolYearStart: parseInt(currentSchoolYear.split("-")[0], 10),
        schoolYearEnd: parseInt(currentSchoolYear.split("-")[1], 10),
      };
    }

    return selectedPlan;
  }, [selectedPlan, currentSchoolYear]);

  // Get unique subjects for filter
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    plans.forEach((plan) => {
      if (plan.subject) subjects.add(plan.subject);
    });
    return Array.from(subjects).sort();
  }, [plans]);

  // Filter and group plans
  const filteredPlans = useMemo(() => {
    return plans.filter(
      (plan) => !subjectFilter || plan.subject === subjectFilter,
    );
  }, [plans, subjectFilter]);

  // Group by subject, then by year level
  const plansBySubjectAndYear = useMemo(() => {
    const grouped = new Map<string, Map<string, CurriculumPlan[]>>();
    filteredPlans.forEach((plan) => {
      const subject = plan.subject || t("noSubject") || "Geen vak";
      if (!grouped.has(subject)) {
        grouped.set(subject, new Map<string, CurriculumPlan[]>());
      }

      const subjectGroup = grouped.get(subject)!;
      // Group by year level
      const yearLevel = plan.yearLevel || t("noYearLevel") || "Geen leerjaar";

      if (!subjectGroup.has(yearLevel)) {
        subjectGroup.set(yearLevel, []);
      }
      subjectGroup.get(yearLevel)!.push(plan);
    });
    return grouped;
  }, [filteredPlans, t]);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const result = await window.curriculumAPI.getAllPlans();
      if (result.success && result.data) {
        const plansData = result.data as { plans: CurriculumPlan[] };
        // Filter to show only template plans (not class-specific copies)
        // Templates have isTemplate === true (explicitly marked as template)
        // For backwards compatibility with old data (isTemplate === undefined):
        //   - Show if classNames.length !== 1 (old templates had 0 or multiple classes)
        const templatePlans = (plansData.plans || []).filter((plan) => {
          // Explicitly marked as template
          if (plan.isTemplate === true) return true;
          // Explicitly marked as class-specific copy
          if (plan.isTemplate === false) return false;
          // Old data without isTemplate field - use classNames heuristic
          return plan.classNames.length !== 1;
        });
        setPlans(templatePlans);
        logger.log("Loaded curriculum template plans:", templatePlans.length);
      } else {
        logger.error("Failed to load plans:", result.error);
      }
    } catch (error) {
      logger.error("Error loading plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

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
    const newPlan: CurriculumPlan = {
      id: crypto.randomUUID(),
      yearLevel: "",
      description: "",
      classNames: [],
      subject: "",
      schoolYear: "", // Templates are school-year independent
      schoolYearStart: null,
      schoolYearEnd: null,
      weekRangeStart: 1,
      weekRangeEnd: 52,
      topics: [],
      paragraphs: [],
      studyGoals: [],
      blockedWeeks: [],
      isTemplate: true,
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg">{t("loadingPlanning")}</div>
      </div>
    );
  }

  if (isEditing && selectedPlan) {
    return (
      <div className="container mx-auto flex h-full flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {selectedPlan.id ? t("editPlan") : t("newPlan")}
          </h2>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setSelectedPlan(null);
            }}
          >
            {t("cancel")}
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <PlanEditor
            plan={selectedPlan}
            onSave={handleSavePlan}
            onCancel={() => {
              setIsEditing(false);
              setSelectedPlan(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Timeline view for selected plan
  if (selectedPlan && !isEditing) {
    return (
      <div className="container mx-auto flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPlan(null)}
            >
              ← {t("back") || "Terug"}
            </Button>
            <div>
              <h2 className="text-xl font-semibold">{selectedPlan.subject}</h2>
              {selectedPlan.description && (
                <div className="text-base text-gray-700 dark:text-gray-300">
                  {selectedPlan.description}
                </div>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {effectiveSelectedPlan?.schoolYear}
                {selectedPlan.classNames.length > 0 && (
                  <span> · {selectedPlan.classNames.join(", ")}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
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
              onClick={() => {
                handleDeletePlan(selectedPlan.id);
                setSelectedPlan(null);
              }}
            >
              {t("delete")}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CurriculumTimeline
            plan={effectiveSelectedPlan || selectedPlan}
            currentWeek={currentWeek}
            onUpdate={handleUpdatePlan}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
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

        <TabsContent
          value="plans"
          className="flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
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
              {/* Filter bar */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">
                  {t("filterBySubject") || "Filter op vak"}
                </label>
                <select
                  className="w-full max-w-md rounded border p-2"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                >
                  <option value="">{t("allSubjects") || "Alle vakken"}</option>
                  {availableSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Curriculum overview */}
              <div className="flex-1 space-y-6 overflow-y-auto pr-4">
                {Array.from(plansBySubjectAndYear.entries()).map(
                  ([subject, yearLevelGroups]) => (
                    <div key={subject} className="space-y-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {subject}
                      </h2>
                      {Array.from(yearLevelGroups.entries()).map(
                        ([yearLevel, plans]) => (
                          <div
                            key={`${subject}-${yearLevel}`}
                            className="space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                                {yearLevel}
                              </h3>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newPlan: CurriculumPlan = {
                                    id: crypto.randomUUID(),
                                    yearLevel: yearLevel,
                                    description: "",
                                    classNames: [],
                                    subject: subject,
                                    schoolYear: "",
                                    schoolYearStart: null,
                                    schoolYearEnd: null,
                                    weekRangeStart: 1,
                                    weekRangeEnd: 52,
                                    topics: [],
                                    paragraphs: [],
                                    studyGoals: [],
                                    blockedWeeks: [],
                                    isTemplate: true,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                  };
                                  setSelectedPlan(newPlan);
                                  setIsEditing(true);
                                }}
                              >
                                + {t("addCurriculum") || "Voeg curriculum toe"}
                              </Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {plans.map((plan) => {
                                const effectivePlan =
                                  !plan.schoolYear || !plan.schoolYearStart
                                    ? {
                                        ...plan,
                                        schoolYear: currentSchoolYear,
                                        schoolYearStart: parseInt(
                                          currentSchoolYear.split("-")[0],
                                          10,
                                        ),
                                        schoolYearEnd: parseInt(
                                          currentSchoolYear.split("-")[1],
                                          10,
                                        ),
                                      }
                                    : plan;

                                return (
                                  <div
                                    key={plan.id}
                                    className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-blue-600"
                                    onClick={() => {
                                      setSelectedPlan(plan);
                                      setIsEditing(false);
                                    }}
                                  >
                                    <div className="mb-2 flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                                          {plan.subject}
                                        </div>
                                        {plan.description && (
                                          <div className="text-sm text-gray-700 dark:text-gray-300">
                                            {plan.description}
                                          </div>
                                        )}
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          {effectivePlan.schoolYear}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPlan(plan);
                                          setIsEditing(true);
                                        }}
                                        className="ml-2"
                                      >
                                        {t("edit")}
                                      </Button>
                                    </div>

                                    {plan.classNames.length > 0 && (
                                      <div className="mb-2 flex flex-wrap gap-1">
                                        {plan.classNames.map((className) => (
                                          <span
                                            key={className}
                                            className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                                          >
                                            {className}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {plan.studyGoals.length}{" "}
                                      {t("studyGoals") || "leerdoelen"} ·{" "}
                                      {t("weeks")} {plan.weekRangeStart}-
                                      {plan.weekRangeEnd}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ),
                )}

                {filteredPlans.length === 0 && (
                  <div className="py-8 text-center text-gray-500">
                    {t("noPlansMatchFilter") ||
                      "Geen plannen gevonden met deze filter"}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="blocked-weeks"
          className="mt-0 flex-1 overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col"
        >
          <GlobalBlockedWeeksManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
