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
import { formatWeekRange } from "../../utils/week-utils";
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
import { CurriculumTimelineReadMode } from "./CurriculumTimelineReadMode";
import { CurriculumTimelineEditMode } from "./CurriculumTimelineEditMode";

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

  const getBlockedWeekInfo = useCallback(
    (weekNumber: number) => {
      return plan.blockedWeeks.find((bw) => bw.weekNumber === weekNumber);
    },
    [plan.blockedWeeks],
  );

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
          const blockedWeekInfo = getBlockedWeekInfo(weekNumber);

          const handleDoneEditing = () => {
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
          };

          return isEditing ? (
            <CurriculumTimelineEditMode
              key={weekNumber}
              plan={plan}
              weekNumber={weekNumber}
              goals={displayGoals}
              isCurrentWeek={isCurrentWeek}
              blockedWeekInfo={blockedWeekInfo}
              formatDisplayRange={formatDisplayRange}
              currentWeekRef={isCurrentWeek ? currentWeekRef : undefined}
              onUpdateGoal={updateGoal}
              onDeleteGoal={deleteGoal}
              onToggleParagraph={toggleParagraphInGoal}
              onToggleTopic={toggleTopicInGoal}
              onDoneEditing={handleDoneEditing}
            />
          ) : (
            <CurriculumTimelineReadMode
              key={weekNumber}
              plan={plan}
              weekNumber={weekNumber}
              goals={goals}
              isCurrentWeek={isCurrentWeek}
              blockedWeekInfo={blockedWeekInfo}
              formatDisplayRange={formatDisplayRange}
              currentWeekRef={isCurrentWeek ? currentWeekRef : undefined}
              onEdit={onUpdate ? () => setEditingWeek(weekNumber) : undefined}
              onAddGoal={
                onUpdate ? () => addGoalForWeek(weekNumber) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
