import type { Student } from "@/services/student-database";
import { StudentTableView } from "../StudentTableView";

interface StudentListViewProps {
  students: Student[];
  selectedClass: string | null;
  loading: boolean;
  totalStudents: number;
  onStudentActiveChange?: (studentId: number, isActive: boolean) => void;
}

export function StudentListView({
  students,
  selectedClass,
  loading,
  totalStudents,
  onStudentActiveChange,
}: StudentListViewProps) {
  return (
    <StudentTableView
      students={students}
      selectedClass={selectedClass}
      loading={loading}
      totalStudents={totalStudents}
      onStudentActiveChange={onStudentActiveChange}
    />
  );
}
