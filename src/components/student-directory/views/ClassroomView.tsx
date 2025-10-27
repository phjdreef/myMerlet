import type { DragEvent } from "react";
import type { Student } from "@/services/student-database";
import { ClassroomGrid, type SeatingPosition } from "../ClassroomGrid";

interface ClassroomViewProps {
  selectedClass: string | null;
  students: Student[];
  seatingPositions: Map<string, SeatingPosition[]>;
  onDragStart: (event: DragEvent<Element>, student: Student) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<Element>) => void;
  onDrop: (event: DragEvent<Element>, row: number, col: number) => void;
}

export function ClassroomView({
  selectedClass,
  students,
  seatingPositions,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ClassroomViewProps) {
  return (
    <ClassroomGrid
      selectedClass={selectedClass}
      students={students}
      seatingPositions={seatingPositions}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
}
