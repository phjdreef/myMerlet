import { useTranslation } from "react-i18next";
import type { Test } from "@/services/test-database";
import type { Student } from "@/services/student-database";
import { formatStudentName } from "@/helpers/student_helpers";
import { StudentPhoto } from "@/components/student-directory/StudentPhoto";
import type { GradeEntryFormEntry } from "./types";

interface GradeEntryTableProps {
  test: Test;
  students: Student[];
  entries: Map<number, GradeEntryFormEntry>;
  readOnly: boolean;
  getStudentLevel: (student: Student) => string | null;
  getNormeringForStudent: (student: Student) => {
    nTerm: number;
    maxPoints: number;
    cvteCalculationMode: "legacy" | "main" | "official";
  };
  onPointsChange: (studentId: number, student: Student, points: string) => void;
  onElementGradeChange: (
    studentId: number,
    elementId: string,
    points: string,
  ) => void;
  onManualOverrideChange: (studentId: number, override: string) => void;
}

export function GradeEntryTable({
  test,
  students,
  entries,
  readOnly,
  getStudentLevel,
  getNormeringForStudent,
  onPointsChange,
  onElementGradeChange,
  onManualOverrideChange,
}: GradeEntryTableProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-hidden rounded-lg border">
      <div className="h-full overflow-auto pr-2">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="bg-muted/50 p-3 text-left font-medium">#</th>
              <th className="bg-muted/50 p-3 text-left font-medium">
                {t("photo")}
              </th>
              <th className="bg-muted/50 p-3 text-left font-medium">
                {t("studentName")}
              </th>
              {test.levelNormerings &&
                Object.keys(test.levelNormerings).length > 0 && (
                  <th className="bg-muted/50 p-3 text-left font-medium">
                    {t("level")}
                  </th>
                )}
              {test.testType === "cvte" ? (
                <th className="bg-muted/50 p-3 text-left font-medium">
                  {t("pointsEarned")}
                  {test.levelNormerings &&
                  Object.keys(test.levelNormerings).length > 0 ? (
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      ({t("levelSpecific")})
                    </span>
                  ) : (
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      (max: {test.maxPoints})
                    </span>
                  )}
                </th>
              ) : (
                test.elements?.map((element) => (
                  <th
                    key={element.id}
                    className="bg-muted/50 p-3 text-left font-medium"
                  >
                    {element.name}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      (max: {element.maxPoints})
                    </span>
                  </th>
                ))
              )}
              <th className="bg-muted/50 p-3 text-left font-medium">
                {t("calculatedGrade")}
              </th>
              <th className="bg-muted/50 p-3 text-left font-medium">
                {t("manualOverride")}
              </th>
              <th className="bg-muted/50 p-3 text-left font-medium">
                {t("finalGrade")}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              const entry = entries.get(student.id) || {
                pointsEarned: undefined,
                elementGrades: [],
                calculatedGrade: null,
                finalGrade: null,
              };

              const studentLevel = getStudentLevel(student);
              const hasLevelNormerings =
                test.levelNormerings &&
                Object.keys(test.levelNormerings).length > 0;
              const missingLevelNormering =
                hasLevelNormerings &&
                studentLevel &&
                !test.levelNormerings?.[studentLevel];

              return (
                <tr
                  key={student.id}
                  className="hover:bg-muted/30 border-t transition-colors"
                >
                  <td className="text-muted-foreground p-3">{index + 1}</td>
                  <td className="p-3">
                    <div className="h-10 w-10">
                      <StudentPhoto student={student} size="small" />
                    </div>
                  </td>
                  <td className="p-3">{formatStudentName(student)}</td>

                  {hasLevelNormerings && (
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {studentLevel ? (
                          <span
                            className={
                              missingLevelNormering
                                ? "font-medium text-orange-600 dark:text-orange-400"
                                : "font-medium text-green-600 dark:text-green-400"
                            }
                            title={
                              missingLevelNormering
                                ? t("missingLevelNormering")
                                : t("levelSpecificNormeringActive")
                            }
                          >
                            {studentLevel}
                          </span>
                        ) : (
                          <span
                            className="cursor-help font-medium text-orange-600 dark:text-orange-400"
                            title={t("noLevelDetected")}
                          >
                            -
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {test.testType === "cvte" && (
                    <td className="p-3">
                      {readOnly ? (
                        <span>
                          {entry.pointsEarned !== undefined
                            ? entry.pointsEarned
                            : "-"}
                        </span>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={getNormeringForStudent(student).maxPoints}
                            step="0.5"
                            value={entry.pointsEarned ?? ""}
                            onChange={(e) =>
                              onPointsChange(student.id, student, e.target.value)
                            }
                            className={`w-20 rounded border px-2 py-1 ${
                              (entry.pointsEarned ?? 0) >
                              (getNormeringForStudent(student).maxPoints ?? 0)
                                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                : ""
                            }`}
                            title={
                              (entry.pointsEarned ?? 0) >
                              (getNormeringForStudent(student).maxPoints ?? 0)
                                ? `${t("pointsExceedMax")}: ${getNormeringForStudent(student).maxPoints}`
                                : undefined
                            }
                          />
                          {(entry.pointsEarned ?? 0) >
                            (getNormeringForStudent(student).maxPoints ?? 0) && (
                            <span
                              className="absolute top-1/2 -right-6 -translate-y-1/2 cursor-help text-lg text-red-600"
                              title={`${t("pointsExceedMax")}: ${getNormeringForStudent(student).maxPoints}`}
                            >
                              ⚠️
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  )}

                  {test.testType === "composite" &&
                    test.elements?.map((element) => {
                      const elementGrade = entry.elementGrades?.find(
                        (g) => g.elementId === element.id,
                      );
                      const elementPoints = elementGrade?.pointsEarned;
                      const elementPointsValue = elementGrade?.pointsEarned ?? 0;

                      return (
                        <td key={element.id} className="p-3">
                          {readOnly ? (
                            <span>
                              {elementPoints !== undefined ? elementPoints : "-"}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max={element.maxPoints}
                              step="0.5"
                              value={elementPoints ?? ""}
                              onChange={(e) =>
                                onElementGradeChange(
                                  student.id,
                                  element.id,
                                  e.target.value,
                                )
                              }
                              className={`w-20 rounded border px-2 py-1 ${
                                elementPointsValue > element.maxPoints
                                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                  : ""
                              }`}
                            />
                          )}
                        </td>
                      );
                    })}

                  <td className="p-3">
                    <span className="font-medium">
                      {entry.calculatedGrade !== null && entry.calculatedGrade !== 0
                        ? entry.calculatedGrade.toFixed(2)
                        : "-"}
                    </span>
                  </td>

                  <td className="p-3">
                    {readOnly ? (
                      entry.manualOverride !== undefined ? (
                        <span>{entry.manualOverride.toFixed(1)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )
                    ) : (
                      <input
                        type="number"
                        min="1"
                        max="10"
                        step="0.1"
                        tabIndex={-1}
                        value={entry.manualOverride ?? ""}
                        onChange={(e) =>
                          onManualOverrideChange(student.id, e.target.value)
                        }
                        className="w-20 rounded border px-2 py-1"
                        placeholder={t("autoPlaceholder")}
                      />
                    )}
                  </td>

                  <td className="p-3">
                    {entry.finalGrade !== null && entry.finalGrade !== 0 ? (
                      <span
                        className={`font-semibold ${
                          entry.finalGrade >= 5.5 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {entry.finalGrade.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
