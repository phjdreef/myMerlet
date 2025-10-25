import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type {
  Test,
  TestStatistics,
  TestType,
  CompositeElement,
} from "../../services/test-database";
import { Button } from "../ui/button";
import {
  TrashIcon,
  PencilSimpleIcon,
  PlusIcon,
  ChartBarIcon,
  XIcon,
} from "@phosphor-icons/react";
import { normalizeTestRecord } from "../../helpers/tests/normalize-test";

interface TestsManagerProps {
  classGroup: string;
  availableClassGroups: string[];
  onSelectTest?: (test: Test) => void;
  onRequestClassGroupFocus?: (classGroup: string) => void;
}

export function TestsManager({
  classGroup,
  availableClassGroups,
  onSelectTest,
  onRequestClassGroupFocus,
}: TestsManagerProps) {
  const { t } = useTranslation();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statistics, setStatistics] = useState<Map<string, TestStatistics>>(
    new Map(),
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const getInitialFormData = () => ({
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
    elements: [] as CompositeElement[],
    customFormula: "", // Custom formula for composite tests
    classGroups: classGroup ? [classGroup] : [],
  });

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classGroup]);

  const loadTests = async () => {
    setLoading(true);
    try {
      const result = await window.testAPI.getTestsForClassGroup(classGroup);
      if (result.success && result.data) {
        const testsData = (result.data as Test[]).map(normalizeTestRecord);
        setTests(testsData);

        // Load statistics for each test
        const statsMap = new Map<string, TestStatistics>();
        for (const test of testsData) {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const includesCurrentGroup = sanitizedClassGroups.includes(classGroup);

      const payload = {
        ...formData,
        classGroups: sanitizedClassGroups,
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

      {/* Create/Edit Form */}
      {isCreating && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border p-4"
        >
          <h3 className="font-medium">
            {editingTest ? t("editTest") : t("newTest")}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">
                {t("testName")}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">
                {t("testClassesLabel")}
              </label>
              <p className="text-muted-foreground mb-2 text-xs">
                {t("testClassesHelper")}
              </p>
              <div className="flex flex-wrap gap-2">
                {classOptions.map((classOption) => {
                  const checked = formData.classGroups.includes(classOption);
                  return (
                    <label
                      key={classOption}
                      className={`border-border flex items-center gap-2 rounded border px-3 py-1 text-xs font-medium transition-colors ${
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          toggleClassSelection(
                            classOption,
                            event.target.checked,
                          )
                        }
                        className="h-3 w-3"
                      />
                      <span>{classOption}</span>
                    </label>
                  );
                })}
              </div>
              {formError && (
                <p className="text-destructive mt-2 text-xs">{formError}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("testDate")}
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("weight")}
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: parseInt(e.target.value) })
                }
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>

            {/* Test Type Selection */}
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">
                {t("testType")}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="testType"
                    value="cvte"
                    checked={formData.testType === "cvte"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        testType: e.target.value as TestType,
                      })
                    }
                  />
                  <span>{t("cvteTest")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="testType"
                    value="composite"
                    checked={formData.testType === "composite"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        testType: e.target.value as TestType,
                      })
                    }
                  />
                  <span>{t("compositeTest")}</span>
                </label>
              </div>
            </div>

            {/* CvTE Test Fields */}
            {formData.testType === "cvte" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("maxPoints")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxPoints}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxPoints: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded border px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("nTerm")} (n)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.nTerm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nTerm: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded border px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("rTerm")} (R)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.rTerm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rTerm: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded border px-3 py-2"
                    required
                  />
                </div>
              </>
            )}

            {/* Composite Test Fields */}
            {formData.testType === "composite" && (
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {t("compositeElements")}
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newElement: CompositeElement = {
                        id: `${Date.now()}`,
                        name: "",
                        maxPoints: 10,
                        weight: 1,
                        order: formData.elements.length,
                      };
                      setFormData({
                        ...formData,
                        elements: [...formData.elements, newElement],
                      });
                    }}
                  >
                    <PlusIcon className="mr-1 h-3 w-3" />
                    {t("addElement")}
                  </Button>
                </div>

                {formData.elements.length === 0 ? (
                  <div className="text-muted-foreground rounded border p-4 text-center text-sm">
                    {t("noElementsYet")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.elements.map((element, index) => (
                      <div
                        key={element.id}
                        className="grid grid-cols-12 gap-2 rounded border p-2"
                      >
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder={t("elementName")}
                            value={element.name}
                            onChange={(e) => {
                              const newElements = [...formData.elements];
                              newElements[index].name = e.target.value;
                              setFormData({
                                ...formData,
                                elements: newElements,
                              });
                            }}
                            className="w-full rounded border px-2 py-1 text-sm"
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder={t("maxPoints")}
                            min="1"
                            value={element.maxPoints}
                            onChange={(e) => {
                              const newElements = [...formData.elements];
                              newElements[index].maxPoints = parseInt(
                                e.target.value,
                              );
                              setFormData({
                                ...formData,
                                elements: newElements,
                              });
                            }}
                            className="w-full rounded border px-2 py-1 text-sm"
                            required
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            placeholder={t("weight")}
                            step="0.1"
                            min="0.1"
                            value={element.weight}
                            onChange={(e) => {
                              const newElements = [...formData.elements];
                              newElements[index].weight = parseFloat(
                                e.target.value,
                              );
                              setFormData({
                                ...formData,
                                elements: newElements,
                              });
                            }}
                            className="w-full rounded border px-2 py-1 text-sm"
                            required
                          />
                        </div>
                        <div className="col-span-1 flex items-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const newElements = formData.elements.filter(
                                (_, i) => i !== index,
                              );
                              setFormData({
                                ...formData,
                                elements: newElements,
                              });
                            }}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Formula Editor */}
                {formData.elements.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium">
                      {t("customFormula")}
                    </label>
                    <div className="text-muted-foreground bg-muted/30 rounded p-2 text-xs">
                      <div className="mb-1 font-medium">
                        {t("availableElements")}:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {formData.elements.map((el) => (
                          <code
                            key={el.id}
                            className="bg-primary/10 rounded px-1.5 py-0.5"
                          >
                            {el.name || t("unnamed")}
                          </code>
                        ))}
                      </div>
                      <div className="mt-2">
                        {t("formulaExample")}:{" "}
                        <code>
                          (Netheid + Originaliteit + Eindresultaat) / 15
                        </code>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder={t("formulaPlaceholder")}
                      value={formData.customFormula}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customFormula: e.target.value,
                        })
                      }
                      className="w-full rounded border px-3 py-2 font-mono text-sm"
                    />
                    <p className="text-muted-foreground text-xs">
                      {t("formulaDescription")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">
                {t("description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full rounded border px-3 py-2"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">{t("save")}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}

      {/* Tests List */}
      <div className="space-y-2">
        {tests.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border p-8 text-center">
            {t("noTestsYet")}
          </div>
        ) : (
          tests.map((test) => {
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
