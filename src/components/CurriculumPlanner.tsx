import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { logger } from "../utils/logger";
import { getCurrentWeekNumber } from "../utils/week-utils";
import { CurriculumTimeline } from "./curriculum/CurriculumTimeline";
import { PlanEditor } from "./curriculum/PlanEditor";
import { Button } from "./ui/button";
import type { CurriculumPlan } from "../services/curriculum-database";

export function CurriculumPlanner() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<CurriculumPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CurriculumPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
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
    const newPlan: CurriculumPlan = {
      id: crypto.randomUUID(),
      classNames: [],
      subject: "",
      schoolYear: new Date().getFullYear().toString(),
      topics: [],
      paragraphs: [],
      studyGoals: [],
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("curriculumPlanning")}</h1>
        <Button onClick={handleCreateNew}>+ {t("newPlan")}</Button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-lg">{t("noPlansFound")}</p>
            <Button onClick={handleCreateNew}>{t("createFirstPlan")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
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
              <div className="mb-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEditPlan(selectedPlan)}
                >
                  {t("edit")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeletePlan(selectedPlan.id)}
                >
                  {t("delete")}
                </Button>
              </div>
              <CurriculumTimeline
                plan={selectedPlan}
                currentWeek={currentWeek}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
