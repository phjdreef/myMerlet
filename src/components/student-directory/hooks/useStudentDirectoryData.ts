import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { logger } from "@/utils/logger";
import { sortStudents } from "@/helpers/student_helpers";
import { studentDB, type Student } from "@/services/student-database";
import type { CurriculumPlan } from "@/services/curriculum-database";

interface UseStudentDirectoryDataResult {
  students: Student[];
  filteredStudents: Student[];
  availableClasses: string[];
  selectedClass: string | null;
  visibleCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  classPlans: CurriculumPlan[];
  selectedPlanTab: string;
  onSelectClass: (className: string | null) => void;
  setSelectedPlanTab: (planId: string) => void;
  clearError: () => void;
  refresh: () => void;
}

const AUTO_DISMISS_TIMEOUT = 3000;

export function useStudentDirectoryData(): UseStudentDirectoryDataResult {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [plans, setPlans] = useState<CurriculumPlan[]>([]);
  const [classPlans, setClassPlans] = useState<CurriculumPlan[]>([]);
  const [selectedPlanTab, setSelectedPlanTab] = useState<string>("");

  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimeout = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const setTransientMessage = useCallback(
    (message: string) => {
      clearPendingTimeout();
      setError(message);
      dismissTimeoutRef.current = setTimeout(() => {
        setError(null);
        dismissTimeoutRef.current = null;
      }, AUTO_DISMISS_TIMEOUT);
    },
    [clearPendingTimeout],
  );

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const [savedStudents, metadata] = await Promise.all([
        studentDB.getAllStudents(),
        studentDB.getMetadata(),
      ]);

      if (savedStudents.length > 0) {
        const sortedStudents = sortStudents(savedStudents);
        setStudents(sortedStudents);
        setTotalCount(sortedStudents.length);

        const savedDate = metadata
          ? new Date(metadata.value).toLocaleString()
          : "Unknown";

        setTransientMessage(
          `✅ ${t("successfullyLoadedStudents", {
            count: sortedStudents.length,
            date: savedDate,
          })}`,
        );
      } else {
        setStudents([]);
        setTotalCount(0);
        setTransientMessage(`📂 ${t("noSavedStudentsFound")}`);
      }
    } catch (err) {
      clearPendingTimeout();
      const message =
        t("failedToLoadFromDatabase") +
        ": " +
        (err instanceof Error ? err.message : t("unknownError"));
      setError(message);
      logger.error("Database load error:", err);
    } finally {
      setLoading(false);
    }
  }, [clearPendingTimeout, setTransientMessage, t]);

  const loadPlans = useCallback(async () => {
    try {
      const result = await window.curriculumAPI.getAllPlans();
      if (result.success && result.data) {
        const plansData = result.data as { plans: CurriculumPlan[] };
        setPlans(plansData.plans || []);
      }
    } catch (err) {
      logger.error("Failed to load plans:", err);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadPlans();

    return () => {
      clearPendingTimeout();
    };
  }, [clearPendingTimeout, loadPlans, loadStudents]);

  useEffect(() => {
    const classSet = new Set<string>();
    students.forEach((student) => {
      if (student.klassen && Array.isArray(student.klassen)) {
        student.klassen.forEach((klass) => classSet.add(klass));
      }
    });

    setAvailableClasses(Array.from(classSet).sort());

    const filtered = selectedClass
      ? students.filter((student) => student.klassen?.includes(selectedClass))
      : students;

    setFilteredStudents(sortStudents(filtered));

    const filteredPlans = selectedClass
      ? plans.filter((plan) => plan.classNames.includes(selectedClass))
      : [];
    setClassPlans(filteredPlans);

    if (filteredPlans.length > 0) {
      if (!filteredPlans.find((plan) => plan.id === selectedPlanTab)) {
        setSelectedPlanTab(filteredPlans[0].id);
      }
    } else {
      setSelectedPlanTab("");
    }
  }, [plans, selectedClass, students, selectedPlanTab]);

  const visibleCount = useMemo(
    () => filteredStudents.length,
    [filteredStudents],
  );

  const onSelectClass = useCallback((className: string | null) => {
    setSelectedClass(className);
  }, []);

  const clearError = useCallback(() => {
    clearPendingTimeout();
    setError(null);
  }, [clearPendingTimeout]);

  const refresh = useCallback(() => {
    loadStudents();
    loadPlans();
  }, [loadPlans, loadStudents]);

  return {
    students,
    filteredStudents,
    availableClasses,
    selectedClass,
    visibleCount,
    totalCount,
    loading,
    error,
    classPlans,
    selectedPlanTab,
    onSelectClass,
    setSelectedPlanTab,
    clearError,
    refresh,
  };
}
