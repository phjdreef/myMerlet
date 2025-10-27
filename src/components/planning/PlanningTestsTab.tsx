import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TestsManager } from "../tests/TestsManager";
import { studentDB, type Student } from "../../services/student-database";

interface PlanningTestsTabProps {
  showHeader?: boolean;
}

export function PlanningTestsTab({ showHeader = true }: PlanningTestsTabProps) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [availableClassGroups, setAvailableClassGroups] = useState<string[]>(
    [],
  );
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      setError(null);
      try {
        const allStudents = await studentDB.getAllStudents();
        setStudents(allStudents);
        const classSet = new Set<string>();
        allStudents.forEach((student) => {
          if (Array.isArray(student.klassen)) {
            student.klassen.forEach((klass) => classSet.add(klass));
          }
        });
        const sortedClasses = Array.from(classSet).sort();
        setAvailableClassGroups(sortedClasses);
        if (sortedClasses.length > 0) {
          setSelectedClassGroup((current) => current || sortedClasses[0]);
        }
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

  const filteredStudents = useMemo(() => {
    if (!selectedClassGroup) return [];
    return students.filter(
      (student) =>
        Array.isArray(student.klassen) &&
        student.klassen.includes(selectedClassGroup),
    );
  }, [students, selectedClassGroup]);

  return (
    <div className="flex h-full flex-col gap-4">
      {showHeader && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{t("tests")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("testsTabDescription")}
            </p>
          </div>
        </div>
      )}

      <div className="border-primary/20 bg-primary/5 text-primary rounded-md border-l-4 px-4 py-3 text-sm">
        {t("gradeEntryMovedInfo")}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="planning-tests-class" className="text-sm font-medium">
          {t("selectClassLabel")}
        </label>
        <select
          id="planning-tests-class"
          className="w-56 rounded border px-3 py-2 text-sm"
          value={selectedClassGroup}
          onChange={(event) => setSelectedClassGroup(event.target.value)}
          disabled={loadingStudents || availableClassGroups.length === 0}
        >
          {availableClassGroups.length === 0 ? (
            <option value="">{t("noClassesFound")}</option>
          ) : (
            availableClassGroups.map((classGroupName) => (
              <option key={classGroupName} value={classGroupName}>
                {classGroupName}
              </option>
            ))
          )}
        </select>
        {selectedClassGroup && (
          <span className="text-muted-foreground text-xs">
            {t("studentsInClass", { count: filteredStudents.length })}
          </span>
        )}
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
        ) : availableClassGroups.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
            {t("noClassesFound")}
          </div>
        ) : !selectedClassGroup ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
            {t("selectClassForTests")}
          </div>
        ) : (
          <TestsManager
            classGroup={selectedClassGroup}
            availableClassGroups={availableClassGroups}
            onRequestClassGroupFocus={(targetGroup) =>
              setSelectedClassGroup(targetGroup)
            }
          />
        )}
      </div>
    </div>
  );
}
