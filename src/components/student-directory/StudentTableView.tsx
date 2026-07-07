import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import type {
  Student,
  StudentPropertyDefinition,
} from "@/services/student-database";
import { studentDB } from "@/services/student-database";
import type { Test, StudentGrade } from "@/services/test-database";
import { Table, TableBody } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { logger } from "@/utils/logger";
import { PropertyManager } from "./PropertyManager";
import { formatClassName } from "@/utils/class-utils";
import {
  extractShortLevel,
  INACTIVE_STUDENT_PROPERTY_ID,
  isValidNiveau,
  LEVEL_OVERRIDE_OPTIONS,
  LEVEL_OVERRIDE_PROPERTY_ID,
} from "@/helpers/student_helpers";
import { StudentTableHeader } from "./student-table/StudentTableHeader";
import { StudentTableRow } from "./student-table/StudentTableRow";
import type { StudentWithExtras } from "./student-table/types";

type ContextMenuState = {
  x: number;
  y: number;
  visible: boolean;
};

interface StudentTableViewProps {
  students: Student[];
  selectedClass: string | null;
  loading: boolean;
  totalStudents: number;
  onStudentActiveChange?: (studentId: number, isActive: boolean) => void;
}

export function StudentTableView({
  students,
  selectedClass,
  loading,
  totalStudents,
  onStudentActiveChange,
}: StudentTableViewProps) {
  const { t } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();
  const [propertyDefinitions, setPropertyDefinitions] = useState<
    StudentPropertyDefinition[]
  >([]);
  const [studentsWithExtras, setStudentsWithExtras] = useState<
    StudentWithExtras[]
  >([]);
  const [showPropertyManager, setShowPropertyManager] = useState(false);
  const [recentTests, setRecentTests] = useState<Test[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Map<string, string>>(new Map());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectionAnchorId, setSelectionAnchorId] = useState<number | null>(
    null,
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    visible: false,
  });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [showBulkPropertyDialog, setShowBulkPropertyDialog] = useState(false);
  const [bulkPropertyId, setBulkPropertyId] = useState<string>("");
  const [bulkPropertyTextValue, setBulkPropertyTextValue] =
    useState<string>("");
  const [bulkPropertyNumberValue, setBulkPropertyNumberValue] =
    useState<string>("0");
  const [bulkPropertyBooleanValue, setBulkPropertyBooleanValue] =
    useState<boolean>(false);

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

  const getDefaultNiveau = (student: Student) => {
    // First try profiel1
    if (student.profiel1 && isValidNiveau(student.profiel1)) {
      return formatClassName(extractShortLevel(student.profiel1));
    }

    // Extract niveau from studies array (e.g., "MAVO", "HAVO", "VWO", etc.)
    if (student.studies && student.studies.length > 0) {
      const validStudies = student.studies.filter(isValidNiveau);
      if (validStudies.length > 0) {
        return validStudies
          .map((s) => formatClassName(extractShortLevel(s)))
          .join(", ");
      }
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

  const getDefaultNiveauCode = (student: Student): string | null => {
    const magisterCandidates = new Set<string>();

    if (student.profiel1 && isValidNiveau(student.profiel1)) {
      magisterCandidates.add(extractShortLevel(student.profiel1));
    }

    if (student.studies && student.studies.length > 0) {
      student.studies
        .filter(isValidNiveau)
        .forEach((study) => magisterCandidates.add(extractShortLevel(study)));
    }

    // Ambiguous or missing Magister level should remain unknown.
    if (magisterCandidates.size !== 1) return null;

    const defaultNiveau = Array.from(magisterCandidates)[0]
      .toUpperCase()
      .trim();
    if (
      !defaultNiveau ||
      defaultNiveau === "-" ||
      defaultNiveau.includes("/")
    ) {
      return null;
    }

    const directMatch = LEVEL_OVERRIDE_OPTIONS.find(
      (option) => option.code === defaultNiveau,
    );
    if (directMatch) return directMatch.code;

    if (defaultNiveau.includes("BASIS")) return "B";
    if (defaultNiveau.includes("KADER")) return "K";
    if (defaultNiveau.includes("MAVO")) return "M";
    if (defaultNiveau.includes("HAVO")) return "H";
    if (defaultNiveau.includes("ATHENEUM")) return "A";
    if (defaultNiveau.includes("GYMNASIUM")) return "G";

    return null;
  };

  const getNiveau = (student: StudentWithExtras | Student) => {
    const overrideValue =
      "propertyValues" in student
        ? student.propertyValues.get(LEVEL_OVERRIDE_PROPERTY_ID)
        : undefined;

    if (typeof overrideValue === "string" && overrideValue.trim().length > 0) {
      return overrideValue.trim().toUpperCase();
    }

    return getDefaultNiveau(student);
  };

  // Apply filters and sorting
  const filteredAndSortedStudents = useMemo(() => {
    return studentsWithExtras
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

        let aValue: string | number;
        let bValue: string | number;

        if (sortColumn === "name") {
          aValue = getFullName(a);
          bValue = getFullName(b);
        } else if (sortColumn === "lastName") {
          aValue = a.achternaam || "";
          bValue = b.achternaam || "";
        } else if (sortColumn === "level") {
          aValue = getNiveau(a);
          bValue = getNiveau(b);
        } else if (sortColumn === "average") {
          aValue = a.average ?? -1;
          bValue = b.average ?? -1;
        } else if (sortColumn.startsWith("prop_")) {
          const propId = sortColumn.substring(5);
          const aProp = a.propertyValues.get(propId);
          const bProp = b.propertyValues.get(propId);
          // Convert boolean to string for comparison
          aValue = typeof aProp === "boolean" ? String(aProp) : (aProp ?? "");
          bValue = typeof bProp === "boolean" ? String(bProp) : (bProp ?? "");
        } else {
          return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [studentsWithExtras, filters, sortColumn, sortDirection]);

  useEffect(() => {
    const visibleIds = new Set(
      filteredAndSortedStudents.map((student) => student.id),
    );
    setSelectedStudentIds((previous) => {
      const next = new Set<number>();
      previous.forEach((id) => {
        if (visibleIds.has(id)) {
          next.add(id);
        }
      });

      if (next.size === previous.size) {
        let changed = false;
        for (const id of next) {
          if (!previous.has(id)) {
            changed = true;
            break;
          }
        }
        if (!changed) {
          return previous;
        }
      }

      return next;
    });
  }, [filteredAndSortedStudents]);

  useEffect(() => {
    if (selectionAnchorId === null) {
      return;
    }

    const stillVisible = filteredAndSortedStudents.some(
      (student) => student.id === selectionAnchorId,
    );
    if (!stillVisible) {
      setSelectionAnchorId(null);
    }
  }, [filteredAndSortedStudents, selectionAnchorId]);

  useEffect(() => {
    const hideContextMenu = () => {
      setContextMenu((previous) => ({ ...previous, visible: false }));
    };

    window.addEventListener("click", hideContextMenu);
    window.addEventListener("scroll", hideContextMenu, true);

    return () => {
      window.removeEventListener("click", hideContextMenu);
      window.removeEventListener("scroll", hideContextMenu, true);
    };
  }, []);

  useEffect(() => {
    if (!contextMenu.visible || !contextMenuRef.current) {
      return;
    }

    const menuRect = contextMenuRef.current.getBoundingClientRect();
    const margin = 8;

    const nextX = Math.max(
      margin,
      Math.min(contextMenu.x, window.innerWidth - menuRect.width - margin),
    );
    const nextY = Math.max(
      margin,
      Math.min(contextMenu.y, window.innerHeight - menuRect.height - margin),
    );

    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu((previous) => ({
        ...previous,
        x: nextX,
        y: nextY,
      }));
    }
  }, [contextMenu.visible, contextMenu.x, contextMenu.y]);

  const applyLevelToSelected = async (levelCode: string) => {
    if (!selectedClass || selectedStudentIds.size === 0 || bulkUpdating) {
      return;
    }

    const levelValue = levelCode === "magister" ? "" : levelCode;
    const selectedIds = new Set(selectedStudentIds);
    const selectedStudents = filteredAndSortedStudents.filter((student) =>
      selectedIds.has(student.id),
    );
    if (selectedStudents.length === 0) {
      return;
    }

    setBulkUpdating(true);
    try {
      await studentDB.savePropertyValuesBulk(
        selectedStudents.map((student) => ({
          studentId: student.id,
          className: selectedClass,
          schoolYear: currentSchoolYear,
          propertyId: LEVEL_OVERRIDE_PROPERTY_ID,
          value: levelValue,
        })),
      );

      setStudentsWithExtras((previous) =>
        previous.map((student) => {
          if (!selectedIds.has(student.id)) {
            return student;
          }

          const nextPropertyValues = new Map(student.propertyValues);
          nextPropertyValues.set(LEVEL_OVERRIDE_PROPERTY_ID, levelValue);

          return {
            ...student,
            propertyValues: nextPropertyValues,
          };
        }),
      );
    } catch (error) {
      logger.error("Failed to apply bulk level update:", error);
    } finally {
      setBulkUpdating(false);
      setContextMenu((previous) => ({ ...previous, visible: false }));
    }
  };

  const selectedBulkPropertyDefinition = propertyDefinitions.find(
    (property) => property.id === bulkPropertyId,
  );

  const applyPropertyValueToSelected = async () => {
    if (
      !selectedClass ||
      selectedStudentIds.size === 0 ||
      bulkUpdating ||
      !selectedBulkPropertyDefinition
    ) {
      return;
    }

    let propertyValue: string | number | boolean;
    if (selectedBulkPropertyDefinition.type === "boolean") {
      propertyValue = bulkPropertyBooleanValue;
    } else if (selectedBulkPropertyDefinition.type === "number") {
      propertyValue = Number(bulkPropertyNumberValue || "0");
    } else {
      propertyValue = bulkPropertyTextValue;
    }

    const selectedIds = new Set(selectedStudentIds);
    const selectedStudents = filteredAndSortedStudents.filter((student) =>
      selectedIds.has(student.id),
    );
    if (selectedStudents.length === 0) {
      return;
    }

    setBulkUpdating(true);
    try {
      await studentDB.savePropertyValuesBulk(
        selectedStudents.map((student) => ({
          studentId: student.id,
          className: selectedClass,
          schoolYear: currentSchoolYear,
          propertyId: selectedBulkPropertyDefinition.id,
          value: propertyValue,
        })),
      );

      setStudentsWithExtras((previous) =>
        previous.map((student) => {
          if (!selectedIds.has(student.id)) {
            return student;
          }

          const nextPropertyValues = new Map(student.propertyValues);
          nextPropertyValues.set(
            selectedBulkPropertyDefinition.id,
            propertyValue,
          );

          return {
            ...student,
            propertyValues: nextPropertyValues,
          };
        }),
      );

      setShowBulkPropertyDialog(false);
    } catch (error) {
      logger.error("Failed to apply bulk property value update:", error);
    } finally {
      setBulkUpdating(false);
    }
  };

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        "button, input, textarea, select, [role='button'], [role='checkbox'], [data-slot='select-trigger']",
      ),
    );
  };

  const handleRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    studentId: number,
  ) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    setContextMenu((previous) => ({ ...previous, visible: false }));

    if (event.shiftKey && selectionAnchorId !== null) {
      const currentIndex = filteredAndSortedStudents.findIndex(
        (student) => student.id === studentId,
      );
      const anchorIndex = filteredAndSortedStudents.findIndex(
        (student) => student.id === selectionAnchorId,
      );

      if (currentIndex !== -1 && anchorIndex !== -1) {
        const start = Math.min(anchorIndex, currentIndex);
        const end = Math.max(anchorIndex, currentIndex);
        const rangeIds = filteredAndSortedStudents
          .slice(start, end + 1)
          .map((student) => student.id);

        setSelectedStudentIds((previous) => {
          if (event.metaKey || event.ctrlKey) {
            const next = new Set(previous);
            rangeIds.forEach((id) => next.add(id));
            return next;
          }

          return new Set(rangeIds);
        });
        setSelectionAnchorId(studentId);
        return;
      }
    }

    setSelectedStudentIds((previous) => {
      if (event.metaKey || event.ctrlKey) {
        const next = new Set(previous);
        if (next.has(studentId)) {
          next.delete(studentId);
        } else {
          next.add(studentId);
        }
        return next;
      }

      return new Set([studentId]);
    });
    setSelectionAnchorId(studentId);
  };

  const handleRowMouseDown = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    // Prevent browser text selection while selecting rows.
    event.preventDefault();
  };

  const handleRowContextMenu = (
    event: React.MouseEvent<HTMLTableRowElement>,
    studentId: number,
  ) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    event.preventDefault();

    setSelectedStudentIds((previous) => {
      if (previous.has(studentId)) {
        return previous;
      }
      return new Set([studentId]);
    });
    setSelectionAnchorId(studentId);

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      visible: true,
    });
  };

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

    // Update local state immediately (optimistic update)
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

    // Save in background
    try {
      await studentDB.savePropertyValue({
        studentId: student.id,
        className: selectedClass,
        schoolYear: currentSchoolYear,
        propertyId,
        value,
      });
    } catch (error) {
      logger.error("Failed to save property value:", error);
    }
  };

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    student: StudentWithExtras,
    propertyId: string,
  ) => {
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;

    // Update value
    handlePropertyValueChange(student, propertyId, e.target.value);
  };

  const handleActiveChange = (
    student: StudentWithExtras,
    isActive: boolean,
  ) => {
    handlePropertyValueChange(
      student,
      INACTIVE_STUDENT_PROPERTY_ID,
      isActive ? false : true,
    );
    onStudentActiveChange?.(student.id, isActive);
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 5.5) {
      return "text-green-600 dark:text-green-400 font-semibold";
    }
    return "text-red-600 dark:text-red-400 font-semibold";
  };

  const levelOptions = Array.from(
    new Set(studentsWithExtras.map((student) => getNiveau(student))),
  )
    .filter((niveau) => niveau && niveau !== "-")
    .sort();

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
            {selectedStudentIds.size > 0 && (
              <span className="text-muted-foreground">
                {t("selectedRowsCount", { count: selectedStudentIds.size })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {t("rightClickRowsHint")}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPropertyManager(true)}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              {t("manageProperties")}
            </Button>
          </div>
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
            <Table className="[&_tbody_td]:px-2 [&_tbody_td]:py-1.5 [&_thead_th]:px-2 [&_thead_th]:py-2">
              <StudentTableHeader
                recentTests={recentTests}
                propertyDefinitions={propertyDefinitions}
                showActiveColumn={Boolean(selectedClass)}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                filters={filters}
                levelOptions={levelOptions}
                onSort={handleSort}
                onFilterChange={handleFilterChange}
              />
              <TableBody>
                {filteredAndSortedStudents.map((student) => (
                  <StudentTableRow
                    key={student.id}
                    student={student}
                    recentTests={recentTests}
                    propertyDefinitions={propertyDefinitions}
                    getFullName={getFullName}
                    getDefaultNiveau={getDefaultNiveau}
                    getDefaultNiveauCode={getDefaultNiveauCode}
                    showActiveColumn={Boolean(selectedClass)}
                    onActiveChange={handleActiveChange}
                    onPropertyValueChange={handlePropertyValueChange}
                    onTextareaChange={handleTextareaChange}
                    getGradeColor={getGradeColor}
                    selected={selectedStudentIds.has(student.id)}
                    onRowMouseDown={handleRowMouseDown}
                    onRowClick={(event) => handleRowClick(event, student.id)}
                    onRowContextMenu={(event) =>
                      handleRowContextMenu(event, student.id)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {contextMenu.visible &&
          selectedStudentIds.size > 0 &&
          createPortal(
            <div
              ref={contextMenuRef}
              className="bg-popover text-popover-foreground fixed z-60 min-w-[220px] rounded-md border p-1 shadow-md"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm"
                onClick={() => {
                  setShowBulkPropertyDialog(true);
                  setContextMenu((previous) => ({
                    ...previous,
                    visible: false,
                  }));
                }}
              >
                {t("contextEditPropertyValues")}
              </button>

              <div className="bg-border my-1 h-px" />
              <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
                {t("contextSetLevel")}
              </div>
              <button
                className="hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm"
                onClick={() => applyLevelToSelected("magister")}
                disabled={bulkUpdating}
              >
                {t("followMagister")}
              </button>
              {LEVEL_OVERRIDE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  className="hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm"
                  onClick={() => applyLevelToSelected(option.code)}
                  disabled={bulkUpdating}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )}

        <Dialog
          open={showBulkPropertyDialog}
          onOpenChange={setShowBulkPropertyDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("bulkEditPropertyValuesTitle")}</DialogTitle>
              <DialogDescription>
                {t("bulkEditPropertyValuesDescription", {
                  count: selectedStudentIds.size,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("property")}</label>
                <Select
                  value={bulkPropertyId}
                  onValueChange={(value) => {
                    setBulkPropertyId(value);
                    const definition = propertyDefinitions.find(
                      (property) => property.id === value,
                    );
                    if (!definition) return;

                    if (definition.type === "boolean") {
                      setBulkPropertyBooleanValue(false);
                    } else if (definition.type === "number") {
                      setBulkPropertyNumberValue("0");
                    } else {
                      setBulkPropertyTextValue("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectProperty")} />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyDefinitions
                      .filter(
                        (property) =>
                          property.id !== LEVEL_OVERRIDE_PROPERTY_ID &&
                          property.id !== INACTIVE_STUDENT_PROPERTY_ID,
                      )
                      .map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBulkPropertyDefinition?.type === "boolean" && (
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Checkbox
                    checked={bulkPropertyBooleanValue}
                    onCheckedChange={(checked) =>
                      setBulkPropertyBooleanValue(checked === true)
                    }
                    aria-label={selectedBulkPropertyDefinition.name}
                  />
                </div>
              )}

              {selectedBulkPropertyDefinition?.type === "number" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("value")}</label>
                  <Input
                    type="number"
                    value={bulkPropertyNumberValue}
                    onChange={(event) =>
                      setBulkPropertyNumberValue(event.target.value)
                    }
                  />
                </div>
              )}

              {selectedBulkPropertyDefinition &&
                selectedBulkPropertyDefinition.type !== "boolean" &&
                selectedBulkPropertyDefinition.type !== "number" && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("value")}</label>
                    {selectedBulkPropertyDefinition.type === "longtext" ? (
                      <textarea
                        value={bulkPropertyTextValue}
                        onChange={(event) =>
                          setBulkPropertyTextValue(event.target.value)
                        }
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      />
                    ) : (
                      <Input
                        type="text"
                        maxLength={
                          selectedBulkPropertyDefinition.type === "letter"
                            ? 1
                            : undefined
                        }
                        value={bulkPropertyTextValue}
                        onChange={(event) =>
                          setBulkPropertyTextValue(event.target.value)
                        }
                      />
                    )}
                  </div>
                )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBulkPropertyDialog(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={applyPropertyValueToSelected}
                disabled={
                  bulkUpdating ||
                  !selectedBulkPropertyDefinition ||
                  selectedStudentIds.size === 0
                }
              >
                {t("apply")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
