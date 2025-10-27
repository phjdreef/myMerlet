import { useTranslation } from "react-i18next";
import type { Student } from "@/services/student-database";
import { ClassGradesTab } from "../ClassGradesTab";

interface GradesViewProps {
  selectedClass: string | null;
  students: Student[];
}

export function GradesView({ selectedClass, students }: GradesViewProps) {
  const { t } = useTranslation();

  if (!selectedClass) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">{t("selectClassLabel")}</p>
      </div>
    );
  }

  return <ClassGradesTab selectedClass={selectedClass} students={students} />;
}
