import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpenIcon,
  CalendarBlankIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { formatWeekRange } from "../../utils/week-utils";
import type {
  CurriculumPlan,
  StudyGoal,
  Topic,
  Paragraph,
} from "../../services/curriculum-database";
import {
  generateWeekSequence,
  goalCoversWeek,
  parseSchoolYear,
  getYearForWeek,
} from "../../utils/curriculum-week";
import { Button } from "../ui/button";

interface CurriculumTimelineProps {
  plan: CurriculumPlan;
  currentWeek: number;
  onUpdate?: (plan: CurriculumPlan) => void;
}
export function CurriculumTimeline({
  plan,
  currentWeek,
  onUpdate,
}: CurriculumTimelineProps) {
  const { t } = useTranslation();
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [pendingGoals, setPendingGoals] = useState<
    Record<number, StudyGoal | undefined>
  >({});
  const currentWeekRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    startTransition(() => {
      setEditingWeek(null);
      setPendingGoals({});
    });
    hasAutoScrolledRef.current = false;
  }, [plan.id]);

  const weekSequence = useMemo(
    () => generateWeekSequence(plan.weekRangeStart, plan.weekRangeEnd),
    [plan.weekRangeEnd, plan.weekRangeStart],
  );

  const schoolYears = useMemo(
    () => parseSchoolYear(plan.schoolYear),
    [plan.schoolYear],
  );

  const fallbackYear = useMemo(() => {
    if (typeof plan.schoolYearStart === "number") {
      return plan.schoolYearStart;
    }
    if (typeof schoolYears.startYear === "number") {
      return schoolYears.startYear;
    }
    return new Date().getFullYear();
  }, [plan.schoolYearStart, schoolYears.startYear]);

  const isCurrentWeekInRange = useMemo(
    () =>
      goalCoversWeek(
        {
          weekStart: plan.weekRangeStart,
          weekEnd: plan.weekRangeEnd,
        },
        currentWeek,
      ),
    [currentWeek, plan.weekRangeEnd, plan.weekRangeStart],
  );

  const sortedGoals = useMemo(() => {
    return [...plan.studyGoals].sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 0;
      const orderB = typeof b.order === "number" ? b.order : 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.title.localeCompare(b.title);
    });
  }, [plan.studyGoals]);

  const goalsByWeek = useMemo(() => {
    const map = new Map<number, StudyGoal[]>();
    weekSequence.forEach((week) => {
      map.set(
        week,
        sortedGoals.filter((goal) => goalCoversWeek(goal, week)),
      );
    });
    return map;
  }, [sortedGoals, weekSequence]);

  const topicsById = useMemo(() => {
    const map = new Map<string, Topic>();
    plan.topics.forEach((topic) => {
      map.set(topic.id, topic);
    });
    return map;
  }, [plan.topics]);

  const paragraphsById = useMemo(() => {
    const map = new Map<string, Paragraph>();
    plan.paragraphs.forEach((paragraph) => {
      map.set(paragraph.id, paragraph);
    });
    return map;
  }, [plan.paragraphs]);

  const getGoalsForWeek = useCallback(
    (weekNumber: number) => goalsByWeek.get(weekNumber) ?? [],
    [goalsByWeek],
  );

  const formatDisplayRange = useCallback(
    (weekNumber: number) => {
      const yearForWeek = getYearForWeek(
        weekNumber,
        plan.weekRangeStart,
        plan.weekRangeEnd,
        schoolYears,
        fallbackYear,
      );
      return formatWeekRange(weekNumber, yearForWeek);
    },
    [fallbackYear, plan.weekRangeEnd, plan.weekRangeStart, schoolYears],
  );

  const clearPendingForWeek = useCallback((weekNumber: number) => {
    setPendingGoals((prev) => {
      if (!(weekNumber in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[weekNumber];
      return next;
    });
  }, []);

  const updatePendingCachedGoal = useCallback(
    (goalId: string, updates: Partial<StudyGoal>) => {
      setPendingGoals((prev) => {
        let hasChanges = false;
        const next: Record<number, StudyGoal | undefined> = {};

        Object.entries(prev).forEach(([weekKey, pending]) => {
          const weekNumber = Number(weekKey);
          if (pending?.id === goalId) {
            next[weekNumber] = { ...pending, ...updates } as StudyGoal;
            hasChanges = true;
          } else {
            next[weekNumber] = pending;
          }
        });

        return hasChanges ? next : prev;
      });
    },
    [],
  );

  const addGoalForWeek = useCallback(
    (weekNumber: number) => {
      if (!onUpdate) {
        return;
      }

      const nextOrder =
        plan.studyGoals.reduce((max, goal) => {
          const orderValue = typeof goal.order === "number" ? goal.order : max;
          return orderValue > max ? orderValue : max;
        }, -1) + 1;

      const newGoal: StudyGoal = {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        weekStart: weekNumber,
        weekEnd: weekNumber,
        topicIds: [],
        paragraphIds: [],
        order: nextOrder,
      };

      onUpdate({
        ...plan,
        studyGoals: [...plan.studyGoals, newGoal],
        updatedAt: new Date().toISOString(),
      });

      setPendingGoals((prev) => ({ ...prev, [weekNumber]: newGoal }));
      setEditingWeek(weekNumber);
    },
    [onUpdate, plan],
  );

  const updateGoal = useCallback(
    (goalId: string, updates: Partial<StudyGoal>) => {
      if (onUpdate) {
        onUpdate({
          ...plan,
          studyGoals: plan.studyGoals.map((goal) =>
            goal.id === goalId ? { ...goal, ...updates } : goal,
          ),
          updatedAt: new Date().toISOString(),
        });
      }

      updatePendingCachedGoal(goalId, updates);
    },
    [onUpdate, plan, updatePendingCachedGoal],
  );

  const deleteGoal = useCallback(
    (goalId: string) => {
      if (onUpdate) {
        onUpdate({
          ...plan,
          studyGoals: plan.studyGoals.filter((goal) => goal.id !== goalId),
          updatedAt: new Date().toISOString(),
        });
      }

      setPendingGoals((prev) => {
        let hasChanges = false;
        const next: Record<number, StudyGoal | undefined> = {};

        Object.entries(prev).forEach(([weekKey, pending]) => {
          const weekNumber = Number(weekKey);
          if (pending?.id === goalId) {
            hasChanges = true;
            return;
          }
          next[weekNumber] = pending;
        });

        return hasChanges ? next : prev;
      });
    },
    [onUpdate, plan],
  );

  const toggleTopicInGoal = useCallback(
    (goalId: string, topicId: string) => {
      const goal =
        plan.studyGoals.find((g) => g.id === goalId) ||
        Object.values(pendingGoals).find((pending) => pending?.id === goalId);

      if (!goal) {
        return;
      }

      const topicIds = goal.topicIds.includes(topicId)
        ? goal.topicIds.filter((id) => id !== topicId)
        : [...goal.topicIds, topicId];

      updateGoal(goalId, { topicIds });
    },
    [pendingGoals, plan.studyGoals, updateGoal],
  );

  const toggleParagraphInGoal = useCallback(
    (goalId: string, paragraphId: string) => {
      const goal =
        plan.studyGoals.find((g) => g.id === goalId) ||
        Object.values(pendingGoals).find((pending) => pending?.id === goalId);

      if (!goal) {
        return;
      }

      const paragraphIds = goal.paragraphIds.includes(paragraphId)
        ? goal.paragraphIds.filter((id) => id !== paragraphId)
        : [...goal.paragraphIds, paragraphId];

      updateGoal(goalId, { paragraphIds });
    },
    [pendingGoals, plan.studyGoals, updateGoal],
  );

  const getTopicsForGoal = useCallback(
    (goal: StudyGoal) =>
      goal.topicIds
        .map((topicId) => topicsById.get(topicId))
        .filter((topic): topic is Topic => Boolean(topic)),
    [topicsById],
  );

  const getParagraphsForGoal = useCallback(
    (goal: StudyGoal) => {
      const labels = goal.paragraphIds
        .map((paragraphId) => paragraphsById.get(paragraphId))
        .filter((paragraph): paragraph is Paragraph => Boolean(paragraph))
        .map((paragraph) => `§${paragraph.number} ${paragraph.title}`);

      return labels.length > 0 ? labels.join(", ") : null;
    },
    [paragraphsById],
  );

  useEffect(() => {
    startTransition(() => {
      setPendingGoals((prev) => {
        const validIds = new Set(plan.studyGoals.map((goal) => goal.id));
        let hasChanges = false;
        const next: Record<number, StudyGoal | undefined> = {};

        Object.entries(prev).forEach(([weekKey, pending]) => {
          const weekNumber = Number(weekKey);
          if (pending && !validIds.has(pending.id)) {
            hasChanges = true;
            return;
          }
          next[weekNumber] = pending;
        });

        return hasChanges ? next : prev;
      });
    });
  }, [plan.studyGoals]);

  useLayoutEffect(() => {
    if (!isCurrentWeekInRange) {
      return;
    }

    if (hasAutoScrolledRef.current) {
      return;
    }

    const node = currentWeekRef.current;
    if (!node) {
      return;
    }

    // Use a small timeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      node.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      hasAutoScrolledRef.current = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [isCurrentWeekInRange, plan.id, weekSequence]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-3 dark:text-gray-300">
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {t("subject")}
            </span>
            : {plan.subject || t("unknown")}
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {t("class")}
            </span>
            : {plan.classNames.join(", ") || t("unknown")}
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {t("schoolYear")}
            </span>
            : {plan.schoolYear || t("unknown")}
          </div>
          {(() => {
            const startYear = plan.schoolYearStart ?? schoolYears.startYear;
            const endYear = plan.schoolYearEnd ?? schoolYears.endYear;
            if (!startYear) {
              return null;
            }
            return (
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-200">
                  {t("schoolYearStartLabel")}
                </span>
                :{` ${startYear}${endYear ? ` → ${endYear}` : ""}`}
              </div>
            );
          })()}
          <div>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {t("weeks")}
            </span>
            : {plan.weekRangeStart} - {plan.weekRangeEnd}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {weekSequence.map((weekNumber) => {
          const goals = getGoalsForWeek(weekNumber);
          const pendingGoal = pendingGoals[weekNumber];
          const mergedGoals =
            pendingGoal && !goals.some((goal) => goal.id === pendingGoal.id)
              ? [...goals, pendingGoal]
              : goals;
          const isEditing =
            editingWeek === weekNumber || pendingGoal !== undefined;
          const displayGoals = isEditing ? mergedGoals : goals;
          const isCurrentWeek =
            isCurrentWeekInRange && weekNumber === currentWeek;
          const hasGoals = displayGoals.length > 0;

          return (
            <div
              key={weekNumber}
              className={`flex gap-4 rounded-xl border p-4 shadow-sm transition-colors ${
                isCurrentWeek
                  ? "border-2 border-blue-500 bg-blue-50/50 ring-2 ring-blue-400/30 dark:border-blue-400 dark:bg-blue-900/40 dark:ring-blue-500/40"
                  : hasGoals
                    ? "border border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-900/50"
                    : "border border-dashed border-gray-200 bg-white/80 dark:bg-gray-900/50"
              }`}
              ref={isCurrentWeek ? currentWeekRef : undefined}
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
                {isEditing ? (
                  mergedGoals.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4 text-sm text-gray-500 italic dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                      <span>{t("emptyWeek", "Geen planning")}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mergedGoals.map((goal, index) => {
                        const isPending = pendingGoal?.id === goal.id;
                        const autoFocus =
                          index === mergedGoals.length - 1 &&
                          (goal.title ?? "").trim() === "";

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
                                      updateGoal(goal.id, {
                                        title: e.target.value,
                                      })
                                    }
                                    placeholder={
                                      t("studyGoalTitlePlaceholder") ??
                                      "Titel van het leerdoel"
                                    }
                                    autoFocus={autoFocus}
                                  />
                                  {isPending && (
                                    <p className="text-xs text-blue-500 dark:text-blue-300">
                                      {t(
                                        "unsavedGoalHint",
                                        "Nog niet opgeslagen",
                                      )}
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                                    {t("description")}
                                  </label>
                                  <textarea
                                    className="min-h-20 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                    value={goal.description ?? ""}
                                    onChange={(e) =>
                                      updateGoal(goal.id, {
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
                                        updateGoal(goal.id, {
                                          weekStart:
                                            Number(e.target.value) || 1,
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
                                        updateGoal(goal.id, {
                                          weekEnd: Number(e.target.value) || 1,
                                        })
                                      }
                                    />
                                  </div>
                                </div>

                                {plan.topics.length > 0 && (
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                                      {t("topics")}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                      {plan.topics.map((topic) => {
                                        const isSelected =
                                          goal.topicIds.includes(topic.id);
                                        return (
                                          <button
                                            key={topic.id}
                                            type="button"
                                            onClick={() =>
                                              toggleTopicInGoal(
                                                goal.id,
                                                topic.id,
                                              )
                                            }
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                              isSelected
                                                ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                                                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                                            } dark:${
                                              isSelected
                                                ? "border-blue-400 bg-blue-600 text-white"
                                                : "border-gray-700 bg-gray-800/80 text-gray-200 hover:border-blue-500/60"
                                            }`}
                                          >
                                            {topic.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {plan.paragraphs.length > 0 && (
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                                      {t("paragraphs")}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                      {plan.paragraphs.map((paragraph) => {
                                        const isSelected =
                                          goal.paragraphIds.includes(
                                            paragraph.id,
                                          );
                                        return (
                                          <button
                                            key={paragraph.id}
                                            type="button"
                                            onClick={() =>
                                              toggleParagraphInGoal(
                                                goal.id,
                                                paragraph.id,
                                              )
                                            }
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                              isSelected
                                                ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                                                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50"
                                            } dark:${
                                              isSelected
                                                ? "border-emerald-400 bg-emerald-600 text-white"
                                                : "border-gray-700 bg-gray-800/80 text-gray-200 hover:border-emerald-500/60"
                                            }`}
                                          >
                                            §{paragraph.number}{" "}
                                            {paragraph.title}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-start gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteGoal(goal.id)}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const shouldDeletePending =
                              pendingGoal &&
                              mergedGoals.some((goal) => {
                                if (goal.id !== pendingGoal.id) {
                                  return false;
                                }
                                const hasContent =
                                  (goal.title ?? "").trim().length > 0 ||
                                  (goal.description ?? "").trim().length > 0 ||
                                  goal.topicIds.length > 0 ||
                                  goal.paragraphIds.length > 0;
                                return !hasContent;
                              });

                            if (shouldDeletePending && pendingGoal?.id) {
                              deleteGoal(pendingGoal.id);
                            }

                            clearPendingForWeek(weekNumber);
                            setEditingWeek(null);
                          }}
                        >
                          {t("doneEditing", "Klaar met bewerken")}
                        </Button>
                      </div>
                    </div>
                  )
                ) : goals.length === 0 ? (
                  <div className="group flex items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4 text-sm text-gray-500 italic dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                    <span>{t("emptyWeek", "Geen planning")}</span>
                    {onUpdate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addGoalForWeek(weekNumber)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        title={t("addStudyGoal")}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  displayGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="group relative rounded-lg border border-gray-200 bg-white/90 p-4 shadow-sm transition hover:border-blue-200 dark:border-gray-700 dark:bg-gray-900/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {goal.title ||
                              t("untitledGoal", "Naamloos leerdoel")}
                          </div>
                          {goal.description && (
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {goal.description}
                            </div>
                          )}

                          {getTopicsForGoal(goal).length > 0 && (
                            <div className="space-y-2">
                              {getTopicsForGoal(goal).map((topic) => (
                                <div
                                  key={topic.id}
                                  className="rounded-lg border border-blue-200/60 bg-blue-50/50 p-3 dark:border-blue-800/40 dark:bg-blue-900/20"
                                >
                                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                                    <BookOpenIcon className="h-4 w-4" />
                                    <span>{topic.name}</span>
                                  </div>
                                  {topic.description && (
                                    <div
                                      className="prose prose-sm mt-1 max-w-none text-xs text-blue-800 dark:text-blue-200"
                                      dangerouslySetInnerHTML={{
                                        __html: topic.description,
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                            {(() => {
                              const paragraphsLabel =
                                getParagraphsForGoal(goal);
                              if (!paragraphsLabel) {
                                return null;
                              }
                              return <span>{paragraphsLabel}</span>;
                            })()}
                            {goal.weekStart !== goal.weekEnd && (
                              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <CalendarBlankIcon className="h-3.5 w-3.5" />
                                Week {goal.weekStart}-{goal.weekEnd}
                              </span>
                            )}
                          </div>
                        </div>

                        {onUpdate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingWeek(weekNumber)}
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
        })}
      </div>
    </div>
  );
}
