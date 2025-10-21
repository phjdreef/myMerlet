import { useTranslation } from "react-i18next";
import type { Student } from "../../services/student-database";

interface ClassFilterProps {
  students: Student[];
  availableClasses: string[];
  selectedClass: string | null;
  onClassSelect: (className: string | null) => void;
}

export function ClassFilter({
  students,
  availableClasses,
  selectedClass,
  onClassSelect,
}: ClassFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="border-border bg-card w-64 border-r p-4">
      <h2 className="mb-4 text-lg font-semibold">Classes</h2>

      <div className="space-y-2">
        {/* All Students Option */}
        <button
          onClick={() => onClassSelect(null)}
          className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
            selectedClass === null
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {t("allClasses")} ({students.length})
        </button>

        {/* Individual Classes */}
        {availableClasses.map((className) => {
          const classStudentCount = students.filter(
            (student) => student.klassen && student.klassen.includes(className),
          ).length;

          return (
            <button
              key={className}
              onClick={() => onClassSelect(className)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedClass === className
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {className} ({classStudentCount})
            </button>
          );
        })}
      </div>
    </div>
  );
}
