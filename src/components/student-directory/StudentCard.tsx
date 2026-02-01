import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Student } from "@/services/student-database";
import { StudentPhoto } from "./StudentPhoto";
import type { StudentGrade, Test } from "@/services/test-database";
import { formatStudentName } from "@/helpers/student_helpers";
import { logger } from "@/utils/logger";

interface StudentCardProps {
  student: Student;
  selectedClass?: string | null;
}

export function StudentCard({ student, selectedClass }: StudentCardProps) {
  const { t } = useTranslation();
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [tests, setTests] = useState<Map<string, Test>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClass) {
      loadGrades();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, selectedClass]);

  const loadGrades = async () => {
    if (!selectedClass) return;

    setLoading(true);
    try {
      const gradesResult = await window.testAPI.getGradesForStudent(
        student.id,
        selectedClass,
      );

      if (gradesResult.success && gradesResult.data) {
        const gradesData = gradesResult.data as StudentGrade[];
        setGrades(gradesData);

        // Load test details for each grade
        const testsMap = new Map<string, Test>();
        for (const grade of gradesData) {
          const testResult = await window.testAPI.getTest(grade.testId);
          if (testResult.success && testResult.data) {
            testsMap.set(grade.testId, testResult.data as Test);
          }
        }
        setTests(testsMap);
      }
    } catch (error) {
      logger.error("Failed to load student grades:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-3 flex gap-3">
        {/* Student Photo */}
        <div className="shrink-0">
          <StudentPhoto student={student} />
        </div>

        {/* Student Info */}
        <div className="grow">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium">{student.roepnaam}</h3>
              <p className="text-muted-foreground text-sm">
                {formatStudentName(student, {
                  preferVoorletters: true,
                  includeRoepnaam: false,
                })}
              </p>
            </div>
            <span className="bg-secondary rounded px-2 py-1 text-xs">
              {t("idLabel")}: {student.id}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <strong>{t("code")}:</strong> {student.code}
        </p>
        <p>
          <strong>{t("email")}:</strong> {student.emailadres}
        </p>

        {student.klassen && student.klassen.length > 0 && (
          <p>
            <strong>{t("classesLabel")}:</strong> {student.klassen.join(", ")}
          </p>
        )}

        {student.studies && student.studies.length > 0 && (
          <p>
            <strong>{t("studiesLabel")}:</strong> {student.studies.join(", ")}
          </p>
        )}
        {student.lesgroepen && student.lesgroepen.length > 0 && (
          <p>
            <strong>{t("groupsLabel")}:</strong> {student.lesgroepen.join(", ")}
          </p>
        )}
      </div>

      {/* Test Grades Section */}
      {selectedClass && (
        <div className="mt-3 border-t pt-3">
          <h4 className="mb-2 text-sm font-semibold">{t("tests")}</h4>
          {loading ? (
            <p className="text-muted-foreground text-xs">{t("loading")}</p>
          ) : grades.length > 0 ? (
            <div className="space-y-1.5">
              {grades
                .filter(
                  (grade) =>
                    (grade.pointsEarned ?? 0) > 0 ||
                    grade.manualOverride !== undefined,
                )
                .map((grade) => {
                  const test = tests.get(grade.testId);
                  if (!test) return null;

                  return (
                    <div
                      key={grade.id}
                      className="bg-muted/50 flex items-center justify-between rounded px-2 py-1.5 text-xs"
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <StudentPhoto student={student} size="small" />
                        <div className="flex-1">
                          <div className="font-medium">{test.name}</div>
                          <div className="text-muted-foreground">
                            {grade.pointsEarned ?? 0}/{test.maxPoints}{" "}
                            {t("points")}
                            {grade.manualOverride && (
                              <span className="ml-1 text-blue-600">
                                ({t("manualOverride")})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`ml-2 text-base font-bold ${
                          grade.finalGrade >= 5.5
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {grade.finalGrade.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              {/* Weighted Grade Average */}
              {grades.filter(
                (g) =>
                  (g.pointsEarned ?? 0) > 0 || g.manualOverride !== undefined,
              ).length > 1 &&
                (() => {
                  const validGrades = grades.filter(
                    (g) =>
                      (g.pointsEarned ?? 0) > 0 ||
                      g.manualOverride !== undefined,
                  );

                  // Calculate weighted average
                  const totalWeightedGrade = validGrades.reduce(
                    (sum, grade) => {
                      const test = tests.get(grade.testId);
                      const weight = test?.weight || 1;
                      return sum + grade.finalGrade * weight;
                    },
                    0,
                  );

                  const totalWeight = validGrades.reduce((sum, grade) => {
                    const test = tests.get(grade.testId);
                    return sum + (test?.weight || 1);
                  }, 0);

                  const weightedAverage = totalWeightedGrade / totalWeight;

                  return (
                    <div className="mt-2 flex items-center justify-between border-t pt-1.5 text-xs font-semibold">
                      <span>{t("average")}:</span>
                      <span
                        className={
                          weightedAverage >= 5.5
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {weightedAverage.toFixed(1)}
                      </span>
                    </div>
                  );
                })()}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">{t("noTestsYet")}</p>
          )}
        </div>
      )}
    </div>
  );
}
