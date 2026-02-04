import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { domToJpeg } from "modern-screenshot";
import {
  UsersThreeIcon,
  ChalkboardTeacherIcon,
  PlusIcon,
  PrinterIcon,
  DownloadIcon,
} from "@phosphor-icons/react";
import type { Student } from "@/services/student-database";
import { StudentPhoto } from "./StudentPhoto";
import { formatStudentName } from "@/helpers/student_helpers";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type TeacherPosition = "left" | "center" | "right";

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
  const [printMode, setPrintMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Memoize extra rows/cols based on selected class
  const currentExtraRows = useMemo(() => {
    if (!selectedClass) return 0;
    const saved = localStorage.getItem(`classroom_extra_rows_${selectedClass}`);
    return saved ? parseInt(saved, 10) : 0;
  }, [selectedClass]);

  const currentExtraCols = useMemo(() => {
    if (!selectedClass) return 0;
    const saved = localStorage.getItem(`classroom_extra_cols_${selectedClass}`);
    return saved ? parseInt(saved, 10) : 0;
  }, [selectedClass]);

  const [extraRows, setExtraRowsState] = useState(currentExtraRows);
  const [extraCols, setExtraColsState] = useState(currentExtraCols);

  // Update extra rows/cols when class changes
  useEffect(() => {
    setExtraRowsState(currentExtraRows);
    setExtraColsState(currentExtraCols);
  }, [currentExtraRows, currentExtraCols]);

  // One-time cleanup: remove any saved extra columns/rows on mount
  useEffect(() => {
    if (selectedClass) {
      localStorage.removeItem(`classroom_extra_cols_${selectedClass}`);
      localStorage.removeItem(`classroom_extra_rows_${selectedClass}`);
      setExtraRowsState(0);
      setExtraColsState(0);
    }
  }, [selectedClass]);

  // Helper functions to update and save extra rows/cols
  const setExtraRows = (value: number | ((prev: number) => number)) => {
    const newValue = typeof value === "function" ? value(extraRows) : value;
    setExtraRowsState(newValue);
    if (selectedClass) {
      localStorage.setItem(
        `classroom_extra_rows_${selectedClass}`,
        newValue.toString(),
      );
    }
  };

  const setExtraCols = (value: number | ((prev: number) => number)) => {
    const newValue = typeof value === "function" ? value(extraCols) : value;
    setExtraColsState(newValue);
    if (selectedClass) {
      localStorage.setItem(
        `classroom_extra_cols_${selectedClass}`,
        newValue.toString(),
      );
    }
  };

  // Memoize position based on selected class
  const currentTeacherPosition = useMemo<TeacherPosition>(() => {
    if (!selectedClass) return "center";
    const saved = localStorage.getItem(
      `classroom_teacher_position_${selectedClass}`,
    );
    if (
      saved &&
      (saved === "left" || saved === "center" || saved === "right")
    ) {
      return saved as TeacherPosition;
    }
    return "center";
  }, [selectedClass]);

  const [teacherPosition, setTeacherPositionState] = useState<TeacherPosition>(
    currentTeacherPosition,
  );

  // Update state when class changes using useEffect
  useEffect(() => {
    setTeacherPositionState(currentTeacherPosition);
  }, [currentTeacherPosition]);

  // Save teacher position to localStorage
  const handleTeacherPositionChange = (position: string) => {
    if (!selectedClass || !position) return;
    const validPosition = position as TeacherPosition;
    setTeacherPositionState(validPosition);
    localStorage.setItem(
      `classroom_teacher_position_${selectedClass}`,
      validPosition,
    );
  };

  // Handle print mode
  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  // Handle export to JPG
  const handleExportJPG = async () => {
    if (!selectedClass) return;
    
    setExportMode(true);
    
    // Wait for the mode to take effect and render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      // Find the export area
      const exportArea = document.getElementById('classroom-export-area');
      if (!exportArea) {
        console.error('Export area not found');
        setExportMode(false);
        return;
      }
      
      // Use modern-screenshot to convert to data URL
      const dataUrl = await domToJpeg(exportArea, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      // Download the image
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `klasindeling-${selectedClass}-${new Date().toISOString().split('T')[0]}.jpg`;
      link.click();
      
      setExportMode(false);
    } catch (error) {
      console.error('Failed to export:', error);
      setExportMode(false);
    }
  };

  // Scroll to bottom when class changes
  useEffect(() => {
    if (selectedClass && gridContainerRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        gridContainerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
    }
  }, [selectedClass]);

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

    // If no students positioned, only show extra rows (minimum 1)
    if (classPositions.length === 0) {
      return Math.max(1, extraRows);
    }

    // Find the highest row number that has a student (0-indexed)
    const maxRow = Math.max(...classPositions.map((pos) => pos.row));

    // Total rows = positions needed + extra rows
    return maxRow + 1 + extraRows;
  };

  // Calculate the number of columns needed
  const getRequiredCols = (className: string): number => {
    const classPositions = seatingPositions.get(className) || [];

    // If no students positioned, only show extra columns (minimum 1 for dragging)
    if (classPositions.length === 0) {
      return Math.max(1, extraCols);
    }

    // Find the highest column number that has a student (0-indexed)
    const maxCol = Math.max(...classPositions.map((pos) => pos.col));

    // Show occupied columns + any extra columns user added
    // Don't automatically add an extra empty column - users can click "Add Column" if needed
    return maxCol + 1 + extraCols;
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
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #classroom-print-area,
          #classroom-print-area * {
            visibility: visible;
          }
          #classroom-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="space-y-6">
      {/* Unpositioned Students - Sticky */}
      {!printMode && !exportMode && unpositionedStudents.length > 0 && (
        <div className="border-border bg-card/70 sticky top-0 z-10 rounded-lg border p-4 shadow-md backdrop-blur-sm">
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
      <div
        id={exportMode ? "classroom-export-area" : "classroom-print-area"}
        ref={gridContainerRef}
        className="border-border bg-card rounded-lg border p-4"
      >
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: requiredRows }, (_, row) => (
            <div key={`row-${row}`} className="flex w-full gap-3">
              {Array.from({ length: requiredCols }, (_, col) => {
                const student = getStudentAtPosition(row, col, selectedClass);

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`border-border flex size-[110px] shrink-0 items-center justify-center rounded-lg border p-1.5 text-center transition-all duration-200 ${
                      student
                        ? "border-primary bg-primary/10 border-solid"
                        : "hover:border-primary/50 hover:bg-accent/50 border-dashed"
                    }`}
                    onDragOver={onDragOver}
                    onDrop={(e) => {
                      onDrop(e, row, col);
                      // Reset extra columns and rows after drop
                      setExtraRowsState(0);
                      setExtraColsState(0);
                      // Force reset drag state after drop
                      setTimeout(() => setDraggedStudentId(null), 0);
                    }}
                  >
                    {student ? (
                      <div
                        className={`flex h-full w-full cursor-grab flex-col items-center justify-between overflow-hidden py-1 transition-opacity select-none active:cursor-grabbing ${
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
                        <div className="flex w-full flex-1 items-center justify-center">
                          <StudentPhoto student={student} size="large" />
                        </div>
                        <span className="mt-0.5 w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight">
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

        {/* Teacher Position Visual */}
        <div
          className={`mt-4 flex ${teacherPosition === "left" ? "justify-start" : teacherPosition === "right" ? "justify-end" : "justify-center"}`}
        >
          <div className="bg-primary/10 text-primary flex items-center gap-2 rounded-lg border border-primary/30 px-4 py-2 font-medium shadow-sm">
            <ChalkboardTeacherIcon className="h-5 w-5" weight="fill" />
            <span>{t("teacher")}</span>
          </div>
        </div>

        {/* Controls for adding rows and columns - sticky at bottom */}
        {!printMode && !exportMode && (
        <div className="border-border bg-card/95 no-print sticky bottom-0 z-10 -mx-4 -mb-4 flex items-center justify-between gap-4 border-t p-4 backdrop-blur-sm">
          {/* Left: Row and Column Controls */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtraRows((prev) => Math.max(0, prev - 1))}
                disabled={extraRows === 0}
                className="px-2"
                title={`Extra rows: ${extraRows}`}
              >
                −
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtraRows((prev) => prev + 1)}
                className="gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                {t("addRow")}
                {extraRows > 0 && <span className="ml-1">({extraRows})</span>}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtraCols((prev) => Math.max(0, prev - 1))}
                disabled={extraCols === 0}
                className="px-2"
                title={`Extra cols: ${extraCols}`}
              >
                −
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtraCols((prev) => prev + 1)}
                className="gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                {t("addColumn")}
                {extraCols > 0 && <span className="ml-1">({extraCols})</span>}
              </Button>
            </div>
          </div>

          {/* Center: Teacher position selector */}
          <ToggleGroup
            type="single"
            value={teacherPosition}
            onValueChange={handleTeacherPositionChange}
            className="shrink-0 gap-1"
          >
            <ToggleGroupItem
              value="left"
              aria-label="Left position"
              size="sm"
            >
              {t("left")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="center"
              aria-label="Center position"
              size="sm"
            >
              {t("center")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="right"
              aria-label="Right position"
              size="sm"
            >
              {t("right")}
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Right: Export and Print Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJPG}
              className="gap-2"
            >
              <DownloadIcon className="h-4 w-4" />
              {t("exportJPG")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              {t("printClassroom")}
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
    </>
  );
}
