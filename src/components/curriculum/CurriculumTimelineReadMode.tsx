import {
  BookOpenIcon,
  CalendarBlankIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type {
  CurriculumPlan,
  StudyGoal,
} from "../../services/curriculum-database";
import { Button } from "../ui/button";

interface CurriculumTimelineReadModeProps {
  plan: CurriculumPlan;
  weekNumber: number;
  goals: StudyGoal[];
  isCurrentWeek: boolean;
  formatDisplayRange: (weekNumber: number) => string;
  currentWeekRef?: React.RefObject<HTMLDivElement | null>;
  onEdit?: () => void;
  onAddGoal?: () => void;
}

export function CurriculumTimelineReadMode({
  plan,
  weekNumber,
  goals,
  isCurrentWeek,
  formatDisplayRange,
  currentWeekRef,
  onEdit,
  onAddGoal,
}: CurriculumTimelineReadModeProps) {
  const { t } = useTranslation();

  const hasGoals = goals.length > 0;

  return (
    <div
      className={`flex gap-4 rounded-xl border p-4 shadow-sm transition-colors ${
        isCurrentWeek
          ? "border-2 border-blue-500 bg-blue-50/50 ring-2 ring-blue-400/30 dark:border-blue-400 dark:bg-blue-900/40 dark:ring-blue-500/40"
          : hasGoals
            ? "border border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-900/50"
            : "border border-dashed border-gray-200 bg-white/80 dark:bg-gray-900/50"
      }`}
      ref={currentWeekRef}
    >
      <div className="w-32 shrink-0">
        <div className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
          {t("week")}
        </div>
        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {weekNumber}
          {isCurrentWeek && (
            <span className="ml-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              {t("currentWeek", "Huidige")}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatDisplayRange(weekNumber)}
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {goals.length === 0 ? (
          <div className="group flex items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4 text-sm text-gray-500 italic dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            <span>{t("emptyWeek", "Geen planning")}</span>
            {onAddGoal && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onAddGoal}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                title={t("addStudyGoal")}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="group relative rounded-lg border border-gray-200 bg-white/90 p-4 shadow-sm transition hover:border-blue-200 dark:border-gray-700 dark:bg-gray-900/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {goal.title || t("untitledGoal", "Naamloos leerdoel")}
                  </div>
                  {goal.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {goal.description}
                    </div>
                  )}

                  {goal.paragraphIds && goal.paragraphIds.length > 0 && (
                    <div className="space-y-2">
                      {goal.paragraphIds.map((paragraphId) => {
                        const paragraph = plan.paragraphs.find(
                          (p) => p.id === paragraphId,
                        );
                        if (!paragraph) return null;
                        const topic = plan.topics.find(
                          (t) => t.id === paragraph.topicId,
                        );
                        return (
                          <div
                            key={paragraph.id}
                            className="rounded-lg border border-blue-200/60 bg-blue-50/50 p-3 dark:border-blue-800/40 dark:bg-blue-900/20"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                              <BookOpenIcon className="h-4 w-4" />
                              <span>
                                § {paragraph.number} {paragraph.title}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-emerald-800 dark:text-blue-200">
                              {topic?.name || t("paragraph", "Paragraaf")}
                              {topic?.description && (
                                <div
                                  className="prose prose-sm mt-1 max-w-none text-xs text-emerald-800 dark:text-emerald-200"
                                  dangerouslySetInnerHTML={{
                                    __html: topic.description,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* 
                  {getTopicsForGoal(goal).length > 0 && (
                    <div className="space-y-2">
                      {getTopicsForGoal(goal).map((topic) => (
                        <div
                          key={topic.id}
                          className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-800/40 dark:bg-emerald-900/20"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            <BookOpenIcon className="h-4 w-4" />
                            <span>{topic.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )} */}

                  {(goal.experiment || goal.skills || goal.details) && (
                    <div className="space-y-2 border-t pt-3 dark:border-gray-700">
                      {goal.experiment && (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {t("experiment", "Experiment")}:
                          </span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {goal.experiment}
                          </span>
                        </div>
                      )}
                      {goal.skills && (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {t("skills", "Vaardigheden")}:
                          </span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {goal.skills}
                          </span>
                        </div>
                      )}
                      {goal.details && (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {t("details", "Details")}:
                          </span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {goal.details}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {goal.weekStart !== goal.weekEnd && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="gap- flex items-center">
                        <CalendarBlankIcon className="mr-1 h-3.5 w-3.5" />
                        Week {goal.weekStart}-{goal.weekEnd}
                      </span>
                    </div>
                  )}
                </div>

                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onEdit}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    title={t("edit")}
                  >
                    <PencilSimpleIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
