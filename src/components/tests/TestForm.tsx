import { useTranslation } from "react-i18next";
import { PlusIcon, XIcon, ChartLine } from "@phosphor-icons/react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useRef, useMemo, useState, useEffect } from "react";
import { CvTEChart } from "./CvTEChart";
import type {
  CompositeElement,
  TestType,
  LevelNormering,
} from "@/services/test-database";
import { Button } from "../ui/button";
import type { TestFormState } from "./types";
import { studentDB } from "@/services/student-database";
import {
  extractShortLevel,
  LEVEL_OVERRIDE_PROPERTY_ID,
  LEVEL_OVERRIDE_OPTIONS,
} from "@/helpers/student_helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useSchoolYear } from "@/contexts/SchoolYearContext";

interface TestFormProps {
  formData: TestFormState;
  setFormData: Dispatch<SetStateAction<TestFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  classOptions: string[];
  onToggleClass: (value: string, explicitChecked?: boolean) => void;
  formError: string | null;
  isEditing: boolean;
}

export function TestForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  classOptions,
  onToggleClass,
  formError,
  isEditing,
}: TestFormProps) {
  const { t } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const [showLevelNormerings, setShowLevelNormerings] = useState(false);
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const [showChartDialog, setShowChartDialog] = useState(false);
  const [chartDialogLevel, setChartDialogLevel] = useState<string | null>(null);

  // Chart data: show current n-term and two reference lines
  const chartNTerms = useMemo(() => [0, formData.nTerm, 2.0], [formData.nTerm]);
  const hasLevelNormerings = useMemo(
    () => Object.keys(formData.levelNormerings).length > 0,
    [formData.levelNormerings],
  );

  // Load available levels from selected class groups
  useEffect(() => {
    const loadLevels = async () => {
      if (formData.classGroups.length === 0) {
        setAvailableLevels([]);
        return;
      }

      try {
        // Get all students and filter by selected classes
        const allLevels = new Set<string>();

        console.log("Loading levels for classes:", formData.classGroups);

        const allStudents = await studentDB.getAllStudents();
        console.log("Total students in database:", allStudents.length);

        // Helper to check if a value is a valid niveau (not a course code like "CV3")
        const isValidNiveau = (value: string) => {
          const normalized = value.toUpperCase();
          const validNiveaus = [
            "HAVO",
            "VWO",
            "MAVO",
            "VMBO",
            "ATHENEUM",
            "GYMNASIUM",
          ];
          return validNiveaus.some((niveau) => normalized.includes(niveau));
        };

        for (const classGroup of formData.classGroups) {
          // Filter students that have this class
          const studentsInClass = allStudents.filter(
            (student) =>
              student.klassen && student.klassen.includes(classGroup),
          );

          console.log(`Students for ${classGroup}:`, studentsInClass.length);

          if (currentSchoolYear) {
            const overrideValues = await Promise.all(
              studentsInClass.map(async (student) => {
                const values = await studentDB.getPropertyValues(
                  student.id,
                  classGroup,
                  currentSchoolYear,
                );
                return values.find(
                  (value) => value.propertyId === LEVEL_OVERRIDE_PROPERTY_ID,
                )?.value;
              }),
            );

            overrideValues.forEach((value) => {
              if (typeof value === "string" && value.trim().length > 0) {
                allLevels.add(value.trim().toUpperCase());
              }
            });
          }

          // Extract levels from students
          studentsInClass.forEach((student) => {
            if (student.profiel1 && isValidNiveau(student.profiel1)) {
              const level = extractShortLevel(student.profiel1);
              console.log("Found profiel1:", level);
              allLevels.add(level);
            }
            if (student.studies && student.studies.length > 0) {
              student.studies.forEach((study) => {
                if (isValidNiveau(study)) {
                  const level = extractShortLevel(study);
                  console.log("Found study:", level);
                  allLevels.add(level);
                }
              });
            }
          });
        }

        // Only use class name detection if no levels found from students
        // and only for very obvious patterns
        if (allLevels.size === 0) {
          formData.classGroups.forEach((className) => {
            const normalized = className.toLowerCase();
            // Only match complete words or very clear patterns
            if (/\bvwo\b/.test(normalized)) {
              allLevels.add("VWO");
            }
            if (/\bhavo\b/.test(normalized)) {
              allLevels.add("HAVO");
            }
            if (/\bmavo\b/.test(normalized)) {
              allLevels.add("MAVO");
            }
            if (/\bvmbo\b/.test(normalized)) {
              allLevels.add("VMBO");
            }
          });
        }

        const levelsArray = Array.from(allLevels).sort();
        console.log("Final detected levels:", levelsArray);
        setAvailableLevels(levelsArray);
      } catch (error) {
        console.error("Failed to load levels:", error);
        setAvailableLevels([]);
      }
    };

    loadLevels();
  }, [formData.classGroups]);

  const updateField = <Key extends keyof TestFormState>(
    key: Key,
    value: TestFormState[Key],
  ) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateElement = (index: number, patch: Partial<CompositeElement>) => {
    setFormData((previous) => {
      const copy = [...previous.elements];
      copy[index] = { ...copy[index], ...patch };
      return {
        ...previous,
        elements: copy,
      };
    });
  };

  const removeElement = (index: number) => {
    setFormData((previous) => ({
      ...previous,
      elements: previous.elements.filter((_, idx) => idx !== index),
    }));
  };

  const addElement = () => {
    const newElement: CompositeElement = {
      id: `${Date.now()}`,
      name: "",
      maxPoints: 10,
      weight: 1,
      order: formData.elements.length,
    };

    setFormData((previous) => ({
      ...previous,
      elements: [...previous.elements, newElement],
    }));
  };

  const insertElementIntoFormula = (elementName: string) => {
    const input = formulaInputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? formData.customFormula.length;
    const end = input.selectionEnd ?? formData.customFormula.length;
    const currentFormula = formData.customFormula;

    // Insert element name at cursor position
    const newFormula =
      currentFormula.substring(0, start) +
      elementName +
      currentFormula.substring(end);

    updateField("customFormula", newFormula);

    // Set cursor position after inserted text
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + elementName.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const addLevelNormering = (level: string) => {
    setFormData((prev) => ({
      ...prev,
      levelNormerings: {
        ...prev.levelNormerings,
        [level]: {
          nTerm: prev.nTerm,
          maxPoints: prev.maxPoints,
          cvteCalculationMode: prev.cvteCalculationMode,
        },
      },
    }));
  };

  const removeLevelNormering = (level: string) => {
    setFormData((prev) => {
      const newLevelNormerings = { ...prev.levelNormerings };
      delete newLevelNormerings[level];
      return {
        ...prev,
        levelNormerings: newLevelNormerings,
      };
    });
  };

  const updateLevelNormering = (
    level: string,
    patch: Partial<LevelNormering>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      levelNormerings: {
        ...prev.levelNormerings,
        [level]: {
          ...prev.levelNormerings[level],
          ...patch,
        },
      },
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-medium">
        {isEditing ? t("editTest") : t("newTest")}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium">
            {t("testName")}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(event) => updateField("name", event.target.value)}
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
                  className={`border-border flex items-center gap-2 rounded border px-3 py-1 text-xs font-medium transition-colors ${checked ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50 hover:text-primary"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      onToggleClass(classOption, event.target.checked)
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
            onChange={(event) => updateField("date", event.target.value)}
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
            onChange={(event) =>
              updateField("weight", parseInt(event.target.value, 10))
            }
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

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
                onChange={(event) =>
                  updateField("testType", event.target.value as TestType)
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
                onChange={(event) =>
                  updateField("testType", event.target.value as TestType)
                }
              />
              <span>{t("compositeTest")}</span>
            </label>
          </div>
        </div>

        {formData.testType === "cvte" && (
          <>
            {/* Standard normering - always visible */}
            <div className="col-span-2">
              <label className="text-sm font-medium">
                {hasLevelNormerings ? t("defaultNormering") : t("normering")}
              </label>
              {hasLevelNormerings && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("defaultNormeringHelper")}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("maxPoints")}
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxPoints}
                onChange={(event) =>
                  updateField("maxPoints", parseInt(event.target.value, 10))
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
                min="0"
                step="0.1"
                value={formData.nTerm}
                onChange={(event) =>
                  updateField("nTerm", parseFloat(event.target.value))
                }
                className="w-full rounded border px-3 py-2"
                required
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {t("nTermHelp")}
              </p>
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">
                {t("cvteCalculation")}
              </label>
              <select
                value={formData.cvteCalculationMode}
                onChange={(event) =>
                  updateField(
                    "cvteCalculationMode",
                    event.target.value as TestFormState["cvteCalculationMode"],
                  )
                }
                className="w-full rounded border px-3 py-2"
              >
                <option value="legacy">{t("cvteCalculationLegacy")}</option>
                <option value="official">{t("cvteCalculationOfficial")}</option>
                <option value="main">{t("cvteCalculationMain")}</option>
              </select>
            </div>

            {formData.maxPoints > 0 && (
              <div className="col-span-2">
                <Dialog
                  open={showChartDialog && chartDialogLevel === null}
                  onOpenChange={(open) => {
                    if (!open) setShowChartDialog(false);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowChartDialog(true);
                        setChartDialogLevel(null);
                      }}
                    >
                      <ChartLine className="mr-2 h-4 w-4" />
                      {t("viewChart")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{t("gradeCalculationChart")}</DialogTitle>
                    </DialogHeader>
                    <CvTEChart
                      maxPoints={formData.maxPoints}
                      nTerms={chartNTerms}
                      mode={formData.cvteCalculationMode}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Level-specific normerings - show debug info */}
            <div className="bg-muted/30 col-span-2 space-y-2 rounded border p-3">
              <div className="text-sm">
                <strong>Debug Info:</strong>
                <div>
                  Selected classes: {formData.classGroups.join(", ") || "none"}
                </div>
                <div>
                  Detected levels: {availableLevels.join(", ") || "none"}
                </div>
                <div>Test type: {formData.testType}</div>
              </div>
            </div>

            {/* Level-specific normerings */}
            {availableLevels.length > 0 && (
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {t("levelSpecificNormerings")}
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLevelNormerings(!showLevelNormerings)}
                  >
                    {showLevelNormerings ? t("hide") : t("show")}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  {availableLevels.length > 1
                    ? t("levelSpecificNormeringsHelper")
                    : `${t("detectedLevels")}: ${availableLevels.join(", ")} - ${t("singleLevelDetected")}`}
                </p>

                {showLevelNormerings && (
                  <div className="space-y-3 rounded border p-3">
                    {Object.keys(formData.levelNormerings).length === 0 ? (
                      <div className="text-muted-foreground text-center text-sm">
                        {t("noLevelNormeringsYet")}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(formData.levelNormerings).map(
                          ([level, normering]) => {
                            const levelLabel =
                              LEVEL_OVERRIDE_OPTIONS.find(
                                (option) => option.code === level,
                              )?.label ?? level;
                            return (
                              <div
                                key={level}
                                className="bg-muted/30 rounded border p-3"
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <h4 className="font-medium">{levelLabel}</h4>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeLevelNormering(level)}
                                  >
                                    <XIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium">
                                      {t("maxPoints")}
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={normering.maxPoints}
                                      onChange={(e) =>
                                        updateLevelNormering(level, {
                                          maxPoints: parseInt(
                                            e.target.value,
                                            10,
                                          ),
                                        })
                                      }
                                      className="w-full rounded border px-2 py-1 text-sm"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium">
                                      {t("nTerm")} (n)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={normering.nTerm}
                                      onChange={(e) =>
                                        updateLevelNormering(level, {
                                          nTerm: parseFloat(e.target.value),
                                        })
                                      }
                                      className="w-full rounded border px-2 py-1 text-sm"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium">
                                      {t("cvteCalculation")}
                                    </label>
                                    <select
                                      value={normering.cvteCalculationMode}
                                      onChange={(e) =>
                                        updateLevelNormering(level, {
                                          cvteCalculationMode: e.target
                                            .value as LevelNormering["cvteCalculationMode"],
                                        })
                                      }
                                      className="w-full rounded border px-2 py-1 text-sm"
                                    >
                                      <option value="legacy">
                                        {t("cvteCalculationLegacy")}
                                      </option>
                                      <option value="official">
                                        {t("cvteCalculationOfficial")}
                                      </option>
                                      <option value="main">
                                        {t("cvteCalculationMain")}
                                      </option>
                                    </select>
                                  </div>
                                </div>
                                {/* Chart for this level */}
                                {normering.maxPoints > 0 && (
                                  <div className="mt-3">
                                    <Dialog
                                      open={
                                        showChartDialog &&
                                        chartDialogLevel === level
                                      }
                                      onOpenChange={(open) => {
                                        if (!open) {
                                          setShowChartDialog(false);
                                          setChartDialogLevel(null);
                                        }
                                      }}
                                    >
                                      <DialogTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setShowChartDialog(true);
                                            setChartDialogLevel(level);
                                          }}
                                        >
                                          <ChartLine className="mr-2 h-4 w-4" />
                                          {t("viewChart")} ({level})
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-4xl">
                                        <DialogHeader>
                                          <DialogTitle>
                                            {t("gradeCalculationChart")} -{" "}
                                            {level}
                                          </DialogTitle>
                                        </DialogHeader>
                                        <CvTEChart
                                          maxPoints={normering.maxPoints}
                                          nTerms={[0, normering.nTerm, 2.0]}
                                          mode={normering.cvteCalculationMode}
                                        />
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}

                    {/* Add level normering buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {availableLevels
                        .filter((level) => !formData.levelNormerings[level])
                        .map((level) => (
                          <Button
                            key={level}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => addLevelNormering(level)}
                          >
                            <PlusIcon className="mr-1 h-3 w-3" />
                            {level}
                          </Button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

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
                onClick={addElement}
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
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-2">
                  <div className="col-span-4">
                    <span className="text-muted-foreground text-xs font-medium">
                      {t("elementName")}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-muted-foreground text-xs font-medium">
                      {t("maxPoints")}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                      {t("weight")}
                      <span className="cursor-help" title={t("weightTooltip")}>
                        ⓘ
                      </span>
                    </span>
                  </div>
                  <div className="col-span-1" />
                </div>

                {/* Element rows */}
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
                        onChange={(event) =>
                          updateElement(index, { name: event.target.value })
                        }
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
                        onChange={(event) =>
                          updateElement(index, {
                            maxPoints: parseInt(event.target.value, 10),
                          })
                        }
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
                        onChange={(event) =>
                          updateElement(index, {
                            weight: parseFloat(event.target.value),
                          })
                        }
                        className="w-full rounded border px-2 py-1 text-sm"
                        required
                        title={t("weightTooltip")}
                      />
                    </div>
                    <div className="col-span-1 flex items-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeElement(index)}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                      <button
                        key={el.id}
                        type="button"
                        onClick={() => insertElementIntoFormula(el.name)}
                        disabled={!el.name || el.name.trim() === ""}
                        className="bg-primary/10 hover:bg-primary/20 cursor-pointer rounded px-1.5 py-0.5 font-mono transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        title={
                          el.name && el.name.trim() !== ""
                            ? t("clickToInsert")
                            : t("nameElementFirst")
                        }
                      >
                        {el.name || t("unnamed")}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    {t("formulaExample")}:{" "}
                    <code>(Netheid + Originaliteit + Eindresultaat) / 15</code>
                  </div>
                </div>
                <input
                  ref={formulaInputRef}
                  type="text"
                  placeholder={t("formulaPlaceholder")}
                  value={formData.customFormula}
                  onChange={(event) =>
                    updateField("customFormula", event.target.value)
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
            onChange={(event) => updateField("description", event.target.value)}
            className="w-full rounded border px-3 py-2"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">{t("save")}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
