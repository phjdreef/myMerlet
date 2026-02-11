import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CvTEChart } from "./CvTEChart";
import { ChartBarIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import {
  calculateCvTEGrade,
  type Test,
  type StudentGrade,
  type LevelNormering,
} from "@/services/test-database";
import type { Student } from "@/services/student-database";
import { studentDB } from "@/services/student-database";
import { evaluateFormulaExpression } from "@/utils/formula-parser";
import {
  compareStudents,
  formatStudentName,
  extractShortLevel,
  LEVEL_OVERRIDE_PROPERTY_ID,
  type StudentSortKey,
} from "@/helpers/student_helpers";
import { StudentPhoto } from "@/components/student-directory/StudentPhoto";
import { Button } from "../ui/button";
import { logger } from "@/utils/logger";
import { useSchoolYear } from "@/contexts/SchoolYearContext";

interface GradeEntryProps {
  test: Test;
  students: Student[];
  className?: string | null;
  schoolYear?: string;
  onClose: () => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export function GradeEntry({
  test,
  students,
  className,
  schoolYear,
  onClose,
  onSave,
  readOnly = false,
}: GradeEntryProps) {
  const { t } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();
  const resolvedSchoolYear = schoolYear ?? currentSchoolYear;

  // Chart data: show three reference n-term lines
  const chartNTerms = useMemo(() => [0, 1.0, 2.0], []);

  // Chart modal state
  const [showChart, setShowChart] = useState(false);

  const [levelOverrides, setLevelOverrides] = useState<Map<number, string>>(
    new Map(),
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"achternaam" | "roepnaam" | "number">(
    "achternaam",
  );

  useEffect(() => {
    if (!className || !resolvedSchoolYear) {
      setLevelOverrides(new Map());
      return;
    }

    let cancelled = false;

    const loadOverrides = async () => {
      try {
        const entries = await Promise.all(
          students.map(async (student) => {
            const values = await studentDB.getPropertyValues(
              student.id,
              className,
              resolvedSchoolYear,
            );
            const override = values.find(
              (value) => value.propertyId === LEVEL_OVERRIDE_PROPERTY_ID,
            )?.value;
            return [student.id, override] as const;
          }),
        );

        if (cancelled) return;

        const overrides = new Map<number, string>();
        entries.forEach(([studentId, value]) => {
          if (typeof value === "string" && value.trim().length > 0) {
            overrides.set(studentId, value.trim().toUpperCase());
          }
        });

        setLevelOverrides(overrides);
      } catch (error) {
        if (!cancelled) {
          logger.error("Failed to load level overrides:", error);
          setLevelOverrides(new Map());
        }
      }
    };

    loadOverrides();

    return () => {
      cancelled = true;
    };
  }, [className, resolvedSchoolYear, students]);

  // Form state for each student
  const [entries, setEntries] = useState<
    Map<
      number,
      {
        pointsEarned?: number; // For CvTE tests
        elementGrades?: { elementId: string; pointsEarned: number }[]; // For composite tests
        manualOverride?: number;
        calculatedGrade: number | null;
        finalGrade: number | null;
      }
    >
  >(new Map());

  // Calculate live statistics from current entries
  const liveStatistics = (() => {
    const finalGrades = Array.from(entries.values())
      .map((entry) => entry.finalGrade)
      .filter((grade): grade is number => grade !== null && grade !== 0);

    if (finalGrades.length === 0) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        aboveThreshold: 0,
        underThreshold: 0,
        totalGraded: 0,
      };
    }

    const sum = finalGrades.reduce((acc, grade) => acc + grade, 0);
    const average = sum / finalGrades.length;
    const highest = Math.max(...finalGrades);
    const lowest = Math.min(...finalGrades);
    const aboveThreshold = finalGrades.filter((g) => g >= 5.5).length;
    const underThreshold = finalGrades.filter((g) => g < 5.5).length;

    return {
      average: Math.round(average * 10) / 10,
      highest,
      lowest,
      aboveThreshold,
      underThreshold,
      totalGraded: finalGrades.length,
    };
  })();

  useEffect(() => {
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test.id]);

  // Get student level (e.g., "HAVO", "VWO")
  const getStudentLevel = (student: Student): string | null => {
    const overrideValue = levelOverrides.get(student.id);
    if (overrideValue) {
      return overrideValue;
    }

    // First try profiel1
    if (student.profiel1) {
      return extractShortLevel(student.profiel1);
    }

    // Extract from studies array
    if (student.studies && student.studies.length > 0) {
      return extractShortLevel(student.studies[0]);
    }

    return null;
  };

  // Get normering for a student (level-specific or default)
  const getNormeringForStudent = (student: Student): LevelNormering => {
    const level = getStudentLevel(student);

    // If level-specific normering exists, use it
    if (level && test.levelNormerings && test.levelNormerings[level]) {
      return test.levelNormerings[level];
    }

    // Otherwise use default normering
    return {
      nTerm: test.nTerm ?? 1,
      maxPoints: test.maxPoints ?? 10,
      cvteCalculationMode: test.cvteCalculationMode ?? "legacy",
    };
  };

  const loadGrades = async () => {
    setLoading(true);
    try {
      const result = await window.testAPI.getGradesForTest(test.id);
      if (result.success && result.data) {
        const gradesData = result.data as StudentGrade[];
        const entriesMap = new Map();

        gradesData.forEach((grade) => {
          entriesMap.set(grade.studentId, {
            pointsEarned: grade.pointsEarned,
            elementGrades: grade.elementGrades,
            manualOverride: grade.manualOverride,
            calculatedGrade: grade.calculatedGrade,
            finalGrade: grade.finalGrade,
          });
        });

        setEntries(entriesMap);
      }
    } catch (error) {
      logger.error("Failed to load grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrade = (
    pointsEarned: number | undefined,
    student: Student,
  ): number | null => {
    // CvTE formula only
    if (test.testType !== "cvte") return null;
    if (pointsEarned === undefined || !Number.isFinite(pointsEarned))
      return null;

    const normering = getNormeringForStudent(student);
    if (!normering.maxPoints || normering.maxPoints <= 0) return null;

    return calculateCvTEGrade(
      pointsEarned,
      normering.maxPoints,
      normering.nTerm,
      normering.cvteCalculationMode,
    );
  };

  const calculateCompositeGrade = (
    elementGrades: { elementId: string; pointsEarned: number }[],
  ): number | null => {
    if (test.testType !== "composite" || !test.elements) return null;
    if (elementGrades.length === 0) return null;

    // Use custom formula if available
    if (test.customFormula && test.customFormula.trim() !== "") {
      try {
        const escapeRegExp = (value: string) =>
          value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const context: Record<string, number> = {};

        for (const element of test.elements) {
          const normalizedKey = element.name.trim().toLowerCase();
          const gradeEntry = elementGrades.find(
            (g) => g.elementId === element.id,
          );
          context[normalizedKey] = gradeEntry?.pointsEarned ?? 0;
        }

        let formula = test.customFormula.trim();

        for (const element of test.elements) {
          const name = element.name.trim();
          if (!name) continue;

          const normalizedKey = name.toLowerCase();
          const value = context[normalizedKey] ?? 0;
          const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi");
          formula = formula.replace(regex, String(value));
        }

        formula = formula.replace(/,/g, ".");

        if (!/^[\d\s+\-*/().]+$/.test(formula)) {
          logger.error("Invalid formula", formula);
          return null;
        }

        const result = evaluateFormulaExpression(formula);

        if (result !== null) {
          return Math.round(result * 100) / 100;
        }

        logger.error("Formula did not evaluate to a number", formula);
        return null;
      } catch (error) {
        logger.error("Error evaluating formula:", error);
        return null;
      }
    }

    // Default: weighted average calculation
    let totalWeightedGrade = 0;
    let totalWeight = 0;

    test.elements.forEach((element) => {
      const gradeEntry = elementGrades.find((g) => g.elementId === element.id);
      if (gradeEntry) {
        // Normalize to 0-10 scale
        const normalizedGrade =
          element.maxPoints > 0
            ? (gradeEntry.pointsEarned / element.maxPoints) * 10
            : 0;
        totalWeightedGrade += normalizedGrade * element.weight;
        totalWeight += element.weight;
      }
    });

    if (totalWeight === 0) return null;
    return Math.round((totalWeightedGrade / totalWeight) * 100) / 100;
  };

  const roundGrade = (grade: number | null): number | null => {
    if (grade === null) return null;
    return Math.round(grade * 10) / 10;
  };

  const handlePointsChange = (
    studentId: number,
    student: Student,
    points: string,
  ) => {
    const parsed = points.trim() === "" ? undefined : parseFloat(points);
    const pointsEarned = Number.isFinite(parsed) ? parsed : undefined;
    const calculatedGrade =
      pointsEarned !== undefined ? calculateGrade(pointsEarned, student) : null;
    const currentEntry = entries.get(studentId);
    const manualOverride = currentEntry?.manualOverride;
    const finalGrade =
      manualOverride ??
      (calculatedGrade !== null ? roundGrade(calculatedGrade) : null);

    setEntries(
      new Map(entries).set(studentId, {
        pointsEarned,
        elementGrades: currentEntry?.elementGrades,
        manualOverride,
        calculatedGrade,
        finalGrade,
      }),
    );
  };

  const handleElementGradeChange = (
    studentId: number,
    elementId: string,
    points: string,
  ) => {
    const parsed = points.trim() === "" ? undefined : parseFloat(points);
    const pointsEarned = Number.isFinite(parsed) ? parsed : undefined;
    const currentEntry = entries.get(studentId);
    const currentElementGrades = currentEntry?.elementGrades || [];

    // Update or add element grade
    const updatedElementGrades = currentElementGrades.filter(
      (g) => g.elementId !== elementId,
    );
    if (pointsEarned !== undefined) {
      updatedElementGrades.push({ elementId, pointsEarned });
    }

    const calculatedGrade = calculateCompositeGrade(updatedElementGrades);
    const manualOverride = currentEntry?.manualOverride;
    const finalGrade =
      manualOverride ??
      (calculatedGrade !== null ? roundGrade(calculatedGrade) : null);

    setEntries(
      new Map(entries).set(studentId, {
        pointsEarned: currentEntry?.pointsEarned,
        elementGrades: updatedElementGrades,
        manualOverride,
        calculatedGrade,
        finalGrade,
      }),
    );
  };

  const handleManualOverrideChange = (studentId: number, override: string) => {
    const currentEntry = entries.get(studentId);
    if (!currentEntry) return;

    const manualOverride = override === "" ? undefined : parseFloat(override);
    const finalGrade =
      manualOverride ?? roundGrade(currentEntry.calculatedGrade);

    setEntries(
      new Map(entries).set(studentId, {
        ...currentEntry,
        manualOverride,
        finalGrade,
      }),
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save all entries based on test type
      for (const [studentId, entry] of entries.entries()) {
        if (test.testType === "cvte") {
          // CvTE test - save points earned
          if (
            entry.pointsEarned !== undefined ||
            entry.manualOverride !== undefined
          ) {
            await window.testAPI.saveGrade(
              test.id,
              studentId,
              entry.pointsEarned ?? 0,
              entry.manualOverride,
            );
          }
        } else if (test.testType === "composite") {
          // Composite test - save element grades
          if (
            (entry.elementGrades && entry.elementGrades.length > 0) ||
            entry.manualOverride !== undefined
          ) {
            await window.testAPI.saveCompositeGrade(
              test.id,
              studentId,
              entry.elementGrades || [],
              entry.manualOverride,
            );
          }
        }
      }
      onSave?.();
      onClose();
    } catch (error) {
      logger.error("Failed to save grades:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">{t("loading")}</div>;
  }

  // Filter and sort students
  const filteredAndSortedStudents = students
    .filter((student) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const roepnaam = student.roepnaam?.toLowerCase() ?? "";
      const surname = formatStudentName(student, {
        includeRoepnaam: false,
      }).toLowerCase();
      const fullName = formatStudentName(student).toLowerCase();

      return (
        roepnaam.includes(query) ||
        surname.includes(query) ||
        fullName.includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === "number") {
        return 0;
      }
      return compareStudents(a, b, sortBy as StudentSortKey);
    });

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Chart Modal */}
      {showChart && test.testType === "cvte" && test.maxPoints && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowChart(false)}
        >
          <div
            className="bg-background mx-4 max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("cvteChart")}</h3>
              <button
                onClick={() => setShowChart(false)}
                className="hover:bg-muted rounded-lg p-2"
              >
                ✕
              </button>
            </div>
            <CvTEChart
              maxPoints={test.maxPoints}
              nTerms={chartNTerms}
              mode={test.cvteCalculationMode ?? "legacy"}
            />
          </div>
        </div>
      )}

      {/* Live Statistics Banner */}
      {liveStatistics.totalGraded > 0 && (
        <div className="bg-muted/50 flex flex-wrap gap-4 rounded-lg border p-3 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <ChartBarIcon className="h-4 w-4" />
            {t("average")}: {liveStatistics.average.toFixed(1)}
          </span>
          <span>
            {t("highest")}: {liveStatistics.highest.toFixed(1)}
          </span>
          <span>
            {t("lowest")}: {liveStatistics.lowest.toFixed(1)}
          </span>
          <span className="text-green-600">
            ≥5.5: {liveStatistics.aboveThreshold}
          </span>
          <span className="text-red-600">
            &lt;5.5: {liveStatistics.underThreshold}
          </span>
          <span>
            {t("total")}: {liveStatistics.totalGraded}
          </span>
        </div>
      )}

      {/* Header */}
      <div>
        {test.testType === "cvte" ? (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {t("maxPoints")}: {test.maxPoints} | {t("formula")}:{" "}
              {(() => {
                const nTerm = test.nTerm ?? 1;
                const mode = test.cvteCalculationMode ?? "legacy";
                if (mode === "legacy") {
                  return `(10 - ${nTerm}) × (${t("points")} / ${test.maxPoints}) + ${nTerm}`;
                }
                if (mode === "main") {
                  return `9 × (${t("points")} / ${test.maxPoints}) + ${nTerm} ${t("cvteFormulaSuffixMain")}`;
                }
                return `9 × (${t("points")} / ${test.maxPoints}) + ${nTerm} ${t("cvteFormulaSuffixOfficial")}`;
              })()}
            </p>
            {test.maxPoints && (
              <button
                onClick={() => setShowChart(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 rounded-md px-3 py-1 text-xs"
              >
                <ChartBarIcon className="h-4 w-4" />
                {t("showChart", "Toon Grafiek")}
              </button>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>
              {t("compositeTest")} - {test.elements?.length || 0}{" "}
              {t("elements")}
            </p>
            {test.customFormula && test.customFormula.trim() !== "" && (
              <p className="font-mono text-xs">
                {t("formula")}: {test.customFormula}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Search and Sort Controls */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("searchStudents")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">{t("sortBy")}:</span>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "achternaam" | "roepnaam" | "number")
            }
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="achternaam">{t("lastName")}</option>
            <option value="roepnaam">{t("firstName")}</option>
            <option value="number">{t("number")}</option>
          </select>
        </div>
      </div>

      {/* Grade Entry Table */}
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
              {filteredAndSortedStudents.map((student, index) => {
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
                  !test.levelNormerings[studentLevel];
                const noLevelDetected = hasLevelNormerings && !studentLevel;

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

                    {/* Level column - only show if level-specific normerings exist */}
                    {hasLevelNormerings && (
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {studentLevel ? (
                            <>
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
                            </>
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

                    {/* CvTE Test - Single Points Input */}
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
                                handlePointsChange(
                                  student.id,
                                  student,
                                  e.target.value,
                                )
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
                              (getNormeringForStudent(student).maxPoints ??
                                0) && (
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

                    {/* Composite Test - Multiple Element Inputs */}
                    {test.testType === "composite" &&
                      test.elements?.map((element) => {
                        const elementGrade = entry.elementGrades?.find(
                          (g) => g.elementId === element.id,
                        );
                        const elementPoints = elementGrade?.pointsEarned;
                        const elementPointsValue =
                          elementGrade?.pointsEarned ?? 0;

                        return (
                          <td key={element.id} className="p-3">
                            {readOnly ? (
                              <span>
                                {elementPoints !== undefined
                                  ? elementPoints
                                  : "-"}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                max={element.maxPoints}
                                step="0.5"
                                value={elementPoints ?? ""}
                                onChange={(e) =>
                                  handleElementGradeChange(
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

                    {/* Calculated Grade */}
                    <td className="p-3">
                      <span className="font-medium">
                        {entry.calculatedGrade !== null &&
                        entry.calculatedGrade !== 0
                          ? entry.calculatedGrade.toFixed(2)
                          : "-"}
                      </span>
                    </td>

                    {/* Manual Override */}
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
                            handleManualOverrideChange(
                              student.id,
                              e.target.value,
                            )
                          }
                          className="w-20 rounded border px-2 py-1"
                          placeholder={t("autoPlaceholder")}
                        />
                      )}
                    </td>

                    {/* Final Grade */}
                    <td className="p-3">
                      {entry.finalGrade !== null && entry.finalGrade !== 0 ? (
                        <span
                          className={`font-semibold ${
                            entry.finalGrade >= 5.5
                              ? "text-green-600"
                              : "text-red-600"
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

      {/* Actions - Sticky at bottom */}
      {!readOnly && (
        <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-white pt-4 pb-2 dark:bg-gray-900">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSaveAll} disabled={saving}>
            <FloppyDiskIcon className="mr-2 h-4 w-4" />
            {saving ? t("saving") : t("saveAllGrades")}
          </Button>
        </div>
      )}
    </div>
  );
}
