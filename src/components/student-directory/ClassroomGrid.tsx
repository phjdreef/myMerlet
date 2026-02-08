import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { domToJpeg } from "modern-screenshot";
import {
  UsersThreeIcon,
  ChalkboardTeacherIcon,
  PlusIcon,
  PrinterIcon,
  DownloadIcon,
  XIcon,
  PencilIcon,
  CheckIcon,
  BuildingsIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { Student } from "@/services/student-database";
import { StudentPhoto } from "./StudentPhoto";
import { formatStudentName } from "@/helpers/student_helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TeacherPosition = "left" | "center" | "right";

interface Classroom {
  id: string;
  name: string;
}

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
  onDrop: (
    e: React.DragEvent,
    row: number,
    col: number,
    classroomKey: string,
  ) => void;
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

  // Classroom management
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => {
    if (!selectedClass) return [{ id: "default", name: "Lokaal 1" }];
    const saved = localStorage.getItem(`classrooms_${selectedClass}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old format (string array) to new format (object array)
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          typeof parsed[0] === "string"
        ) {
          return parsed.map((name: string, index: number) => ({
            id: `migrated_${index}_${Date.now()}`,
            name,
          }));
        }
        return parsed;
      } catch {
        return [{ id: "default", name: "Lokaal 1" }];
      }
    }
    return [{ id: "default", name: "Lokaal 1" }];
  });

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(() => {
    if (!selectedClass) return "default";
    const saved = localStorage.getItem(`selected_classroom_${selectedClass}`);
    // Try to find matching classroom by ID or by name (for migration)
    if (saved) {
      const classroom = classrooms.find(
        (c) => c.id === saved || c.name === saved,
      );
      return classroom?.id || classrooms[0]?.id || "default";
    }
    return classrooms[0]?.id || "default";
  });

  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(
    null,
  );
  const [editingName, setEditingName] = useState("");
  const [showClassroomSelector, setShowClassroomSelector] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      // Find the export area
      const exportArea = document.getElementById("classroom-export-area");
      if (!exportArea) {
        console.error("Export area not found");
        setExportMode(false);
        return;
      }

      // Use modern-screenshot to convert to data URL
      const dataUrl = await domToJpeg(exportArea, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        scale: 2,
      });

      // Download the image
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `klasindeling-${selectedClass}-${new Date().toISOString().split("T")[0]}.jpg`;
      link.click();

      setExportMode(false);
    } catch (error) {
      console.error("Failed to export:", error);
      setExportMode(false);
    }
  };

  // Load classrooms when class changes
  useEffect(() => {
    if (selectedClass) {
      const saved = localStorage.getItem(`classrooms_${selectedClass}`);
      let loadedClassrooms: Classroom[];

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migrate old format (string array) to new format
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            typeof parsed[0] === "string"
          ) {
            loadedClassrooms = parsed.map((name: string, index: number) => ({
              id: `migrated_${index}_${Date.now()}`,
              name,
            }));
            // Save migrated format
            localStorage.setItem(
              `classrooms_${selectedClass}`,
              JSON.stringify(loadedClassrooms),
            );
          } else {
            loadedClassrooms = parsed;
          }
        } catch {
          loadedClassrooms = [{ id: "default", name: "Lokaal 1" }];
        }
      } else {
        loadedClassrooms = [{ id: "default", name: "Lokaal 1" }];
      }

      setClassrooms(loadedClassrooms);

      const savedSelectedId = localStorage.getItem(
        `selected_classroom_${selectedClass}`,
      );
      // Try to find by ID first, fallback to name for migration
      const classroom = loadedClassrooms.find(
        (c) => c.id === savedSelectedId || c.name === savedSelectedId,
      );
      const selectedId = classroom?.id || loadedClassrooms[0]?.id;
      setSelectedClassroomId(selectedId);

      // Save the ID if we migrated from name
      if (selectedId && savedSelectedId !== selectedId) {
        localStorage.setItem(`selected_classroom_${selectedClass}`, selectedId);
      }
    }
  }, [selectedClass]);

  // Save classrooms to localStorage
  const saveClassrooms = (newClassrooms: Classroom[]) => {
    if (selectedClass) {
      localStorage.setItem(
        `classrooms_${selectedClass}`,
        JSON.stringify(newClassrooms),
      );
      setClassrooms(newClassrooms);
    }
  };

  // Add new classroom
  const handleAddClassroom = () => {
    const newId = `classroom_${Date.now()}`;
    const newName = `Lokaal ${classrooms.length + 1}`;
    const updated = [...classrooms, { id: newId, name: newName }];
    saveClassrooms(updated);
    setSelectedClassroomId(newId);
    if (selectedClass) {
      localStorage.setItem(`selected_classroom_${selectedClass}`, newId);
    }
  };

  // Delete classroom
  const handleDeleteClassroom = (classroomId: string) => {
    if (classrooms.length <= 1) return; // Don't delete last classroom

    const classroom = classrooms.find((c) => c.id === classroomId);
    if (!classroom) return;

    if (!confirm(`${t("delete")} "${classroom.name}"?`)) return;

    const updated = classrooms.filter((c) => c.id !== classroomId);
    saveClassrooms(updated);

    if (selectedClassroomId === classroomId) {
      const newSelectedId = updated[0]?.id;
      setSelectedClassroomId(newSelectedId);
      if (selectedClass && newSelectedId) {
        localStorage.setItem(
          `selected_classroom_${selectedClass}`,
          newSelectedId,
        );
      }
    }
  };

  // Rename classroom - now only changes the name, ID stays the same!
  const handleRenameClassroom = (classroomId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingClassroomId(null);
      return;
    }

    const updated = classrooms.map((c) =>
      c.id === classroomId ? { ...c, name: newName } : c,
    );
    saveClassrooms(updated);
    setEditingClassroomId(null);
  };

  // Change selected classroom
  const handleSelectClassroom = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    if (selectedClass) {
      localStorage.setItem(`selected_classroom_${selectedClass}`, classroomId);
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

  // Get classroom-specific key for storage
  const getClassroomKey = (className: string) => {
    return `${className}::${selectedClassroomId}`;
  };

  const getStudentAtPosition = (
    row: number,
    col: number,
    className: string,
  ): Student | null => {
    if (!className) return null;
    const key = getClassroomKey(className);
    const classPositions = seatingPositions.get(key);
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
    const key = getClassroomKey(className);
    const classPositions = seatingPositions.get(key) || [];

    // If no students positioned, show at least 1 row, or 2 when dragging
    if (classPositions.length === 0) {
      return isDragging ? 2 : 1;
    }

    // Find the highest row number that has a student (0-indexed)
    const maxRow = Math.max(...classPositions.map((pos) => pos.row));

    // Total rows = positions needed + 1 extra row when dragging
    return maxRow + 1 + (isDragging ? 1 : 0) + extraRows;
  };

  // Calculate the number of columns needed
  const getRequiredCols = (className: string): number => {
    const key = getClassroomKey(className);
    const classPositions = seatingPositions.get(key) || [];

    // If no students positioned, show at least 1 column, or 2 when dragging
    if (classPositions.length === 0) {
      return isDragging ? 2 : 1;
    }

    // Find the highest column number that has a student (0-indexed)
    const maxCol = Math.max(...classPositions.map((pos) => pos.col));

    // Total cols = positions needed + 1 extra column when dragging
    return maxCol + 1 + (isDragging ? 1 : 0) + extraCols;
  };

  const requiredRows = getRequiredRows(selectedClass);
  const requiredCols = getRequiredCols(selectedClass);

  const getUnpositionedStudents = (className: string): Student[] => {
    if (!className) return [];
    const classStudents = students.filter(
      (student) => student.klassen && student.klassen.includes(className),
    );
    const key = getClassroomKey(className);
    const classPositions = seatingPositions.get(key) || [];
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
        {/* Classroom Tabs - Simple tabs without edit mode */}
        {!printMode && !exportMode && selectedClass && (
          <div className="no-print flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">
              {t("classroom")}:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {classrooms.map((classroom) => (
                <Button
                  key={classroom.id}
                  variant={
                    selectedClassroomId === classroom.id ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleSelectClassroom(classroom.id)}
                >
                  {classroom.name}
                </Button>
              ))}
            </div>
          </div>
        )}

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
                    setIsDragging(true);
                    onDragStart(e, student);
                  }}
                  onDragEnd={() => {
                    setDraggedStudentId(null);
                    setIsDragging(false);
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
                        const classroomKey = getClassroomKey(selectedClass);
                        onDrop(e, row, col, classroomKey);
                        // Reset drag state and extra columns/rows after drop
                        setIsDragging(false);
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
                            setIsDragging(true);
                            onDragStart(e, student);
                          }}
                          onDragEnd={() => {
                            // Reset immediately
                            setDraggedStudentId(null);
                            setIsDragging(false);
                            onDragEnd();
                          }}
                          title={t("dragToMove")}
                        >
                          <div className="flex w-full flex-1 items-center justify-center">
                            <StudentPhoto student={student} size="large" />
                          </div>
                          <span className="mt-0.5 w-full truncate px-0.5 text-center text-[10px] leading-tight font-medium">
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
            <div className="bg-primary/10 text-primary border-primary/30 flex items-center gap-2 rounded-lg border px-4 py-2 font-medium shadow-sm">
              <ChalkboardTeacherIcon className="h-5 w-5" weight="fill" />
              <span>{t("teacher")}</span>
            </div>
          </div>

          {/* Controls for adding rows and columns - sticky at bottom */}
          {!printMode && !exportMode && (
            <div className="border-border bg-card/80 no-print sticky bottom-0 z-20 -mx-4 mt-6 -mb-4 border-t shadow-lg backdrop-blur-sm">
              {/* Classroom Selector - Collapsible with edit functionality */}
              {showClassroomSelector && (
                <div className="border-border flex items-center gap-2 border-b p-4">
                  <span className="text-muted-foreground text-sm font-medium">
                    {t("manageClassrooms")}:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {classrooms.map((classroom) => (
                      <div
                        key={classroom.id}
                        className="flex items-center gap-1"
                      >
                        {editingClassroomId === classroom.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleRenameClassroom(
                                    classroom.id,
                                    editingName,
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingClassroomId(null);
                                }
                              }}
                              className="h-8 w-32"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRenameClassroom(classroom.id, editingName)
                              }
                              className="h-8 w-8 p-0"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingClassroomId(null)}
                              className="h-8 w-8 p-0"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant={
                                selectedClassroomId === classroom.id
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleSelectClassroom(classroom.id)
                              }
                              className="h-8"
                            >
                              {classroom.name}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingClassroomId(classroom.id);
                                setEditingName(classroom.name);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            {classrooms.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteClassroom(classroom.id)
                                }
                                className="h-8 w-8 p-0"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddClassroom}
                      className="gap-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      {t("addClassroom")}
                    </Button>
                  </div>

                  {/* Teacher Position Selector */}
                  <div className="border-border flex items-center gap-2 border-l pl-4">
                    <label className="text-muted-foreground text-sm font-medium">
                      {t("classroomFront")}:
                    </label>
                    <Select
                      value={teacherPosition}
                      onValueChange={handleTeacherPositionChange}
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">{t("left")}</SelectItem>
                        <SelectItem value="center">{t("center")}</SelectItem>
                        <SelectItem value="right">{t("right")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Main Controls */}
              <div className="flex items-center justify-between gap-4 p-4">
                {/* Left: Classroom Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={showClassroomSelector ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setShowClassroomSelector(!showClassroomSelector)
                    }
                    className="gap-2"
                    title={t("manageClassrooms")}
                  >
                    <BuildingsIcon className="h-4 w-4" />
                    {t("indeling")}
                  </Button>
                </div>

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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
