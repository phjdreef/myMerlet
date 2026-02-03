import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import type {
  Student,
  StudentPropertyDefinition,
} from "@/services/student-database";
import { studentDB } from "@/services/student-database";
import type { Test, StudentGrade } from "@/services/test-database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { logger } from "@/utils/logger";
import { PropertyManager } from "./PropertyManager";
import { formatClassName } from "@/utils/class-utils";

interface StudentTableViewProps {
  students: Student[];
  selectedClass: string | null;
  loading: boolean;
  totalStudents: number;
}

interface StudentWithExtras extends Student {
  photoUrl: string | null;
  propertyValues: Map<string, string | number | boolean>;
  note: string;
  recentGrades: Array<{ test: Test; grade: StudentGrade } | null>;
  average: number | null;
}

export function StudentTableView({
  students,
  selectedClass,
  loading,
  totalStudents,
}: StudentTableViewProps) {
  const { t } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();
  const [propertyDefinitions, setPropertyDefinitions] = useState<
    StudentPropertyDefinition[]
  >([]);
  const [studentsWithExtras, setStudentsWithExtras] = useState<
    StudentWithExtras[]
  >([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showPropertyManager, setShowPropertyManager] = useState(false);
  const [recentTests, setRecentTests] = useState<Test[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Map<string, string>>(new Map());

  // Load property definitions when class changes
  useEffect(() => {
    if (!selectedClass) return;

    let isCancelled = false;

    const loadDefinitions = async () => {
      try {
        const definitions = await studentDB.getPropertyDefinitions(
          selectedClass,
          currentSchoolYear,
        );
        logger.debug(
          `Loaded ${definitions.length} property definitions for ${selectedClass}`,
        );
        if (!isCancelled) {
          setPropertyDefinitions(definitions.sort((a, b) => a.order - b.order));
        }
      } catch (error) {
        if (!isCancelled) {
          logger.error("Failed to load property definitions:", error);
        }
      }
    };

    loadDefinitions();

    return () => {
      isCancelled = true;
    };
  }, [selectedClass, currentSchoolYear]);

  const loadPropertyDefinitions = async () => {
    if (!selectedClass) return;
    try {
      const definitions = await studentDB.getPropertyDefinitions(
        selectedClass,
        currentSchoolYear,
      );
      logger.debug(
        `Reloading property definitions: ${definitions.length} found`,
      );
      setPropertyDefinitions(definitions.sort((a, b) => a.order - b.order));
      // The useEffect with propertyDefinitions dependency will trigger reload of student data
    } catch (error) {
      logger.error("Failed to reload property definitions:", error);
    }
  };

  const handlePropertiesChange = async () => {
    await loadPropertyDefinitions();
    setShowPropertyManager(false);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (column: string, value: string) => {
    const newFilters = new Map(filters);
    if (value) {
      newFilters.set(column, value);
    } else {
      newFilters.delete(column);
    }
    setFilters(newFilters);
  };

  const getFullName = (student: Student) => {
    const parts = [
      student.roepnaam,
      student.tussenvoegsel,
      student.achternaam,
    ].filter(Boolean);
    return parts.join(" ");
  };

  const getNiveau = (student: Student) => {
    // First try profiel1
    if (student.profiel1) {
      return formatClassName(student.profiel1);
    }

    // Extract niveau from studies array (e.g., "MAVO", "HAVO", "VWO", etc.)
    if (student.studies && student.studies.length > 0) {
      return student.studies.map((s) => formatClassName(s)).join(", ");
    }

    // Fallback: try to extract niveau from class name
    if (selectedClass) {
      const className = selectedClass.toLowerCase();
      if (
        className.includes("vwo") ||
        className.startsWith("ctv") ||
        className.startsWith("v")
      ) {
        return "VWO";
      } else if (
        className.includes("havo") ||
        className.startsWith("ch") ||
        className.startsWith("h")
      ) {
        return "HAVO";
      } else if (
        className.includes("mavo") ||
        className.startsWith("cm") ||
        className.startsWith("m")
      ) {
        return "MAVO";
      } else if (className.includes("vmbo")) {
        return "VMBO";
      }
    }

    return "-";
  };

  // Apply filters and sorting
  const filteredAndSortedStudents = studentsWithExtras
    .filter((student) => {
      for (const [column, filterValue] of filters.entries()) {
        const lowerFilter = filterValue.toLowerCase();

        if (column === "name") {
          const fullName = getFullName(student).toLowerCase();
          if (!fullName.includes(lowerFilter)) return false;
        } else if (column === "level") {
          const niveau = getNiveau(student).toLowerCase();
          if (!niveau.includes(lowerFilter)) return false;
        } else if (column.startsWith("prop_")) {
          const propId = column.substring(5);
          const value = student.propertyValues.get(propId);
          const valueStr = value?.toString().toLowerCase() || "";
          if (!valueStr.includes(lowerFilter)) return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let aValue: any;
      let bValue: any;

      if (sortColumn === "name") {
        aValue = getFullName(a);
        bValue = getFullName(b);
      } else if (sortColumn === "level") {
        aValue = getNiveau(a);
        bValue = getNiveau(b);
      } else if (sortColumn === "average") {
        aValue = a.average ?? -1;
        bValue = b.average ?? -1;
      } else if (sortColumn.startsWith("prop_")) {
        const propId = sortColumn.substring(5);
        aValue = a.propertyValues.get(propId) ?? "";
        bValue = b.propertyValues.get(propId) ?? "";
      } else {
        return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  // Load student extras (photos, property values, notes) when students change
  useEffect(() => {
    if (students.length === 0 || !selectedClass) return;

    // Log first student raw data for debugging
    if (students.length > 0) {
      console.log(
        "Raw student data example:",
        JSON.stringify(students[0], null, 2),
      );
    }

    let isCancelled = false;

    const loadExtras = async () => {
      // First load recent tests for this class
      let tests: Test[] = [];
      try {
        const testsResponse =
          await window.testAPI.getTestsForClassGroup(selectedClass);
        if (testsResponse.success && testsResponse.data) {
          // Get the 2 most recent tests
          tests = testsResponse.data
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .slice(0, 2);
          if (!isCancelled) {
            setRecentTests(tests);
          }
        }
      } catch (error) {
        logger.error("Failed to load tests:", error);
      }

      const studentsWithData = await Promise.all(
        students.map(async (student) => {
          // Load photo
          let photoUrl: string | null = null;
          try {
            photoUrl = await window.studentDBAPI
              .getPhoto(student.id)
              .then((res) => (res.success ? res.data || null : null));
          } catch (error) {
            logger.error(`Failed to load photo for ${student.id}:`, error);
          }

          // Load property values
          const propertyValues = new Map<string, string | number | boolean>();
          try {
            const values = await studentDB.getPropertyValues(
              student.id,
              selectedClass,
              currentSchoolYear,
            );
            values.forEach((v) => {
              propertyValues.set(v.propertyId, v.value);
            });
          } catch (error) {
            logger.error(
              `Failed to load property values for ${student.id}:`,
              error,
            );
          }

          // Load note
          let note = "";
          try {
            const noteData = await studentDB.getNote(
              student.id,
              selectedClass,
              currentSchoolYear,
            );
            note = noteData?.note || "";
          } catch (error) {
            logger.error(`Failed to load note for ${student.id}:`, error);
          }

          // Load recent grades
          const recentGrades: Array<{
            test: Test;
            grade: StudentGrade;
          } | null> = [];
          let totalGrade = 0;
          let gradeCount = 0;

          for (const test of tests) {
            try {
              const gradesResponse = await window.testAPI.getGradesForStudent(
                student.id,
                selectedClass,
              );
              if (gradesResponse.success && gradesResponse.data) {
                const gradeForTest = gradesResponse.data.find(
                  (g) => g.testId === test.id,
                );
                if (gradeForTest) {
                  recentGrades.push({ test, grade: gradeForTest });
                  const finalGrade =
                    gradeForTest.manualOverride ?? gradeForTest.calculatedGrade;
                  if (finalGrade) {
                    totalGrade += finalGrade;
                    gradeCount++;
                  }
                } else {
                  recentGrades.push(null);
                }
              } else {
                recentGrades.push(null);
              }
            } catch (error) {
              logger.error(
                `Failed to load grades for student ${student.id}:`,
                error,
              );
              recentGrades.push(null);
            }
          }

          const average = gradeCount > 0 ? totalGrade / gradeCount : null;

          return {
            ...student,
            photoUrl,
            propertyValues,
            note,
            recentGrades,
            average,
          };
        }),
      );

      if (!isCancelled) {
        setStudentsWithExtras(studentsWithData);
      }
    };

    loadExtras();

    return () => {
      isCancelled = true;
    };
  }, [students, selectedClass, currentSchoolYear, propertyDefinitions]);

  const handlePropertyValueChange = async (
    student: StudentWithExtras,
    propertyId: string,
    value: string | number | boolean,
  ) => {
    if (!selectedClass) return;

    try {
      await studentDB.savePropertyValue({
        studentId: student.id,
        className: selectedClass,
        schoolYear: currentSchoolYear,
        propertyId,
        value,
      });

      // Update local state
      setStudentsWithExtras((prev) =>
        prev.map((s) => {
          if (s.id === student.id) {
            const newPropertyValues = new Map(s.propertyValues);
            newPropertyValues.set(propertyId, value);
            return { ...s, propertyValues: newPropertyValues };
          }
          return s;
        }),
      );
    } catch (error) {
      logger.error("Failed to save property value:", error);
    }
  };

  const handleNoteChange = async (
    student: StudentWithExtras,
    newNote: string,
  ) => {
    if (!selectedClass) return;

    try {
      await studentDB.saveNote({
        studentId: student.id,
        className: selectedClass,
        schoolYear: currentSchoolYear,
        note: newNote,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setStudentsWithExtras((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, note: newNote } : s)),
      );
      setEditingNoteId(null);
    } catch (error) {
      logger.error("Failed to save note:", error);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 5.5) {
      return "text-green-600 dark:text-green-400 font-semibold";
    }
    return "text-red-600 dark:text-red-400 font-semibold";
  };

  if (students.length > 0 && studentsWithExtras.length > 0) {
    logger.debug(
      `Rendering table with ${propertyDefinitions.length} property definitions:`,
      propertyDefinitions,
    );
    return (
      <div className="space-y-4">
        {/* Statistics Bar */}
        <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-medium">
              {t("currentlyShowing")}: {filteredAndSortedStudents.length}
              {filteredAndSortedStudents.length !==
                studentsWithExtras.length && (
                <span className="text-muted-foreground">
                  {" "}
                  / {studentsWithExtras.length}
                </span>
              )}
            </span>
            {selectedClass && (
              <span className="text-muted-foreground">
                {t("class")}: {selectedClass}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPropertyManager(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            {t("manageProperties")}
          </Button>
        </div>

        {/* Property Manager Modal */}
        {showPropertyManager && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowPropertyManager(false)}
          >
            <div
              className="bg-background mx-4 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {t("manageProperties")}
                </h3>
                <button
                  onClick={() => setShowPropertyManager(false)}
                  className="hover:bg-muted rounded-lg p-2"
                >
                  ✕
                </button>
              </div>
              <PropertyManager
                className={selectedClass || ""}
                schoolYear={currentSchoolYear}
                properties={propertyDefinitions}
                onPropertiesChange={handlePropertiesChange}
              />
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t("photo")}</TableHead>
                  <TableHead className="min-w-[150px]">
                    <div className="space-y-1">
                      <button
                        onClick={() => handleSort("name")}
                        className="hover:text-foreground flex items-center gap-1"
                      >
                        {t("studentName")}
                        {sortColumn === "name" && (
                          <span className="text-xs">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                      <Input
                        placeholder={t("filter")}
                        value={filters.get("name") || ""}
                        onChange={(e) =>
                          handleFilterChange("name", e.target.value)
                        }
                        className="mb-2 h-7 text-xs"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    <div className="space-y-1">
                      <button
                        onClick={() => handleSort("level")}
                        className="hover:text-foreground flex items-center gap-1"
                      >
                        {t("level")}
                        {sortColumn === "level" && (
                          <span className="text-xs">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                      <Input
                        placeholder={t("filter")}
                        value={filters.get("level") || ""}
                        onChange={(e) =>
                          handleFilterChange("level", e.target.value)
                        }
                        className="mb-2 h-7 text-xs"
                      />
                    </div>
                  </TableHead>
                  {recentTests.length > 0 ? (
                    <>
                      {recentTests.map((test, idx) => (
                        <TableHead key={test.id} className="w-32 text-center">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs font-normal">
                              {test.name}
                            </span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-24 text-center">
                        <button
                          onClick={() => handleSort("average")}
                          className="hover:text-foreground mx-auto flex items-center gap-1"
                        >
                          {t("studentAverage")}
                          {sortColumn === "average" && (
                            <span className="text-xs">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </button>
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-24 text-center">
                        {t("lastGrade1")}
                      </TableHead>
                      <TableHead className="w-24 text-center">
                        {t("lastGrade2")}
                      </TableHead>
                      <TableHead className="w-24 text-center">
                        {t("studentAverage")}
                      </TableHead>
                    </>
                  )}
                  {propertyDefinitions.map((prop) => (
                    <TableHead
                      key={prop.id}
                      className={
                        prop.type === "boolean" ? "w-16" : "min-w-[120px]"
                      }
                    >
                      <div className="space-y-1">
                        <button
                          onClick={() => handleSort(`prop_${prop.id}`)}
                          className="hover:text-foreground flex items-center gap-1"
                        >
                          {prop.name}
                          {sortColumn === `prop_${prop.id}` && (
                            <span className="text-xs">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </button>
                        {prop.type !== "boolean" && (
                          <Input
                            placeholder={t("filter")}
                            value={filters.get(`prop_${prop.id}`) || ""}
                            onChange={(e) =>
                              handleFilterChange(
                                `prop_${prop.id}`,
                                e.target.value,
                              )
                            }
                            className="mb-2 h-7 text-xs"
                          />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedStudents.map((student) => (
                  <TableRow key={student.id} className="group/row">
                    {/* Photo */}
                    <TableCell className="relative">
                      {student.photoUrl ? (
                        <div className="group/photo relative h-10 w-10">
                          <img
                            src={student.photoUrl}
                            alt={getFullName(student)}
                            className="h-10 w-10 rounded-full object-cover transition-transform group-hover/photo:relative group-hover/photo:z-100 group-hover/photo:scale-[2.5] group-hover/photo:shadow-xl"
                          />
                        </div>
                      ) : (
                        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium">
                          {student.voorletters}
                        </div>
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="font-medium">
                      {getFullName(student)}
                    </TableCell>

                    {/* Level/Niveau */}
                    <TableCell className="text-sm">
                      {getNiveau(student)}
                    </TableCell>

                    {/* Grades */}
                    {recentTests.length > 0 ? (
                      <>
                        {student.recentGrades.map((gradeInfo, idx) => (
                          <TableCell key={idx} className="text-center">
                            {gradeInfo ? (
                              <span
                                className={getGradeColor(
                                  gradeInfo.grade.manualOverride ??
                                    gradeInfo.grade.calculatedGrade,
                                )}
                              >
                                {(
                                  gradeInfo.grade.manualOverride ??
                                  gradeInfo.grade.calculatedGrade
                                ).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          {student.average !== null ? (
                            <span className={getGradeColor(student.average)}>
                              {student.average.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-muted-foreground text-center text-sm">
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground text-center text-sm">
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground text-center text-sm">
                          -
                        </TableCell>
                      </>
                    )}

                    {/* Custom Properties */}
                    {propertyDefinitions.map((prop) => (
                      <TableCell key={prop.id} className="relative z-10">
                        {prop.type === "boolean" ? (
                          <Checkbox
                            checked={
                              (student.propertyValues.get(
                                prop.id,
                              ) as boolean) || false
                            }
                            onCheckedChange={(checked: boolean) =>
                              handlePropertyValueChange(
                                student,
                                prop.id,
                                checked === true,
                              )
                            }
                            className="relative z-10"
                          />
                        ) : prop.type === "number" ? (
                          <Input
                            type="number"
                            value={
                              (student.propertyValues.get(prop.id) as
                                | number
                                | string) || ""
                            }
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              handlePropertyValueChange(
                                student,
                                prop.id,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-8 w-20"
                          />
                        ) : prop.type === "letter" ? (
                          <Input
                            type="text"
                            maxLength={1}
                            value={
                              (student.propertyValues.get(prop.id) as string) ||
                              ""
                            }
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              handlePropertyValueChange(
                                student,
                                prop.id,
                                e.target.value,
                              )
                            }
                            className="h-8 w-12 text-center"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={
                              (student.propertyValues.get(prop.id) as string) ||
                              ""
                            }
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              handlePropertyValueChange(
                                student,
                                prop.id,
                                e.target.value,
                              )
                            }
                            className="h-8"
                          />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && students.length === 0 && totalStudents > 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          {t("noStudentsFoundForClass")}
          {selectedClass ? ` "${selectedClass}".` : "."}
        </p>
      </div>
    );
  }

  if (!loading && totalStudents === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          {t("noStudentsLoadedClickToStart")}
        </p>
      </div>
    );
  }

  return null;
}
