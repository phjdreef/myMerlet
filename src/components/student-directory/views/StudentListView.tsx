import { useTranslation } from "react-i18next";
import type { Student } from "@/services/student-database";
import { StudentCard } from "../StudentCard";

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
  const { t } = useTranslation();

  if (students.length > 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {students.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            selectedClass={selectedClass}
          />
        ))}
      </div>
    );
  }

  if (!loading && students.length === 0 && totalStudents > 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          {t("noStudentsFoundForClass")}
          {selectedClass ? ` "${selectedClass}".` : "."}
        </p>
      </div>
    );
  }

  if (!loading && totalStudents === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          {t("noStudentsLoadedClickToStart")}
        </p>
      </div>
    );
  }

  return null;
}
