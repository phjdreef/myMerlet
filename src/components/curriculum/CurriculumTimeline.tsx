import { useEffect, useRef } from "react";
import { formatWeekRange } from "../../utils/week-utils";
import type {
  CurriculumPlan,
  StudyGoal,
  Topic,
} from "../../services/curriculum-database";

interface CurriculumTimelineProps {
  plan: CurriculumPlan;
  currentWeek: number;
}

export function CurriculumTimeline({
  plan,
  currentWeek,
}: CurriculumTimelineProps) {
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  // Auto-scroll to current week on mount
  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [plan.id]);

  // Get all weeks that have study goals
  const weeks = new Set<number>();
  plan.studyGoals.forEach((goal) => {
    for (let week = goal.weekStart; week <= goal.weekEnd; week++) {
      weeks.add(week);
    }
  });

  // Generate a complete week range (1-52)
  const allWeeks = Array.from({ length: 52 }, (_, i) => i + 1);

  // Get study goals for a specific week
  const getGoalsForWeek = (weekNumber: number): StudyGoal[] => {
    return plan.studyGoals.filter(
      (goal) => weekNumber >= goal.weekStart && weekNumber <= goal.weekEnd,
    );
  };

  // Get topics for a study goal
  const getTopicsForGoal = (
    goal: StudyGoal,
  ): { name: string; description?: string }[] => {
    if (goal.topicIds.length === 0) return [];
    return goal.topicIds
      .map((id) => plan.topics.find((t) => t.id === id))
      .filter((topic): topic is Topic => topic !== undefined);
  };

  // Get paragraphs for a study goal
  const getParagraphsForGoal = (goal: StudyGoal): string => {
    if (goal.paragraphIds.length === 0) return "";
    const paragraphs = goal.paragraphIds
      .map((id) => plan.paragraphs.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => `§${p!.number}`);
    return paragraphs.length > 0 ? `📖 ${paragraphs.join(", ")}` : "";
  };

  return (
    <div className="flex-1 overflow-auto rounded-lg border p-4">
      <div className="space-y-3">
        {allWeeks.map((weekNumber) => {
          const goals = getGoalsForWeek(weekNumber);
          const isCurrentWeek = weekNumber === currentWeek;
          const hasGoals = goals.length > 0;

          return (
            <div
              key={weekNumber}
              ref={isCurrentWeek ? currentWeekRef : null}
              className={`flex gap-4 rounded-lg p-3 transition-colors ${
                isCurrentWeek
                  ? "border-2 border-blue-500 bg-blue-100 dark:bg-blue-900"
                  : hasGoals
                    ? "bg-gray-50 dark:bg-gray-800"
                    : "bg-transparent"
              }`}
            >
              <div className="w-32 shrink-0">
                <div className="text-sm font-semibold">
                  Week {weekNumber}
                  {isCurrentWeek && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      (Huidige)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {formatWeekRange(weekNumber, currentYear)}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {goals.length === 0 ? (
                  <div className="text-sm text-gray-400 italic">
                    Geen planning
                  </div>
                ) : (
                  goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="rounded border bg-white p-3 dark:bg-gray-700"
                    >
                      <div className="font-medium">{goal.title}</div>
                      {goal.description && (
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {goal.description}
                        </div>
                      )}

                      {/* Topics with descriptions */}
                      {getTopicsForGoal(goal).length > 0 && (
                        <div className="mt-3 space-y-2">
                          {getTopicsForGoal(goal).map((topic) => (
                            <div
                              key={topic.name}
                              className="rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/30"
                            >
                              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                📚 {topic.name}
                              </div>
                              {topic.description && (
                                <div
                                  className="prose prose-sm mt-1 max-w-none text-xs text-gray-700 dark:text-gray-300"
                                  dangerouslySetInnerHTML={{
                                    __html: topic.description,
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {getParagraphsForGoal(goal) && (
                          <span>{getParagraphsForGoal(goal)}</span>
                        )}
                        {goal.weekStart !== goal.weekEnd && (
                          <span className="text-orange-600 dark:text-orange-400">
                            📅 Week {goal.weekStart}-{goal.weekEnd}
                          </span>
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
