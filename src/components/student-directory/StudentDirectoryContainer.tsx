import {
  useMemo,
  useState,
  useEffect,
  type DragEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useSchoolYear } from "../../contexts/SchoolYearContext";
import { getCurrentWeekNumber } from "@/utils/week-utils";
import { logger } from "@/utils/logger";
import type { Student } from "@/services/student-database";
import type { SeatingPosition } from "./ClassroomGrid";
import { ClassFilter } from "./ClassFilter";
import { ClassroomView } from "./views/ClassroomView";
import { DirectoryHeader, type ViewMode } from "./DirectoryHeader";
import { GradesView } from "./views/GradesView";
import { useStudentDirectoryData } from "./hooks/useStudentDirectoryData";
import { PlansView } from "./views/PlansView";
import { StudentListView } from "./views/StudentListView";

const DEFAULT_VIEW_MODE: ViewMode = "list";

export function StudentDirectoryContainer() {
  const { t } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();
  const {
    students,
    filteredStudents,
    availableClasses,
    selectedClass,
    visibleCount,
    totalCount,
    loading,
    error,
    classPlans,
    selectedPlanTab,
    onSelectClass,
    setSelectedPlanTab,
    clearError,
  } = useStudentDirectoryData();

  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [seatingPositions, setSeatingPositions] = useState<
    Map<string, SeatingPosition[]>
  >(new Map());
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);
  const currentWeek = useMemo(() => getCurrentWeekNumber(), []);

  useEffect(() => {
    const loadSeatingPositions = () => {
      try {
        const saved = localStorage.getItem("classroom_seating_positions");
        if (!saved) {
          return;
        }

        const positionsData = JSON.parse(saved) as Record<
          string,
          SeatingPosition[]
        >;

        // Migrate old data without schoolYear field
        let migrated = 0;
        for (const positions of Object.values(positionsData)) {
          for (const position of positions) {
            if (!position.schoolYear) {
              position.schoolYear = currentSchoolYear;
              migrated++;
            }
          }
        }

        if (migrated > 0) {
          localStorage.setItem(
            "classroom_seating_positions",
            JSON.stringify(positionsData),
          );
          logger.log(
            `Migrated ${migrated} seating positions to have schoolYear field`,
          );
        }

        // Filter positions by current school year
        const filteredPositionsData: Record<string, SeatingPosition[]> = {};
        for (const [className, positions] of Object.entries(positionsData)) {
          filteredPositionsData[className] = positions.filter(
            (pos) => pos.schoolYear === currentSchoolYear,
          );
        }

        const positionsMap = new Map<string, SeatingPosition[]>(
          Object.entries(filteredPositionsData),
        );
        setSeatingPositions(positionsMap);
      } catch (err) {
        logger.error("Failed to load seating positions:", err);
      }
    };

    loadSeatingPositions();
  }, [currentSchoolYear]);

  const saveSeatingPositions = (positions: Map<string, SeatingPosition[]>) => {
    try {
      const positionsData = Array.from(positions.entries()).reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, SeatingPosition[]>,
      );
      localStorage.setItem(
        "classroom_seating_positions",
        JSON.stringify(positionsData),
      );
    } catch (err) {
      logger.error("Failed to save seating positions:", err);
    }
  };

  const setStudentPosition = (
    studentId: number,
    row: number,
    col: number,
    className: string,
  ) => {
    const updatedPositions = new Map(seatingPositions);
    let classPositions = updatedPositions.get(className) || [];

    classPositions = classPositions.filter(
      (pos) => pos.studentId !== studentId,
    );
    classPositions.push({
      studentId,
      row,
      col,
      className,
      schoolYear: currentSchoolYear,
    });

    updatedPositions.set(className, classPositions);
    setSeatingPositions(updatedPositions);
    saveSeatingPositions(updatedPositions);
  };

  const getStudentAtPosition = (
    row: number,
    col: number,
    className: string,
  ): Student | null => {
    if (!className) return null;
    const classPositions = seatingPositions.get(className);
    if (!classPositions) return null;

    const position = classPositions.find(
      (pos) => pos.row === row && pos.col === col,
    );

    if (!position) return null;

    return (
      students.find((student) => student.id === position.studentId) || null
    );
  };

  const handleDragStart = (event: DragEvent<Element>, student: Student) => {
    setDraggedStudent(student);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", student.id.toString());
  };

  const handleDragOver = (event: DragEvent<Element>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: DragEvent<Element>, row: number, col: number) => {
    event.preventDefault();

    if (!draggedStudent || !selectedClass) {
      return;
    }

    const existingStudent = getStudentAtPosition(row, col, selectedClass);

    if (existingStudent && existingStudent.id !== draggedStudent.id) {
      const classPositions = seatingPositions.get(selectedClass) || [];
      const draggedPosition = classPositions.find(
        (pos) => pos.studentId === draggedStudent.id,
      );

      if (draggedPosition) {
        const updatedPositions = new Map(seatingPositions);
        let positions = updatedPositions.get(selectedClass) || [];

        const draggedOldRow = draggedPosition.row;
        const draggedOldCol = draggedPosition.col;

        positions = positions.filter(
          (pos) =>
            pos.studentId !== draggedStudent.id &&
            pos.studentId !== existingStudent.id,
        );

        positions.push({
          studentId: draggedStudent.id,
          row,
          col,
          className: selectedClass,
          schoolYear: currentSchoolYear,
        });
        positions.push({
          studentId: existingStudent.id,
          row: draggedOldRow,
          col: draggedOldCol,
          className: selectedClass,
          schoolYear: currentSchoolYear,
        });

        updatedPositions.set(selectedClass, positions);
        setSeatingPositions(updatedPositions);
        saveSeatingPositions(updatedPositions);
      } else {
        setStudentPosition(draggedStudent.id, row, col, selectedClass);

        const updatedPositions = new Map(seatingPositions);
        let positions = updatedPositions.get(selectedClass) || [];
        positions = positions.filter(
          (pos) => pos.studentId !== existingStudent.id,
        );
        updatedPositions.set(selectedClass, positions);
        setSeatingPositions(updatedPositions);
        saveSeatingPositions(updatedPositions);
      }
    } else {
      setStudentPosition(draggedStudent.id, row, col, selectedClass);
    }

    setDraggedStudent(null);
  };

  const handleDragEnd = () => {
    setDraggedStudent(null);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === viewMode) {
      return;
    }

    if (
      (mode === "classroom" || mode === "plans" || mode === "grades") &&
      !selectedClass
    ) {
      return;
    }

    setViewMode(mode);
  };

  const statusMessageVariant = useMemo(() => {
    if (!error) {
      return "info";
    }

    if (error.startsWith("✅")) {
      return "success";
    }

    if (error.startsWith("📂")) {
      return "info";
    }

    return "error";
  }, [error]);

  const statusMessageStyles = useMemo(() => {
    switch (statusMessageVariant) {
      case "success":
        return "border border-green-200 bg-green-50 text-green-800";
      case "error":
        return "bg-destructive/10 border-destructive/20 text-destructive border";
      default:
        return "border border-blue-200 bg-blue-50 text-blue-800";
    }
  }, [statusMessageVariant]);

  let content: ReactNode;
  switch (viewMode) {
    case "classroom":
      content = (
        <ClassroomView
          selectedClass={selectedClass}
          students={students}
          seatingPositions={seatingPositions}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      );
      break;
    case "plans":
      content = (
        <PlansView
          classPlans={classPlans}
          selectedClass={selectedClass}
          selectedPlanTab={selectedPlanTab}
          onSelectPlan={setSelectedPlanTab}
          currentWeek={currentWeek}
        />
      );
      break;
    case "grades":
      content = (
        <GradesView selectedClass={selectedClass} students={students} />
      );
      break;
    default:
      content = (
        <StudentListView
          students={filteredStudents}
          selectedClass={selectedClass}
          loading={loading}
          totalStudents={students.length}
        />
      );
  }

  return (
    <div className="flex h-full">
      <ClassFilter
        students={students}
        availableClasses={availableClasses}
        selectedClass={selectedClass}
        onClassSelect={onSelectClass}
      />

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-6 space-y-4">
          <DirectoryHeader
            totalCount={totalCount}
            visibleCount={visibleCount}
            selectedClass={selectedClass}
            viewMode={viewMode}
            loading={loading}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        {error && (
          <div className={`mb-4 rounded-md px-4 py-3 ${statusMessageStyles}`}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium">
                {statusMessageVariant === "error"
                  ? `${t("errorLabel")}: ${error}`
                  : error}
              </p>
              <button
                type="button"
                onClick={clearError}
                className="text-muted-foreground text-xs underline-offset-4 hover:underline"
              >
                {t("dismiss")}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="border-primary mr-3 h-8 w-8 animate-spin rounded-full border-b-2" />
            <p>{t("loadingStudents")}</p>
          </div>
        )}

        <div className="flex-1 overflow-auto">{content}</div>
      </div>
    </div>
  );
}
