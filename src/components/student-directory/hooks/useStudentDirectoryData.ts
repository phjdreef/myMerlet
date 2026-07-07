import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { logger } from "@/utils/logger";
import { sortStudents } from "@/helpers/student_helpers";
import { studentDB, type Student } from "@/services/student-database";
import type { CurriculumPlan } from "@/services/curriculum-database";

interface UseStudentDirectoryDataResult {
  students: Student[];
  filteredStudents: Student[];
  allClasses: string[];
  availableClasses: string[];
  inactiveClasses: string[];
  selectedClass: string | null;
  visibleCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  classPlans: CurriculumPlan[];
  selectedPlanTab: string;
  onSelectClass: (className: string | null) => void;
  setClassActive: (className: string, isActive: boolean) => void;
  setClassOrder: (classNames: string[]) => void;
  setSelectedPlanTab: (planId: string) => void;
  clearError: () => void;
  refresh: () => void;
}

export function useStudentDirectoryData(): UseStudentDirectoryDataResult {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [inactiveClasses, setInactiveClasses] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("student_directory_inactive_classes");
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
    } catch {
      return [];
    }
  });
  const [classOrder, setClassOrderState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("student_directory_class_order");
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
    } catch {
      return [];
    }
  });

  // Load selected class from localStorage on mount
  const [selectedClass, setSelectedClass] = useState<string | null>(() => {
    const saved = localStorage.getItem("student_directory_selected_class");
    return saved || null;
  });

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

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const savedStudents = await studentDB.getAllStudents();

      if (savedStudents.length > 0) {
        const sortedStudents = sortStudents(savedStudents);
        setStudents(sortedStudents);
        setTotalCount(sortedStudents.length);
      } else {
        setStudents([]);
        setTotalCount(0);
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
  }, [clearPendingTimeout, t]);

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
    const studentMatchesClass = (student: Student, className: string) => {
      const inClasses =
        Array.isArray(student.klassen) && student.klassen.includes(className);
      const inGroups =
        Array.isArray(student.lesgroepen) &&
        student.lesgroepen.includes(className);
      return inClasses || inGroups;
    };

    const classSet = new Set<string>();
    students.forEach((student) => {
      if (student.klassen && Array.isArray(student.klassen)) {
        student.klassen.forEach((klass) => classSet.add(klass));
      }
      if (student.lesgroepen && Array.isArray(student.lesgroepen)) {
        student.lesgroepen.forEach((groep) => classSet.add(groep));
      }
    });

    const alphabeticalClasses = Array.from(classSet).sort();
    const classSetLookup = new Set(alphabeticalClasses);
    const orderedFromPreferences = classOrder.filter((className) =>
      classSetLookup.has(className),
    );
    const remainingClasses = alphabeticalClasses.filter(
      (className) => !orderedFromPreferences.includes(className),
    );
    const sortedAllClasses = [...orderedFromPreferences, ...remainingClasses];

    if (orderedFromPreferences.length !== classOrder.length) {
      localStorage.setItem(
        "student_directory_class_order",
        JSON.stringify(orderedFromPreferences),
      );
      setClassOrderState(orderedFromPreferences);
    }
    const inactiveSet = new Set(inactiveClasses);
    const visibleClasses = sortedAllClasses.filter(
      (className) => !inactiveSet.has(className),
    );

    setAllClasses(sortedAllClasses);
    setAvailableClasses(visibleClasses);

    if (selectedClass && inactiveSet.has(selectedClass)) {
      setSelectedClass(null);
      localStorage.removeItem("student_directory_selected_class");
    }

    const filtered =
      selectedClass && !inactiveSet.has(selectedClass)
        ? students.filter((student) =>
            studentMatchesClass(student, selectedClass),
          )
        : students;

    setFilteredStudents(sortStudents(filtered));

    const filteredPlans =
      selectedClass && !inactiveSet.has(selectedClass)
        ? plans.filter(
            (plan) =>
              plan.classNames.includes(selectedClass) &&
              plan.isTemplate === false &&
              plan.classNames.length === 1,
          )
        : [];
    setClassPlans(filteredPlans);

    if (filteredPlans.length > 0) {
      if (!filteredPlans.find((plan) => plan.id === selectedPlanTab)) {
        setSelectedPlanTab(filteredPlans[0].id);
      }
    } else {
      setSelectedPlanTab("");
    }
  }, [
    classOrder,
    inactiveClasses,
    plans,
    selectedClass,
    students,
    selectedPlanTab,
  ]);

  const visibleCount = useMemo(
    () => filteredStudents.length,
    [filteredStudents],
  );

  const onSelectClass = useCallback((className: string | null) => {
    setSelectedClass(className);
    // Save to localStorage
    if (className) {
      localStorage.setItem("student_directory_selected_class", className);
    } else {
      localStorage.removeItem("student_directory_selected_class");
    }
  }, []);

  const setClassActive = useCallback((className: string, isActive: boolean) => {
    setInactiveClasses((previous) => {
      const nextSet = new Set(previous);
      if (isActive) {
        nextSet.delete(className);
      } else {
        nextSet.add(className);
      }

      const next = Array.from(nextSet).sort();
      localStorage.setItem(
        "student_directory_inactive_classes",
        JSON.stringify(next),
      );
      return next;
    });
  }, []);

  const setClassOrder = useCallback((classNames: string[]) => {
    const next = Array.from(new Set(classNames));
    localStorage.setItem("student_directory_class_order", JSON.stringify(next));
    setClassOrderState(next);
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
    allClasses,
    availableClasses,
    inactiveClasses,
    selectedClass,
    visibleCount,
    totalCount,
    loading,
    error,
    classPlans,
    selectedPlanTab,
    onSelectClass,
    setClassActive,
    setClassOrder,
    setSelectedPlanTab,
    clearError,
    refresh,
  };
}
