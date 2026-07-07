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
import { studentDB } from "@/services/student-database";
import type { ClassroomLayoutData } from "@/services/student-database";
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
import { INACTIVE_STUDENT_PROPERTY_ID } from "@/helpers/student_helpers";

const DEFAULT_VIEW_MODE: ViewMode = "list";

const createDefaultClassroomLayoutData = (): ClassroomLayoutData => ({
  seatingPositions: {},
  classroomsByClass: {},
  selectedClassroomByClass: {},
  teacherPositionByClass: {},
});

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
  const [classroomLayoutData, setClassroomLayoutData] =
    useState<ClassroomLayoutData>(createDefaultClassroomLayoutData);
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);
  const [inactiveStudentIds, setInactiveStudentIds] = useState<Set<number>>(
    () => new Set(),
  );
  const currentWeek = useMemo(() => getCurrentWeekNumber(), []);

  useEffect(() => {
    if (!selectedClass) {
      setInactiveStudentIds(new Set());
      return;
    }

    const classStudents = students.filter(
      (student) =>
        Array.isArray(student.klassen) &&
        student.klassen.includes(selectedClass),
    );
    if (classStudents.length === 0) {
      setInactiveStudentIds(new Set());
      return;
    }

    let cancelled = false;

    const loadInactiveStudents = async () => {
      try {
        const values = await studentDB.getPropertyValuesBatch(
          classStudents.map((student) => student.id),
          selectedClass,
          currentSchoolYear,
        );

        const nextInactiveIds = new Set(
          values
            .filter(
              (value) =>
                value.propertyId === INACTIVE_STUDENT_PROPERTY_ID &&
                value.value === true,
            )
            .map((value) => value.studentId),
        );

        if (!cancelled) {
          setInactiveStudentIds(nextInactiveIds);
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("Failed to load inactive student flags:", error);
        }
      }
    };

    void loadInactiveStudents();

    return () => {
      cancelled = true;
    };
  }, [students, selectedClass, currentSchoolYear]);

  const activeStudents = useMemo(
    () => students.filter((student) => !inactiveStudentIds.has(student.id)),
    [students, inactiveStudentIds],
  );

  useEffect(() => {
    const migrateLegacyLocalStorageIfNeeded = async (
      existingData: ClassroomLayoutData,
    ): Promise<ClassroomLayoutData> => {
      const legacySeatingRaw = localStorage.getItem(
        "classroom_seating_positions",
      );
      const hasLegacySeating = Boolean(legacySeatingRaw);

      const hasLegacyClassroomData = Object.keys(localStorage).some(
        (key) =>
          key.startsWith("classrooms_") ||
          key.startsWith("selected_classroom_") ||
          key.startsWith("classroom_teacher_position_"),
      );

      if (!hasLegacySeating && !hasLegacyClassroomData) {
        return existingData;
      }

      let didMigrate = false;
      const nextData: ClassroomLayoutData = {
        seatingPositions: { ...existingData.seatingPositions },
        classroomsByClass: { ...existingData.classroomsByClass },
        selectedClassroomByClass: { ...existingData.selectedClassroomByClass },
        teacherPositionByClass: { ...existingData.teacherPositionByClass },
      };

      if (legacySeatingRaw) {
        try {
          const legacySeating = JSON.parse(legacySeatingRaw) as Record<
            string,
            SeatingPosition[]
          >;
          for (const [key, positions] of Object.entries(legacySeating)) {
            if (!nextData.seatingPositions[key]) {
              nextData.seatingPositions[key] = positions.map((position) => ({
                ...position,
                schoolYear: position.schoolYear || currentSchoolYear,
              }));
              didMigrate = true;
            }
          }
        } catch (error) {
          logger.error(
            "Failed to parse legacy seating localStorage data:",
            error,
          );
        }
      }

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("classrooms_")) {
          const className = key.replace("classrooms_", "");
          if (!nextData.classroomsByClass[className]) {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            try {
              const parsed = JSON.parse(raw) as Array<
                string | { id: string; name: string }
              >;
              const classrooms = parsed
                .map((entry, index) => {
                  if (typeof entry === "string") {
                    return {
                      id: `migrated_${index}_${Date.now()}`,
                      name: entry,
                    };
                  }
                  return entry;
                })
                .filter((entry) => entry && entry.id && entry.name);

              if (classrooms.length > 0) {
                nextData.classroomsByClass[className] = classrooms;
                didMigrate = true;
              }
            } catch (error) {
              logger.error(
                `Failed to parse legacy classrooms for ${className}:`,
                error,
              );
            }
          }
        }

        if (key.startsWith("selected_classroom_")) {
          const className = key.replace("selected_classroom_", "");
          if (!nextData.selectedClassroomByClass[className]) {
            const selectedClassroom = localStorage.getItem(key);
            if (selectedClassroom) {
              nextData.selectedClassroomByClass[className] = selectedClassroom;
              didMigrate = true;
            }
          }
        }

        if (key.startsWith("classroom_teacher_position_")) {
          const className = key.replace("classroom_teacher_position_", "");
          if (!nextData.teacherPositionByClass[className]) {
            const teacherPosition = localStorage.getItem(key);
            if (
              teacherPosition === "left" ||
              teacherPosition === "center" ||
              teacherPosition === "right"
            ) {
              nextData.teacherPositionByClass[className] = teacherPosition;
              didMigrate = true;
            }
          }
        }
      });

      if (didMigrate) {
        await studentDB.saveClassroomLayoutData(nextData);
        localStorage.removeItem("classroom_seating_positions");
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("classrooms_") ||
            key.startsWith("selected_classroom_") ||
            key.startsWith("classroom_teacher_position_") ||
            key.startsWith("classroom_extra_rows_") ||
            key.startsWith("classroom_extra_cols_")
          ) {
            localStorage.removeItem(key);
          }
        });
      }

      return nextData;
    };

    const loadClassroomLayoutData = async () => {
      try {
        const storedData = await studentDB.getClassroomLayoutData();
        const mergedData = await migrateLegacyLocalStorageIfNeeded(storedData);
        setClassroomLayoutData(mergedData);
      } catch (error) {
        logger.error("Failed to load classroom layout data:", error);
      }
    };

    void loadClassroomLayoutData();
  }, [currentSchoolYear]);

  useEffect(() => {
    const positionsData = classroomLayoutData.seatingPositions;
    const filteredPositionsData: Record<string, SeatingPosition[]> = {};

    for (const [className, positions] of Object.entries(positionsData)) {
      filteredPositionsData[className] = positions
        .map((position) => ({
          ...position,
          schoolYear: position.schoolYear || currentSchoolYear,
        }))
        .filter((position) => position.schoolYear === currentSchoolYear);
    }

    setSeatingPositions(
      new Map<string, SeatingPosition[]>(Object.entries(filteredPositionsData)),
    );
  }, [classroomLayoutData, currentSchoolYear]);

  const saveSeatingPositions = (positions: Map<string, SeatingPosition[]>) => {
    const positionsData = Array.from(positions.entries()).reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, SeatingPosition[]>,
    );

    setClassroomLayoutData((previous) => {
      const nextData: ClassroomLayoutData = {
        ...previous,
        seatingPositions: {
          ...previous.seatingPositions,
          ...positionsData,
        },
      };

      void studentDB.saveClassroomLayoutData(nextData).catch((error) => {
        logger.error("Failed to save seating positions:", error);
      });

      return nextData;
    });
  };

  const handleClassroomLayoutDataChange = (
    updater: (previous: ClassroomLayoutData) => ClassroomLayoutData,
  ) => {
    setClassroomLayoutData((previous) => {
      const nextData = updater(previous);
      void studentDB.saveClassroomLayoutData(nextData).catch((error) => {
        logger.error("Failed to save classroom layout data:", error);
      });
      return nextData;
    });
  };

  const handleStudentActiveChange = (studentId: number, isActive: boolean) => {
    if (!selectedClass) return;

    setInactiveStudentIds((previous) => {
      const next = new Set(previous);
      if (isActive) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });

    if (!isActive) {
      const updatedPositions = new Map(seatingPositions);
      let didChange = false;

      for (const [key, positions] of updatedPositions.entries()) {
        if (!key.startsWith(`${selectedClass}::`)) {
          continue;
        }

        const filteredPositions = positions.filter(
          (position) => position.studentId !== studentId,
        );

        if (filteredPositions.length !== positions.length) {
          updatedPositions.set(key, filteredPositions);
          didChange = true;
        }
      }

      if (didChange) {
        setSeatingPositions(updatedPositions);
        saveSeatingPositions(updatedPositions);
      }
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
          students={activeStudents}
          seatingPositions={seatingPositions}
          classroomLayoutData={classroomLayoutData}
          onClassroomLayoutDataChange={handleClassroomLayoutDataChange}
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
        <GradesView selectedClass={selectedClass} students={activeStudents} />
      );
      break;
    default:
      content = (
        <StudentListView
          students={filteredStudents}
          selectedClass={selectedClass}
          loading={loading}
          totalStudents={students.length}
          onStudentActiveChange={handleStudentActiveChange}
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
