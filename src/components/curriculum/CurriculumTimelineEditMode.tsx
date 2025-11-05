import { useTranslation } from "react-i18next";
import { TrashIcon } from "@phosphor-icons/react";
import type {
  CurriculumPlan,
  StudyGoal,
} from "../../services/curriculum-database";
import { Button } from "../ui/button";

interface CurriculumTimelineEditModeProps {
  plan: CurriculumPlan;
  weekNumber: number;
  goals: StudyGoal[];
  isCurrentWeek: boolean;
  formatDisplayRange: (weekNumber: number) => string;
  currentWeekRef?: React.RefObject<HTMLDivElement | null>;
  onUpdateGoal: (goalId: string, updates: Partial<StudyGoal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleParagraph: (goalId: string, paragraphId: string) => void;
  onToggleTopic: (goalId: string, topicId: string) => void;
  onDoneEditing: () => void;
}

export function CurriculumTimelineEditMode({
  plan,
  weekNumber,
  goals,
  isCurrentWeek,
  formatDisplayRange,
  currentWeekRef,
  onUpdateGoal,
  onDeleteGoal,
  onToggleParagraph,
  onToggleTopic,
  onDoneEditing,
}: CurriculumTimelineEditModeProps) {
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
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4 text-sm text-gray-500 italic dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            <span>{t("emptyWeek", "Geen planning")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal, index) => {
              const autoFocus =
                index === goals.length - 1 && (goal.title ?? "").trim() === "";

              return (
                <div
                  key={goal.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          {t("studyGoalTitle", "Leerdoel")}
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          value={goal.title}
                          onChange={(e) =>
                            onUpdateGoal(goal.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder={
                            t("studyGoalTitlePlaceholder") ??
                            "Titel van het leerdoel"
                          }
                          autoFocus={autoFocus}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          {t("description")}
                        </label>
                        <textarea
                          className="min-h-20 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          value={goal.description ?? ""}
                          onChange={(e) =>
                            onUpdateGoal(goal.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder={
                            t("studyGoalDescriptionPlaceholder") ??
                            "Beschrijving (optioneel)"
                          }
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                            {t("weekStart")}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="52"
                            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            value={goal.weekStart}
                            onChange={(e) =>
                              onUpdateGoal(goal.id, {
                                weekStart: Number(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                            {t("weekEnd")}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="52"
                            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            value={goal.weekEnd}
                            onChange={(e) =>
                              onUpdateGoal(goal.id, {
                                weekEnd: Number(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      </div>

                      {plan.paragraphs.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                            {t("paragraphs")}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {plan.paragraphs.map((paragraph) => {
                              const isSelected = goal.paragraphIds.includes(
                                paragraph.id,
                              );
                              return (
                                <button
                                  key={paragraph.id}
                                  type="button"
                                  onClick={() =>
                                    onToggleParagraph(goal.id, paragraph.id)
                                  }
                                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-500 text-white shadow-sm dark:border-blue-400 dark:bg-blue-600"
                                      : "dark:hover:bg-gray-550 border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:border-blue-500/60"
                                  }`}
                                >
                                  § {paragraph.number} {paragraph.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {plan.topics.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                            {t("topics")}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {plan.topics.map((topic) => {
                              const isSelected = goal.topicIds.includes(
                                topic.id,
                              );
                              return (
                                <button
                                  key={topic.id}
                                  type="button"
                                  onClick={() =>
                                    onToggleTopic(goal.id, topic.id)
                                  }
                                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    isSelected
                                      ? "border-emerald-900 bg-emerald-800 text-white shadow-sm dark:border-emerald-400 dark:bg-emerald-600"
                                      : "dark:hover:bg-gray-550 border-gray-200 bg-gray-50 text-gray-700 hover:border-emerald-800 hover:bg-emerald-50 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-100 dark:hover:border-emerald-500/60"
                                  }`}
                                >
                                  {topic.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          {t("experiment", "Experiment")}
                        </label>
                        <textarea
                          className="min-h-16 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          value={goal.experiment ?? ""}
                          onChange={(e) =>
                            onUpdateGoal(goal.id, {
                              experiment: e.target.value,
                            })
                          }
                          placeholder={t(
                            "experimentPlaceholder",
                            "Experiment (optioneel)",
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          {t("skills", "Vaardigheden")}
                        </label>
                        <textarea
                          className="min-h-16 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          value={goal.skills ?? ""}
                          onChange={(e) =>
                            onUpdateGoal(goal.id, {
                              skills: e.target.value,
                            })
                          }
                          placeholder={t(
                            "skillsPlaceholder",
                            "Vaardigheden (optioneel)",
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          {t("details", "Details")}
                        </label>
                        <textarea
                          className="min-h-16 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          value={goal.details ?? ""}
                          onChange={(e) =>
                            onUpdateGoal(goal.id, {
                              details: e.target.value,
                            })
                          }
                          placeholder={t(
                            "detailsPlaceholder",
                            "Details (optioneel)",
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteGoal(goal.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        title={t("delete")}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={onDoneEditing}>
                {t("doneEditing", "Klaar met bewerken")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
