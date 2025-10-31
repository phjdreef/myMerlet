import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChartBarIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useSchoolYear } from "../../contexts/SchoolYearContext";
import { normalizeTestRecord } from "../../helpers/tests/normalize-test";
import type {
  Test,
  TestStatistics,
  TestType,
} from "../../services/test-database";
import { Button } from "../ui/button";
import { TestForm } from "./TestForm";
import type { TestFormState } from "./types";

interface TestsManagerProps {
  classGroup?: string | null;
  availableClassGroups: string[];
  onSelectTest?: (test: Test) => void;
  onRequestClassGroupFocus?: (classGroup: string) => void;
  variant?: "class" | "global";
  enableSearch?: boolean;
  enableClassFilter?: boolean;
}

export function TestsManager({
  classGroup,
  availableClassGroups,
  onSelectTest,
  onRequestClassGroupFocus,
  variant = "class",
  enableSearch = false,
  enableClassFilter = false,
}: TestsManagerProps) {
  const { t } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statistics, setStatistics] = useState<Map<string, TestStatistics>>(
    new Map(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("");

  // Form state
  const getInitialFormData = (): TestFormState => ({
    name: "",
    date: "",
    description: "",
    weight: 1,
    testType: "cvte" as TestType,
    // CvTE properties
    nTerm: 1,
    rTerm: 9,
    maxPoints: 10,
    // Composite properties
    elements: [] as TestFormState["elements"],
    customFormula: "", // Custom formula for composite tests
    classGroups: classGroup ? [classGroup] : [],
  });

  const [formData, setFormData] = useState(getInitialFormData);

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      if (variant === "class" && !classGroup) {
        setTests([]);
        setStatistics(new Map());
        return;
      }

      const result =
        variant === "global"
          ? await window.testAPI.getAllTests()
          : await window.testAPI.getTestsForClassGroup(classGroup as string);

      if (result.success && result.data) {
        const testsData = (result.data as Test[]).map(normalizeTestRecord);
        const sortedTests = [...testsData].sort((first, second) => {
          const firstDate = new Date(
            first.date || first.updatedAt || first.createdAt || 0,
          ).getTime();
          const secondDate = new Date(
            second.date || second.updatedAt || second.createdAt || 0,
          ).getTime();
          return secondDate - firstDate;
        });

        setTests(sortedTests);

        // Load statistics for each test
        const statsMap = new Map<string, TestStatistics>();
        for (const test of sortedTests) {
          const statsResult = await window.testAPI.getTestStatistics(test.id);
          if (statsResult.success && statsResult.data) {
            statsMap.set(test.id, statsResult.data as TestStatistics);
          }
        }
        setStatistics(statsMap);
      }
    } catch (error) {
      console.error("Failed to load tests:", error);
    } finally {
      setLoading(false);
    }
  }, [classGroup, variant]);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const sanitizedClassGroups = Array.from(
        new Set(
          formData.classGroups
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      );

      if (sanitizedClassGroups.length === 0) {
        setFormError(t("selectAtLeastOneClass"));
        return;
      }

      setFormError(null);

      const primaryGroup = sanitizedClassGroups[0] ?? "";
      const includesCurrentGroup = classGroup
        ? sanitizedClassGroups.includes(classGroup)
        : false;

      const payload = {
        ...formData,
        classGroups: sanitizedClassGroups,
        schoolYear: currentSchoolYear,
      };

      if (editingTest) {
        // Update existing test
        const result = await window.testAPI.updateTest(editingTest.id, payload);
        if (result.success) {
          await loadTests();
          resetForm();
          if (!includesCurrentGroup && primaryGroup) {
            onRequestClassGroupFocus?.(primaryGroup);
          }
        }
      } else {
        // Create new test
        const result = await window.testAPI.createTest({
          ...payload,
        });
        if (result.success) {
          await loadTests();
          resetForm();
          if (!includesCurrentGroup && primaryGroup) {
            onRequestClassGroupFocus?.(primaryGroup);
          }
        }
      }
    } catch (error) {
      console.error("Failed to save test:", error);
    }
  };

  const handleEdit = (test: Test) => {
    const normalizedTest = normalizeTestRecord(test);
    setEditingTest(normalizedTest);
    setIsCreating(true);
    setFormError(null);
    setFormData({
      name: normalizedTest.name,
      date: normalizedTest.date,
      description: normalizedTest.description,
      weight: normalizedTest.weight,
      testType: normalizedTest.testType,
      nTerm: normalizedTest.nTerm || 1,
      rTerm: normalizedTest.rTerm || 9,
      maxPoints: normalizedTest.maxPoints || 10,
      elements: normalizedTest.elements || [],
      customFormula: normalizedTest.customFormula || "",
      classGroups: normalizedTest.classGroups,
    });
  };

  const handleDelete = async (testId: string) => {
    if (!confirm(t("confirmDeleteTest"))) return;

    try {
      const result = await window.testAPI.deleteTest(testId);
      if (result.success) {
        await loadTests();
      }
    } catch (error) {
      console.error("Failed to delete test:", error);
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setEditingTest(null);
    setIsCreating(false);
    setFormError(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const startCreating = () => {
    setEditingTest(null);
    setFormData(getInitialFormData());
    setFormError(null);
    setIsCreating(true);
  };

  const toggleClassSelection = (
    rawValue: string,
    explicitChecked?: boolean,
  ) => {
    setFormError(null);
    const value = rawValue.trim();

    setFormData((previous) => {
      const alreadySelected = previous.classGroups.includes(value);
      const shouldSelect =
        explicitChecked !== undefined ? explicitChecked : !alreadySelected;

      const nextClassGroups = shouldSelect
        ? Array.from(new Set([...previous.classGroups, value]))
        : previous.classGroups.filter((entry) => entry !== value);

      return { ...previous, classGroups: nextClassGroups };
    });
  };

  const classOptions = Array.from(
    new Set([
      ...availableClassGroups,
      ...tests.flatMap((test) => test.classGroups ?? []),
      ...formData.classGroups,
    ]),
  )
    .filter((value) => value && value.trim().length > 0)
    .sort((a, b) => a.localeCompare(b));

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const matchesClass = !enableClassFilter
        ? true
        : selectedClassFilter === ""
          ? true
          : (test.classGroups ?? []).includes(selectedClassFilter);

      if (!enableSearch || normalizedSearch.length === 0) {
        return matchesClass;
      }

      const searchTargets = [
        test.name ?? "",
        test.description ?? "",
        ...(test.classGroups ?? []),
      ];

      const matchesSearch = searchTargets.some((target) =>
        target.toLowerCase().includes(normalizedSearch),
      );

      return matchesClass && matchesSearch;
    });
  }, [
    tests,
    enableClassFilter,
    selectedClassFilter,
    enableSearch,
    normalizedSearch,
  ]);

  if (loading) {
    return <div className="p-4">{t("loading")}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("tests")}</h2>
        {!isCreating && (
          <Button onClick={startCreating} size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("newTest")}
          </Button>
        )}
      </div>

      {(enableSearch || enableClassFilter) && (
        <div className="flex flex-wrap items-center gap-3">
          {enableSearch && (
            <input
              className="w-full max-w-xs rounded border px-3 py-2 text-sm"
              placeholder={t("searchTests") ?? ""}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              type="search"
            />
          )}
          {enableClassFilter && (
            <div className="flex items-center gap-2 text-sm">
              <label className="font-medium" htmlFor="tests-class-filter">
                {t("filterByClass")}
              </label>
              <select
                id="tests-class-filter"
                className="rounded border px-2 py-2 text-sm"
                value={selectedClassFilter}
                onChange={(event) => setSelectedClassFilter(event.target.value)}
              >
                <option value="">{t("allClasses")}</option>
                {classOptions.map((classLabel) => (
                  <option key={`filter-${classLabel}`} value={classLabel}>
                    {classLabel}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Form */}
      {isCreating && (
        <TestForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          classOptions={classOptions}
          onToggleClass={toggleClassSelection}
          formError={formError}
          isEditing={Boolean(editingTest)}
        />
      )}

      {/* Tests List */}
      <div className="space-y-2">
        {filteredTests.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border p-8 text-center">
            {tests.length === 0 ? t("noTestsYet") : t("noTestsMatch")}
          </div>
        ) : (
          filteredTests.map((test) => {
            const stats = statistics.get(test.id);
            return (
              <div
                key={test.id}
                className="hover:bg-accent/50 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{test.name}</h3>
                      <span className="text-muted-foreground text-sm">
                        {formatDate(test.date)}
                      </span>
                      <span className="bg-primary/10 rounded px-2 py-0.5 text-xs">
                        {t("weight")}: {test.weight}x
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          test.testType === "cvte"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {test.testType === "cvte"
                          ? t("cvteTest")
                          : t("compositeTest")}
                      </span>
                    </div>
                    {test.description && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {test.description}
                      </p>
                    )}

                    {test.classGroups && test.classGroups.length > 0 && (
                      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium">
                          {t("testClassesLabel")}:
                        </span>
                        {test.classGroups.map((classLabel) => (
                          <span
                            key={`${test.id}-${classLabel}`}
                            className="bg-muted rounded px-2 py-0.5"
                          >
                            {classLabel}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* CvTE Test Details */}
                    {test.testType === "cvte" && (
                      <div className="text-muted-foreground mt-2 flex gap-4 text-xs">
                        <span>
                          {t("maxPoints")}: {test.maxPoints}
                        </span>
                        <span>n = {test.nTerm}</span>
                        <span>R = {test.rTerm}</span>
                      </div>
                    )}

                    {/* Composite Test Details */}
                    {test.testType === "composite" && test.elements && (
                      <div className="mt-2 space-y-1">
                        <div className="text-muted-foreground text-xs font-medium">
                          {t("elements")}:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {test.elements.map((element) => (
                            <span
                              key={element.id}
                              className="bg-muted rounded px-2 py-1 text-xs"
                            >
                              {element.name} ({element.maxPoints}p,{" "}
                              {(element.weight * 100).toFixed(0)}%)
                            </span>
                          ))}
                        </div>
                        {test.customFormula &&
                          test.customFormula.trim() !== "" && (
                            <div className="text-muted-foreground mt-1 font-mono text-xs">
                              {t("formula")}: {test.customFormula}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Statistics */}
                    {stats && stats.totalGraded > 0 && (
                      <div className="bg-muted/50 mt-3 flex gap-4 rounded p-2 text-xs">
                        <span className="flex items-center gap-1">
                          <ChartBarIcon className="h-3 w-3" />
                          {t("average")}: {stats.average.toFixed(1)}
                        </span>
                        <span>
                          {t("highest")}: {stats.highest.toFixed(1)}
                        </span>
                        <span>
                          {t("lowest")}: {stats.lowest.toFixed(1)}
                        </span>
                        <span className="text-green-600">
                          ≥5.5: {stats.aboveThreshold}
                        </span>
                        <span className="text-red-600">
                          &lt;5.5: {stats.underThreshold}
                        </span>
                        <span>
                          {t("total")}: {stats.totalGraded}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {onSelectTest && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectTest(test)}
                      >
                        {t("enterGrades")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(test)}
                    >
                      <PencilSimpleIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(test.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
