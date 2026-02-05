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
import { ErrorBanner } from "../ui/error-banner";
import LoadingSpinner from "../LoadingSpinner";

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
    loading,
    error,
    classPlans,
    selectedPlanTab,
    onSelectClass,
    setSelectedPlanTab,
    clearError,
    refresh,
  } = useStudentDirectoryData();

  // Load view mode from localStorage on mount
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("student_directory_view_mode");
    if (
      saved &&
      (saved === "list" ||
        saved === "classroom" ||
        saved === "plans" ||
        saved === "grades")
    ) {
      return saved as ViewMode;
    }
    return DEFAULT_VIEW_MODE;
  });

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
    classroomKey: string,
  ) => {
    const updatedPositions = new Map(seatingPositions);
    let classPositions = updatedPositions.get(classroomKey) || [];

    classPositions = classPositions.filter(
      (pos) => pos.studentId !== studentId,
    );
    classPositions.push({
      studentId,
      row,
      col,
      className: classroomKey,
      schoolYear: currentSchoolYear,
    });

    // No compacting - students stay exactly where you drop them
    updatedPositions.set(classroomKey, classPositions);
    setSeatingPositions(updatedPositions);
    saveSeatingPositions(updatedPositions);
  };

  const getStudentAtPosition = (
    row: number,
    col: number,
    classroomKey: string,
  ): Student | null => {
    if (!classroomKey) return null;
    const classPositions = seatingPositions.get(classroomKey);
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

  const handleDrop = (
    event: DragEvent<Element>,
    row: number,
    col: number,
    classroomKey: string,
  ) => {
    event.preventDefault();

    if (!draggedStudent || !selectedClass) {
      return;
    }

    const existingStudent = getStudentAtPosition(row, col, classroomKey);

    if (existingStudent && existingStudent.id !== draggedStudent.id) {
      // Swapping two students - don't compact
      const classPositions = seatingPositions.get(classroomKey) || [];
      const draggedPosition = classPositions.find(
        (pos) => pos.studentId === draggedStudent.id,
      );

      if (draggedPosition) {
        const updatedPositions = new Map(seatingPositions);
        let positions = updatedPositions.get(classroomKey) || [];

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
          className: classroomKey,
          schoolYear: currentSchoolYear,
        });
        positions.push({
          studentId: existingStudent.id,
          row: draggedOldRow,
          col: draggedOldCol,
          className: classroomKey,
          schoolYear: currentSchoolYear,
        });

        // Don't compact on swap - preserve positions
        updatedPositions.set(classroomKey, positions);
        setSeatingPositions(updatedPositions);
        saveSeatingPositions(updatedPositions);
      } else {
        setStudentPosition(draggedStudent.id, row, col, classroomKey);

        const updatedPositions = new Map(seatingPositions);
        let positions = updatedPositions.get(classroomKey) || [];
        positions = positions.filter(
          (pos) => pos.studentId !== existingStudent.id,
        );
        updatedPositions.set(classroomKey, positions);
        setSeatingPositions(updatedPositions);
        saveSeatingPositions(updatedPositions);
      }
    } else {
      // Dropping into empty cell
      setStudentPosition(draggedStudent.id, row, col, classroomKey);
    }

    // Reset extra columns and rows to 0 after drop
    localStorage.removeItem(`classroom_extra_cols_${selectedClass}`);
    localStorage.removeItem(`classroom_extra_rows_${selectedClass}`);

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
    // Save to localStorage
    localStorage.setItem("student_directory_view_mode", mode);
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
          onReloadPlans={refresh}
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
            visibleCount={visibleCount}
            selectedClass={selectedClass}
            viewMode={viewMode}
            loading={loading}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        <ErrorBanner
          error={error}
          variant={statusMessageVariant === "error" ? "error" : "success"}
          onDismiss={clearError}
        />

        {loading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner text={t("loadingStudents")} />
          </div>
        )}

        <div className="flex-1 overflow-auto">{content}</div>
      </div>
    </div>
  );
}
