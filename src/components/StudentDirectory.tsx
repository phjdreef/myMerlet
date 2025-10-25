import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import {
  ListIcon,
  ChalkboardTeacherIcon,
  BooksIcon,
  ExamIcon,
} from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { studentDB, type Student } from "../services/student-database";
import { ClassFilter } from "./student-directory/ClassFilter";
import {
  ClassroomGrid,
  type SeatingPosition,
} from "./student-directory/ClassroomGrid";
import { StudentCard } from "./student-directory/StudentCard";
import { CurriculumTimeline } from "./curriculum/CurriculumTimeline";
import { getCurrentWeekNumber } from "../utils/week-utils";
import { logger } from "../utils/logger";
import type { CurriculumPlan } from "../services/curriculum-database";
import { ClassGradesTab } from "./student-directory/ClassGradesTab";

// View modes
type ViewMode = "list" | "classroom" | "plans" | "grades";

export default function StudentDirectory() {
  const { t } = useTranslation();

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [seatingPositions, setSeatingPositions] = useState<
    Map<string, SeatingPosition[]>
  >(new Map());
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);
  const [plans, setPlans] = useState<CurriculumPlan[]>([]);
  const [classPlans, setClassPlans] = useState<CurriculumPlan[]>([]);
  const [selectedPlanTab, setSelectedPlanTab] = useState<string>("");
  const currentWeek = getCurrentWeekNumber();

  // Database functions
  const loadFromDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      const [savedStudents, metadata] = await Promise.all([
        studentDB.getAllStudents(),
        studentDB.getMetadata(),
      ]);

      if (savedStudents.length > 0) {
        setStudents(savedStudents);
        setTotalCount(savedStudents.length);

        const savedDate = metadata
          ? new Date(metadata.value).toLocaleString()
          : "Unknown";

        setError(
          `✅ ${t("successfullyLoadedStudents", { count: savedStudents.length, date: savedDate })}`,
        );
        setTimeout(() => setError(null), 3000);
      } else {
        setError(`📂 ${t("noSavedStudentsFound")}`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      const errorMsg =
        t("failedToLoadFromDatabase") +
        ": " +
        (err instanceof Error ? err.message : t("unknownError"));
      setError(errorMsg);
      logger.error("Database load error:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save classroom seating positions to localStorage
   * @param positions Map of class names to seating position arrays
   */
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
    } catch (error) {
      logger.error("Failed to save seating positions:", error);
    }
  };

  /**
   * Load classroom seating positions from localStorage
   */
  const loadSeatingPositions = () => {
    try {
      const saved = localStorage.getItem("classroom_seating_positions");
      if (saved) {
        const positionsData = JSON.parse(saved) as Record<
          string,
          SeatingPosition[]
        >;
        const positionsMap = new Map(Object.entries(positionsData));
        setSeatingPositions(positionsMap);
      }
    } catch (error) {
      logger.error("Failed to load seating positions:", error);
    }
  };

  /**
   * Load curriculum plans from database
   */
  const loadPlans = async () => {
    try {
      const result = await window.curriculumAPI.getAllPlans();
      if (result.success && result.data) {
        const plansData = result.data as { plans: CurriculumPlan[] };
        setPlans(plansData.plans || []);
      }
    } catch (error) {
      logger.error("Failed to load plans:", error);
    }
  };

  // Effects
  useEffect(() => {
    loadFromDatabase();
    loadSeatingPositions();
    loadPlans();
    // We only need to run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Extract available classes from students
    const classSet = new Set<string>();
    students.forEach((student) => {
      if (student.klassen && Array.isArray(student.klassen)) {
        student.klassen.forEach((klass) => classSet.add(klass));
      }
    });
    setAvailableClasses(Array.from(classSet).sort());

    // Filter students by selected class
    const filtered = selectedClass
      ? students.filter((student) => student.klassen?.includes(selectedClass))
      : students;
    setFilteredStudents(filtered);

    // Filter plans by selected class
    const filteredPlans = selectedClass
      ? plans.filter((plan) => plan.classNames.includes(selectedClass))
      : [];
    setClassPlans(filteredPlans);

    // Set first plan as selected tab when plans change
    if (filteredPlans.length > 0 && !selectedPlanTab) {
      setSelectedPlanTab(filteredPlans[0].id);
    } else if (filteredPlans.length === 0) {
      setSelectedPlanTab("");
    }
  }, [students, selectedClass, plans, selectedPlanTab]);

  // Event handlers
  const handleClassFilter = (className: string | null) => {
    setSelectedClass(className);
  };

  // Seating management
  /**
   * Set a student's position in the classroom
   * @param studentId The ID of the student to position
   * @param row The row number (0-indexed)
   * @param col The column number (0-indexed)
   * @param className The class name for this seating arrangement
   */
  const setStudentPosition = (
    studentId: number,
    row: number,
    col: number,
    className: string,
  ) => {
    const newSeatingPositions = new Map(seatingPositions);
    let classPositions = newSeatingPositions.get(className) || [];

    classPositions = classPositions.filter(
      (pos) => pos.studentId !== studentId,
    );
    classPositions.push({ studentId, row, col, className });

    newSeatingPositions.set(className, classPositions);
    setSeatingPositions(newSeatingPositions);
    saveSeatingPositions(newSeatingPositions);
  };

  /**
   * Get the student currently seated at a specific position
   * @param row The row number (0-indexed)
   * @param col The column number (0-indexed)
   * @param className The class name to check
   * @returns The student at that position, or null if empty
   */
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, student: Student) => {
    setDraggedStudent(student);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", student.id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  /**
   * Handle drop event in classroom grid
   * Supports three scenarios:
   * 1. Swap: Both students are seated - they swap positions
   * 2. Displacement: Dragged student is unseated, existing student becomes unseated
   * 3. Simple placement: Empty cell, just place the student
   *
   * @param e The drag event
   * @param row Target row number (0-indexed)
   * @param col Target column number (0-indexed)
   */
  const handleDrop = async (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();

    if (draggedStudent && selectedClass) {
      const existingStudent = getStudentAtPosition(row, col, selectedClass);

      if (existingStudent && existingStudent.id !== draggedStudent.id) {
        // Swap: find dragged student's current position BEFORE any modifications
        const classPositions = seatingPositions.get(selectedClass) || [];
        const draggedPosition = classPositions.find(
          (pos) => pos.studentId === draggedStudent.id,
        );

        if (draggedPosition) {
          // Both students are seated - perform a true swap
          // Store the old positions before any modifications
          const draggedOldRow = draggedPosition.row;
          const draggedOldCol = draggedPosition.col;
          const existingRow = row;
          const existingCol = col;

          // Create new positions map with the swap
          const newSeatingPositions = new Map(seatingPositions);
          let positions = newSeatingPositions.get(selectedClass) || [];

          // Remove both students' old positions
          positions = positions.filter(
            (pos) =>
              pos.studentId !== draggedStudent.id &&
              pos.studentId !== existingStudent.id,
          );

          // Add both students at their new positions
          positions.push({
            studentId: draggedStudent.id,
            row: existingRow,
            col: existingCol,
            className: selectedClass,
          });
          positions.push({
            studentId: existingStudent.id,
            row: draggedOldRow,
            col: draggedOldCol,
            className: selectedClass,
          });

          newSeatingPositions.set(selectedClass, positions);
          setSeatingPositions(newSeatingPositions);
          saveSeatingPositions(newSeatingPositions);
        } else {
          // Dragged student was unseated, so existing student becomes unseated
          await setStudentPosition(draggedStudent.id, row, col, selectedClass);

          const newSeatingPositions = new Map(seatingPositions);
          let positions = newSeatingPositions.get(selectedClass) || [];
          positions = positions.filter(
            (pos) => pos.studentId !== existingStudent.id,
          );
          newSeatingPositions.set(selectedClass, positions);
          setSeatingPositions(newSeatingPositions);
          saveSeatingPositions(newSeatingPositions);
        }
      } else {
        // No existing student, just place
        await setStudentPosition(draggedStudent.id, row, col, selectedClass);
      }
    }

    setDraggedStudent(null);
  };

  const handleDragEnd = () => {
    setDraggedStudent(null);
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Class Filter */}
      <ClassFilter
        students={students}
        availableClasses={availableClasses}
        selectedClass={selectedClass}
        onClassSelect={handleClassFilter}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold">
            {t("classes")}
            {selectedClass && (
              <span className="text-muted-foreground ml-2 text-lg font-normal">
                - {selectedClass}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mb-4">
            {t("totalStudents")}: {totalCount} | {t("currentlyShowing")}:{" "}
            {filteredStudents.length}
            {selectedClass && ` | ${t("filteredBy")}: ${selectedClass}`}
          </p>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            {/* View Mode Toggle */}
            <div className="flex gap-1">
              <Button
                onClick={() => setViewMode("list")}
                disabled={loading}
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
              >
                <ListIcon className="mr-2 h-4 w-4" weight="regular" />
                {t("listView")}
              </Button>
              <Button
                onClick={() => setViewMode("classroom")}
                disabled={loading || !selectedClass}
                variant={viewMode === "classroom" ? "default" : "outline"}
                size="sm"
              >
                <ChalkboardTeacherIcon
                  className="mr-2 h-4 w-4"
                  weight="regular"
                />
                {t("floorPlan")}
              </Button>
              <Button
                onClick={() => setViewMode("plans")}
                disabled={loading || !selectedClass}
                variant={viewMode === "plans" ? "default" : "outline"}
                size="sm"
              >
                <BooksIcon className="mr-2 h-4 w-4" weight="regular" />
                {t("planning")}
              </Button>
              <Button
                onClick={() => setViewMode("grades")}
                disabled={loading || !selectedClass}
                variant={viewMode === "grades" ? "default" : "outline"}
                size="sm"
              >
                <ExamIcon className="mr-2 h-4 w-4" weight="regular" />
                {t("gradesView")}
              </Button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div
            className={`mb-4 rounded-md px-4 py-3 ${
              error.startsWith("✅")
                ? "border border-green-200 bg-green-50 text-green-800"
                : error.startsWith("📂")
                  ? "border border-blue-200 bg-blue-50 text-blue-800"
                  : "bg-destructive/10 border-destructive/20 text-destructive border"
            }`}
          >
            <p className="text-sm font-medium">
              {error.startsWith("✅") || error.startsWith("📂")
                ? error
                : `Error: ${error}`}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="border-primary mr-3 h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p>{t("loadingStudents")}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {viewMode === "classroom" ? (
            <ClassroomGrid
              key={selectedClass || "no-class"}
              selectedClass={selectedClass}
              students={students}
              seatingPositions={seatingPositions}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ) : viewMode === "plans" ? (
            <>
              {classPlans.length > 0 ? (
                <Tabs
                  value={selectedPlanTab}
                  onValueChange={setSelectedPlanTab}
                  className="flex h-full flex-col"
                >
                  <div className="sticky top-0 z-10 bg-white pb-2 dark:bg-gray-900">
                    <TabsList>
                      {classPlans.map((plan) => (
                        <TabsTrigger key={plan.id} value={plan.id}>
                          {plan.subject} ({plan.schoolYear})
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {classPlans.map((plan) => (
                      <TabsContent key={plan.id} value={plan.id}>
                        <CurriculumTimeline
                          plan={plan}
                          currentWeek={currentWeek}
                        />
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {selectedClass
                      ? `${t("noPlansFoundForClass")} "${selectedClass}".`
                      : t("selectClassToViewPlans")}
                  </p>
                </div>
              )}
            </>
          ) : viewMode === "grades" ? (
            <ClassGradesTab selectedClass={selectedClass} students={students} />
          ) : (
            <>
              {filteredStudents.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      selectedClass={selectedClass}
                    />
                  ))}
                </div>
              )}

              {!loading &&
                filteredStudents.length === 0 &&
                students.length > 0 && (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {t("noStudentsFoundForClass")} "{selectedClass}".
                    </p>
                  </div>
                )}

              {!loading && students.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {t("noStudentsLoadedClickToStart")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
