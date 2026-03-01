import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { studentDB } from "../../services/student-database";
import { TestsManager } from "./TestsManager";

export function TestsOverview() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const editTestId =
    (location.search as { editTestId?: string } | null)?.editTestId ??
    (location.state as { editTestId?: string } | null)?.editTestId;
  const returnClass =
    (location.search as { returnClass?: string } | null)?.returnClass ??
    (location.state as { returnClass?: string } | null)?.returnClass;

  const handleReturnToClass = () => {
    if (!returnClass) return;

    localStorage.setItem("student_directory_selected_class", returnClass);
    localStorage.setItem("student_directory_view_mode", "grades");
    navigate({ to: "/students" });
  };
  const [availableClassGroups, setAvailableClassGroups] = useState<string[]>(
    [],
  );
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      setError(null);

      try {
        const allStudents = await studentDB.getAllStudents();

        const classSet = new Set<string>();
        allStudents.forEach((student) => {
          if (Array.isArray(student.klassen)) {
            student.klassen.forEach((klass) => classSet.add(klass));
          }
        });

        const sortedClasses = Array.from(classSet)
          .filter((value) => value && value.trim().length > 0)
          .sort();
        setAvailableClassGroups(sortedClasses);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("unknownError") || "Error",
        );
      } finally {
        setLoadingStudents(false);
      }
    };

    void loadStudents();
  }, [t]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="border-primary/20 bg-primary/5 text-primary rounded-md border-l-4 px-4 py-3 text-sm">
        {t("gradeEntryMovedInfo")}
      </div>

      {error && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loadingStudents ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {t("loading")}
          </div>
        ) : (
          <TestsManager
            availableClassGroups={availableClassGroups}
            enableSearch
            enableClassFilter
            variant="global"
            editTestId={editTestId}
            onSaveSuccess={
              editTestId && returnClass ? handleReturnToClass : undefined
            }
            onCancelEdit={
              editTestId && returnClass ? handleReturnToClass : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
