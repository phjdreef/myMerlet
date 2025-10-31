import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  UsersThreeIcon,
  ChalkboardTeacherIcon,
  ArrowUpIcon,
} from "@phosphor-icons/react";
import type { Student } from "@/services/student-database";
import { StudentPhoto } from "./StudentPhoto";
import { formatStudentName } from "@/helpers/student_helpers";

export interface SeatingPosition {
  studentId: number;
  row: number;
  col: number;
  className: string;
  schoolYear: string;
}

interface ClassroomGridProps {
  selectedClass: string | null;
  students: Student[];
  seatingPositions: Map<string, SeatingPosition[]>;
  onDragStart: (e: React.DragEvent, student: Student) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, row: number, col: number) => void;
}

const MIN_ROWS = 1; // Always show at least 1 row

export function ClassroomGrid({
  selectedClass,
  students,
  seatingPositions,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ClassroomGridProps) {
  const { t } = useTranslation();
  const [draggedStudentId, setDraggedStudentId] = useState<number | null>(null);

  if (!selectedClass) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">{t("selectClass")}</p>
      </div>
    );
  }

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

  // Calculate the number of rows needed based on occupied seats
  const getRequiredRows = (className: string): number => {
    const classPositions = seatingPositions.get(className) || [];
    if (classPositions.length === 0) return MIN_ROWS;

    // Find the highest row number that has a student
    const maxRow = Math.max(...classPositions.map((pos) => pos.row));

    // Always show one extra row beyond the last occupied row
    return Math.max(MIN_ROWS, maxRow + 2);
  };

  // Calculate the number of columns needed (always show one extra)
  const getRequiredCols = (className: string): number => {
    const classPositions = seatingPositions.get(className) || [];
    if (classPositions.length === 0) return 2; // Show at least 2 columns for empty classroom

    // Find the highest column number that has a student
    const maxCol = Math.max(...classPositions.map((pos) => pos.col));

    // Always show one extra column beyond the last occupied column, but at least 2
    return Math.max(2, maxCol + 2);
  };

  const requiredRows = getRequiredRows(selectedClass);
  const requiredCols = getRequiredCols(selectedClass);

  const getUnpositionedStudents = (className: string): Student[] => {
    if (!className) return [];
    const classStudents = students.filter(
      (student) => student.klassen && student.klassen.includes(className),
    );
    const classPositions = seatingPositions.get(className) || [];
    const positionedStudentIds = new Set(
      classPositions.map((pos) => pos.studentId),
    );

    return classStudents.filter(
      (student) => !positionedStudentIds.has(student.id),
    );
  };

  const unpositionedStudents = getUnpositionedStudents(selectedClass);

  return (
    <div className="space-y-6">
      {/* Unpositioned Students */}
      {unpositionedStudents.length > 0 && (
        <div className="border-border bg-card rounded-lg border p-4">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <UsersThreeIcon className="h-5 w-5" weight="duotone" />
            <span>
              {t("studentsNotSeated")} ({unpositionedStudents.length})
            </span>
          </h3>
          <div className="flex flex-wrap gap-3">
            {unpositionedStudents.map((student) => (
              <div
                key={student.id}
                className="border-border bg-background hover:bg-accent flex cursor-grab items-center gap-2 rounded-lg border p-2 shadow-sm transition-colors hover:shadow-md active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  setDraggedStudentId(student.id);
                  onDragStart(e, student);
                }}
                onDragEnd={() => {
                  setDraggedStudentId(null);
                  onDragEnd();
                }}
                title={t("dragToSeat")}
              >
                <div className="h-10 w-10">
                  <StudentPhoto student={student} size="small" />
                </div>
                <div className="text-sm">
                  <div className="font-medium">{student.roepnaam}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatStudentName(student, { includeRoepnaam: false })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classroom Grid */}
      <div className="border-border bg-card rounded-lg border p-4">
        <h3 className="text-muted-foreground mb-4 flex items-center justify-center gap-2 text-center text-lg font-semibold">
          <ChalkboardTeacherIcon className="h-5 w-5" weight="duotone" />
          <span>
            {t("classroomLayout")} - {selectedClass}
          </span>
        </h3>

        {/* Front of classroom indicator */}
        <div className="mb-4 flex items-center justify-center">
          <div className="border-primary bg-primary/10 rounded-lg border-2 px-6 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ArrowUpIcon className="h-4 w-4" weight="bold" />
              {t("classroomFront")}
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-4">
          {Array.from({ length: requiredRows }, (_, row) => (
            <div key={`row-${row}`} className="flex w-full gap-4">
              {Array.from({ length: requiredCols }, (_, col) => {
                const student = getStudentAtPosition(row, col, selectedClass);

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`border-border flex size-[140px] shrink-0 items-center justify-center rounded-lg border-2 p-2 text-center transition-all duration-200 ${
                      student
                        ? "border-primary bg-primary/10 border-solid"
                        : "hover:border-primary/50 hover:bg-accent/50 border-dashed"
                    }`}
                    onDragOver={onDragOver}
                    onDrop={(e) => {
                      onDrop(e, row, col);
                      // Force reset drag state after drop
                      setTimeout(() => setDraggedStudentId(null), 0);
                    }}
                  >
                    {student ? (
                      <div
                        className={`flex h-full w-full cursor-grab flex-col items-center justify-between overflow-hidden py-2 transition-opacity select-none active:cursor-grabbing ${
                          draggedStudentId === student.id
                            ? "opacity-50"
                            : "opacity-100"
                        }`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedStudentId(student.id);
                          onDragStart(e, student);
                        }}
                        onDragEnd={() => {
                          // Reset immediately
                          setDraggedStudentId(null);
                          onDragEnd();
                        }}
                        onDrop={() => {
                          // Also reset on drop to ensure it clears
                          setDraggedStudentId(null);
                        }}
                        title={t("dragToMove")}
                      >
                        <div className="pointer-events-none flex w-full flex-1 items-center justify-center">
                          <StudentPhoto student={student} size="large" />
                        </div>
                        <span className="pointer-events-none mt-1 w-full truncate px-1 text-center text-xs font-medium">
                          {formatStudentName(student)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
