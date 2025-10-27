import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurriculumTimeline } from "@/components/curriculum/CurriculumTimeline";
import type { CurriculumPlan } from "@/services/curriculum-database";
import { useTranslation } from "react-i18next";

interface PlansViewProps {
  classPlans: CurriculumPlan[];
  selectedClass: string | null;
  selectedPlanTab: string;
  onSelectPlan: (planId: string) => void;
  currentWeek: number;
}

export function PlansView({
  classPlans,
  selectedClass,
  selectedPlanTab,
  onSelectPlan,
  currentWeek,
}: PlansViewProps) {
  const { t } = useTranslation();

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
        <TabsList>
          {classPlans.map((plan) => (
            <TabsTrigger key={plan.id} value={plan.id}>
              {plan.subject} ({plan.schoolYear})
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div className="flex-1 overflow-auto">
        {classPlans.map((plan) => (
          <TabsContent key={plan.id} value={plan.id}>
            <CurriculumTimeline plan={plan} currentWeek={currentWeek} />
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
