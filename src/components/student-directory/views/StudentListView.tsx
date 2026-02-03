import { useTranslation } from "react-i18next";
import type { Student } from "@/services/student-database";
import { StudentTableView } from "../StudentTableView";

interface StudentListViewProps {
  students: Student[];
  selectedClass: string | null;
  loading: boolean;
  totalStudents: number;
}

export function StudentListView({
  students,
  selectedClass,
  loading,
  totalStudents,
}: StudentListViewProps) {
  return (
    <StudentTableView
      students={students}
      selectedClass={selectedClass}
      loading={loading}
      totalStudents={totalStudents}
    />
  );
}
