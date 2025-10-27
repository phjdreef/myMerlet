import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "../ui/button";
import { getCurrentWeekNumber, formatWeekRange } from "../../utils/week-utils";
import type {
  CurriculumPlan,
  StudyGoal,
} from "../../services/curriculum-database";
import {
  generateWeekSequence,
  goalCoversWeek,
  parseSchoolYear,
  getYearForWeek,
} from "../../utils/curriculum-week";

interface TimelineEditorProps {
  plan: CurriculumPlan;
  onUpdate: (plan: CurriculumPlan) => void;
}

export function TimelineEditor({ plan, onUpdate }: TimelineEditorProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const currentYear = new Date().getFullYear();
  const currentWeek = getCurrentWeekNumber();
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const schoolYears = useMemo(
    () => parseSchoolYear(plan.schoolYear),
    [plan.schoolYear],
  );
  const weekSequence = useMemo(
    () => generateWeekSequence(plan.weekRangeStart, plan.weekRangeEnd),
    [plan.weekRangeStart, plan.weekRangeEnd],
  );
  const weekSet = useMemo(() => new Set(weekSequence), [weekSequence]);
  const isCurrentWeekInRange = weekSet.has(currentWeek);

  // Auto-scroll to current week on mount
  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  // Get study goals for a specific week
  const getGoalsForWeek = useCallback(
    (weekNumber: number): StudyGoal[] => {
      return plan.studyGoals.filter((goal) => goalCoversWeek(goal, weekNumber));
    },
    [plan.studyGoals],
  );

  // Toggle week expansion
  const toggleWeek = (weekNumber: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekNumber)) {
      newExpanded.delete(weekNumber);
    } else {
      newExpanded.add(weekNumber);
    }
    setExpandedWeeks(newExpanded);
  };

  // Add new goal for a specific week
  const addGoalForWeek = (weekNumber: number) => {
    const newGoal: StudyGoal = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      weekStart: weekNumber,
      weekEnd: weekNumber,
      topicIds: [],
      paragraphIds: [],
      order: plan.studyGoals.length,
    };

    const updatedPlan = {
      ...plan,
      studyGoals: [...plan.studyGoals, newGoal],
    };
    onUpdate(updatedPlan);
    setExpandedWeeks(new Set(expandedWeeks).add(weekNumber));
  };

  // Update a goal
  const updateGoal = (goalId: string, updates: Partial<StudyGoal>) => {
    const updatedPlan = {
      ...plan,
      studyGoals: plan.studyGoals.map((g) =>
        g.id === goalId ? { ...g, ...updates } : g,
      ),
    };
    onUpdate(updatedPlan);
  };

  // Delete a goal
  const deleteGoal = (goalId: string) => {
    const updatedPlan = {
      ...plan,
      studyGoals: plan.studyGoals.filter((g) => g.id !== goalId),
    };
    onUpdate(updatedPlan);
  };

  // Toggle topic in goal
  const toggleTopicInGoal = (goalId: string, topicId: string) => {
    const goal = plan.studyGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const topicIds = goal.topicIds.includes(topicId)
      ? goal.topicIds.filter((id) => id !== topicId)
      : [...goal.topicIds, topicId];

    updateGoal(goalId, { topicIds });
  };

  // Toggle paragraph in goal
  const toggleParagraphInGoal = (goalId: string, paragraphId: string) => {
    const goal = plan.studyGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const paragraphIds = goal.paragraphIds.includes(paragraphId)
      ? goal.paragraphIds.filter((id) => id !== paragraphId)
      : [...goal.paragraphIds, paragraphId];

    updateGoal(goalId, { paragraphIds });
  };

  const formatDisplayRange = (weekNumber: number): string => {
    const yearForWeek = getYearForWeek(
      weekNumber,
      plan.weekRangeStart,
      plan.weekRangeEnd,
      schoolYears,
      currentYear,
    );
    return formatWeekRange(weekNumber, yearForWeek);
  };

  return (
    <div className="space-y-2">
      {weekSequence.map((weekNumber) => {
        const goals = getGoalsForWeek(weekNumber);
        const isExpanded = expandedWeeks.has(weekNumber);
        const hasGoals = goals.length > 0;
        const isCurrentWeek =
          isCurrentWeekInRange && weekNumber === currentWeek;

        return (
          <div
            key={weekNumber}
            ref={isCurrentWeek ? currentWeekRef : null}
            className={`rounded-lg border transition-colors ${
              isCurrentWeek
                ? "border-blue-500 bg-blue-100 shadow-md dark:border-blue-400 dark:bg-blue-900/40"
                : hasGoals
                  ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50"
            }`}
          >
            {/* Week Header */}
            <div
              className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              onClick={() => toggleWeek(weekNumber)}
            >
              <div className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <div className="text-sm font-semibold">Week {weekNumber}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDisplayRange(weekNumber)}
                  </div>
                </div>
                {hasGoals && (
                  <>
                    <div className="shrink-0 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                      {goals.length} {goals.length === 1 ? "doel" : "doelen"}
                    </div>
                    <div className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
                      {goals.map((goal, index) => (
                        <span key={goal.id}>
                          {goal.title || "Naamloze leerdoel"}
                          {index < goals.length - 1 && " • "}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    addGoalForWeek(weekNumber);
                  }}
                >
                  + Leerdoel
                </Button>
                <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="space-y-3 border-t p-3 dark:border-gray-700">
                {goals.length === 0 ? (
                  <div className="py-4 text-center text-sm text-gray-500">
                    Nog geen leerdoelen voor deze week.
                    <br />
                    Klik op "+ Leerdoel" om er een toe te voegen.
                  </div>
                ) : (
                  goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="space-y-3 rounded border bg-white p-3 dark:border-gray-600 dark:bg-gray-800"
                    >
                      {/* Title */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 rounded border p-2 text-sm font-medium"
                          value={goal.title}
                          onChange={(e) =>
                            updateGoal(goal.id, { title: e.target.value })
                          }
                          placeholder="Titel van het leerdoel"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          🗑️
                        </Button>
                      </div>

                      {/* Description */}
                      <textarea
                        className="w-full rounded border p-2 text-sm"
                        rows={2}
                        value={goal.description}
                        onChange={(e) =>
                          updateGoal(goal.id, { description: e.target.value })
                        }
                        placeholder="Beschrijving (optioneel)"
                      />

                      {/* Week Range */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium">
                            Week Start
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="52"
                            className="w-full rounded border p-1 text-sm"
                            value={goal.weekStart}
                            onChange={(e) =>
                              updateGoal(goal.id, {
                                weekStart: parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">
                            Week Eind
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="52"
                            className="w-full rounded border p-1 text-sm"
                            value={goal.weekEnd}
                            onChange={(e) =>
                              updateGoal(goal.id, {
                                weekEnd: parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* Topics */}
                      {plan.topics.length > 0 && (
                        <div>
                          <label className="mb-1 block text-xs font-medium">
                            Onderwerpen:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {plan.topics.map((topic) => (
                              <button
                                key={topic.id}
                                type="button"
                                className={`rounded border px-2 py-1 text-xs ${
                                  goal.topicIds.includes(topic.id)
                                    ? "border-blue-600 bg-blue-500 text-white"
                                    : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                                }`}
                                onClick={() =>
                                  toggleTopicInGoal(goal.id, topic.id)
                                }
                              >
                                {topic.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Paragraphs */}
                      {plan.paragraphs.length > 0 && (
                        <div>
                          <label className="mb-1 block text-xs font-medium">
                            Paragrafen:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {plan.paragraphs.map((paragraph) => (
                              <button
                                key={paragraph.id}
                                type="button"
                                className={`rounded border px-2 py-1 text-xs ${
                                  goal.paragraphIds.includes(paragraph.id)
                                    ? "border-green-600 bg-green-500 text-white"
                                    : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                                }`}
                                onClick={() =>
                                  toggleParagraphInGoal(goal.id, paragraph.id)
                                }
                              >
                                §{paragraph.number} {paragraph.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
