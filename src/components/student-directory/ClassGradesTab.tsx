import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import type { Test, TestStatistics } from "../../services/test-database";
import type { Student } from "../../services/student-database";
import { GradeEntry } from "../tests/GradeEntry";
import { Button } from "../ui/button";
import { ChartBarIcon } from "@phosphor-icons/react";
import { normalizeTestRecord } from "../../helpers/tests/normalize-test";

interface ClassGradesTabProps {
  selectedClass: string | null;
  students: Student[];
}

export function ClassGradesTab({
  selectedClass,
  students,
}: ClassGradesTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentSchoolYear } = useSchoolYear();
  const [tests, setTests] = useState<Test[]>([]);
  const [statistics, setStatistics] = useState<Map<string, TestStatistics>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedTestMode, setSelectedTestMode] = useState<"view" | "edit">(
    "view",
  );

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(
      (student) =>
        Array.isArray(student.klassen) &&
        student.klassen.includes(selectedClass),
    );
  }, [students, selectedClass]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const loadTests = useCallback(
    async (classGroup: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await window.testAPI.getTestsForClassGroup(classGroup);
        if (result.success && result.data) {
          const normalized = (result.data as Test[]).map(normalizeTestRecord);
          normalized.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
          setTests(normalized);

          const statsMap = new Map<string, TestStatistics>();
          for (const test of normalized) {
            const statsResult = await window.testAPI.getTestStatistics(
              test.id,
              classGroup,
            );
            if (statsResult.success && statsResult.data) {
              statsMap.set(test.id, statsResult.data as TestStatistics);
            }
          }
          setStatistics(statsMap);
        } else {
          setTests([]);
          setStatistics(new Map());
          if (result.error) {
            setError(String(result.error));
          }
        }
      } catch (err) {
        setTests([]);
        setStatistics(new Map());
        setError(
          err instanceof Error ? err.message : t("unknownError") || "Error",
        );
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!selectedClass) {
      setTests([]);
      setStatistics(new Map());
      setSelectedTest(null);
      setSelectedTestMode("view");
      return;
    }

    setSelectedTest(null);
    setSelectedTestMode("view");
    void loadTests(selectedClass);
  }, [selectedClass, loadTests]);

  const handleGradesSaved = () => {
    if (!selectedClass) return;
    setSelectedTest(null);
    setSelectedTestMode("view");
    void loadTests(selectedClass);
  };

  if (!selectedClass) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
        {t("selectClassForGrades")}
      </div>
    );
  }

  if (selectedTest) {
    const isReadOnly = selectedTestMode === "view";
    return (
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{selectedTest.name}</h2>
            <p className="text-muted-foreground text-xs">
              {t("testClassesLabel")}:{" "}
              {(selectedTest.classGroups || []).slice().join(", ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isReadOnly ? (
              <Button onClick={() => setSelectedTestMode("edit")}>
                {t("enterGrades")}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setSelectedTestMode("view")}
              >
                {t("viewResults")}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTest(null);
                setSelectedTestMode("view");
              }}
            >
              {t("backToTests")}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <GradeEntry
            key={`${selectedTest.id}-${selectedTestMode}`}
            test={selectedTest}
            students={classStudents}
            className={selectedClass}
            schoolYear={currentSchoolYear}
            onClose={() => {
              setSelectedTest(null);
              setSelectedTestMode("view");
            }}
            onSave={handleGradesSaved}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t("grades")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("gradesTabDescription")}
          </p>
        </div>
      </div>

      {error && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-3 text-sm">
          {error}
        </div>
      )}

      <div className="text-muted-foreground text-xs">
        {t("studentsInClass", { count: classStudents.length })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {t("loading")}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-center text-sm">
            <p>{t("noTestsForClass")}</p>
            <p className="text-xs">{t("createTestsInPlanning")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => {
              const stats = statistics.get(test.id);
              return (
                <div
                  key={test.id}
                  role="button"
                  tabIndex={0}
                  className="hover:bg-accent/50 cursor-pointer rounded-lg border p-4 transition-colors focus:ring focus:outline-none"
                  onClick={() => {
                    setSelectedTest(test);
                    setSelectedTestMode("view");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedTest(test);
                      setSelectedTestMode("view");
                    }
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">{test.name}</h3>
                        {test.date && (
                          <span className="text-muted-foreground text-sm">
                            {formatDate(test.date)}
                          </span>
                        )}
                        <span className="bg-primary/10 rounded px-2 py-0.5 text-xs">
                          {t("weight")}: {test.weight}x
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            test.testType === "cvte"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {test.testType === "cvte"
                            ? t("cvteTest")
                            : t("compositeTest")}
                        </span>
                      </div>

                      {test.description && (
                        <p className="text-muted-foreground text-sm">
                          {test.description}
                        </p>
                      )}

                      {test.classGroups && test.classGroups.length > 0 && (
                        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium">
                            {t("testClassesLabel")}:
                          </span>
                          {test.classGroups.map((classLabel) => (
                            <span
                              key={`${test.id}-${classLabel}`}
                              className="bg-muted rounded px-2 py-0.5"
                            >
                              {classLabel}
                            </span>
                          ))}
                        </div>
                      )}

                      {test.testType === "cvte" && (
                        <div className="text-muted-foreground flex gap-4 text-xs">
                          <span>
                            {t("maxPoints")}: {test.maxPoints}
                          </span>
                          <span>n = {test.nTerm}</span>
                        </div>
                      )}

                      {test.testType === "composite" && test.elements && (
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-xs font-medium">
                            {t("elements")}:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {test.elements.map((element) => (
                              <span
                                key={element.id}
                                className="bg-muted rounded px-2 py-1 text-xs"
                              >
                                {element.name} ({element.maxPoints}p,{" "}
                                {(element.weight * 100).toFixed(0)}%)
                              </span>
                            ))}
                          </div>
                          {test.customFormula &&
                            test.customFormula.trim() !== "" && (
                              <div className="text-muted-foreground font-mono text-xs">
                                {t("formula")}: {test.customFormula}
                              </div>
                            )}
                        </div>
                      )}

                      {stats && stats.totalGraded > 0 && (
                        <div className="bg-muted/50 mt-2 flex flex-wrap gap-4 rounded p-2 text-xs">
                          <span className="flex items-center gap-1">
                            <ChartBarIcon className="h-3 w-3" />
                            {t("average")}: {stats.average.toFixed(1)}
                          </span>
                          <span>
                            {t("highest")}: {stats.highest.toFixed(1)}
                          </span>
                          <span>
                            {t("lowest")}: {stats.lowest.toFixed(1)}
                          </span>
                          <span className="text-green-600">
                            ≥5.5: {stats.aboveThreshold}
                          </span>
                          <span className="text-red-600">
                            &lt;5.5: {stats.underThreshold}
                          </span>
                          <span>
                            {t("total")}: {stats.totalGraded}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTest(test);
                          setSelectedTestMode("edit");
                        }}
                      >
                        {t("enterGrades")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate({
                            to: "/tests",
                            search: { editTestId: test.id },
                          });
                        }}
                      >
                        {t("editTest")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
