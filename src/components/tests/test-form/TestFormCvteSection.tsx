import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlusIcon, XIcon, ChartLine } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CvTEChart } from "../CvTEChart";
import type { LevelNormering } from "@/services/test-database";
import type { TestFormState } from "../types";
import { LEVEL_OVERRIDE_OPTIONS } from "@/helpers/student_helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestFormCvteSectionProps {
  formData: TestFormState;
  setFormData: React.Dispatch<React.SetStateAction<TestFormState>>;
  availableLevels: string[];
}

export function TestFormCvteSection({
  formData,
  setFormData,
  availableLevels,
}: TestFormCvteSectionProps) {
  const { t } = useTranslation();
  const [cvteTab, setCvteTab] = useState<"default" | "level">("default");
  const [showChartDialog, setShowChartDialog] = useState(false);
  const [chartDialogLevel, setChartDialogLevel] = useState<string | null>(null);

  const chartNTerms = useMemo(() => [0, formData.nTerm, 2.0], [formData.nTerm]);
  const hasLevelNormerings = useMemo(
    () => Object.keys(formData.levelNormerings).length > 0,
    [formData.levelNormerings],
  );

  const updateField = <Key extends keyof TestFormState>(
    key: Key,
    value: TestFormState[Key],
  ) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
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
    <div className="col-span-2">
      <Tabs
        value={cvteTab}
        onValueChange={(value) => setCvteTab(value as "default" | "level")}
      >
        <TabsList>
          <TabsTrigger value="default">
            {hasLevelNormerings ? t("defaultNormering") : t("normering")}
          </TabsTrigger>
          <TabsTrigger value="level">{t("levelSpecificNormerings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="default" className="space-y-4 rounded border p-4">
          {hasLevelNormerings && (
            <p className="text-muted-foreground text-xs">
              {t("defaultNormeringHelper")}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("maxPoints")}</label>
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
              <label className="mb-1 block text-sm font-medium">{t("nTerm")} (n)</label>
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
              <p className="text-muted-foreground mt-1 text-xs">{t("nTermHelp")}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("cvteCalculation")}</label>
            <div className="flex flex-wrap items-end gap-2">
              <select
                value={formData.cvteCalculationMode}
                onChange={(event) =>
                  updateField(
                    "cvteCalculationMode",
                    event.target.value as TestFormState["cvteCalculationMode"],
                  )
                }
                className="w-full max-w-md rounded border px-3 py-2"
              >
                <option value="legacy">{t("cvteCalculationLegacy")}</option>
                <option value="official">{t("cvteCalculationOfficial")}</option>
                <option value="main">{t("cvteCalculationMain")}</option>
              </select>
              {formData.maxPoints > 0 && (
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
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="level" className="space-y-3 rounded border p-4">
          {availableLevels.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noLevelNormeringsYet")}</p>
          ) : (
            <>
              <p className="text-muted-foreground text-xs">
                {availableLevels.length > 1
                  ? t("levelSpecificNormeringsHelper")
                  : `${t("detectedLevels")}: ${availableLevels.join(", ")} - ${t("singleLevelDetected")}`}
              </p>

              {Object.keys(formData.levelNormerings).length === 0 ? (
                <div className="text-muted-foreground text-center text-sm">
                  {t("noLevelNormeringsYet")}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(formData.levelNormerings).map(([level, normering]) => {
                    const levelLabel =
                      LEVEL_OVERRIDE_OPTIONS.find((option) => option.code === level)
                        ?.label ?? level;
                    return (
                      <div key={level} className="bg-muted/30 rounded border p-3">
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
                            <label className="mb-1 block text-xs font-medium">{t("maxPoints")}</label>
                            <input
                              type="number"
                              min="1"
                              value={normering.maxPoints}
                              onChange={(e) =>
                                updateLevelNormering(level, {
                                  maxPoints: parseInt(e.target.value, 10),
                                })
                              }
                              className="w-full rounded border px-2 py-1 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">{t("nTerm")} (n)</label>
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
                            <label className="mb-1 block text-xs font-medium">{t("cvteCalculation")}</label>
                            <select
                              value={normering.cvteCalculationMode}
                              onChange={(e) =>
                                updateLevelNormering(level, {
                                  cvteCalculationMode:
                                    e.target.value as LevelNormering["cvteCalculationMode"],
                                })
                              }
                              className="w-full rounded border px-2 py-1 text-sm"
                            >
                              <option value="legacy">{t("cvteCalculationLegacy")}</option>
                              <option value="official">{t("cvteCalculationOfficial")}</option>
                              <option value="main">{t("cvteCalculationMain")}</option>
                            </select>
                          </div>
                        </div>
                        {normering.maxPoints > 0 && (
                          <div className="mt-3">
                            <Dialog
                              open={showChartDialog && chartDialogLevel === level}
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
                                    {t("gradeCalculationChart")} - {level}
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
                  })}
                </div>
              )}

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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
