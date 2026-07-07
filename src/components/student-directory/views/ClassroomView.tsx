import type { DragEvent } from "react";
import type { Student } from "@/services/student-database";
import { ClassroomGrid, type SeatingPosition } from "../ClassroomGrid";
import type { ClassroomLayoutData } from "@/services/student-database";

interface ClassroomViewProps {
  selectedClass: string | null;
  students: Student[];
  seatingPositions: Map<string, SeatingPosition[]>;
  classroomLayoutData: ClassroomLayoutData;
  onClassroomLayoutDataChange: (
    updater: (previous: ClassroomLayoutData) => ClassroomLayoutData,
  ) => void;
  onDragStart: (event: DragEvent<Element>, student: Student) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<Element>) => void;
  onDrop: (
    event: DragEvent<Element>,
    row: number,
    col: number,
    classroomKey: string,
  ) => void;
}

export function ClassroomView({
  selectedClass,
  students,
  seatingPositions,
  classroomLayoutData,
  onClassroomLayoutDataChange,
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
      classroomLayoutData={classroomLayoutData}
      onClassroomLayoutDataChange={onClassroomLayoutDataChange}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
}
