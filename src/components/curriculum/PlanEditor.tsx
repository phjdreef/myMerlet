import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { RichTextEditor } from "../ui/rich-text-editor";
import { CurriculumTimeline } from "./CurriculumTimeline";
import { BlockedWeeksManager } from "./BlockedWeeksManager";
import { getCurrentWeekNumber } from "../../utils/week-utils";
import { logger } from "../../utils/logger";
import { useTranslation } from "react-i18next";
import type {
  CurriculumPlan,
  Topic,
  Paragraph,
} from "../../services/curriculum-database";
import {
  clampWeekNumber,
  DEFAULT_WEEK_END,
  DEFAULT_WEEK_START,
} from "../../utils/curriculum-week";

interface PlanEditorProps {
  plan: CurriculumPlan;
  onSave: (plan: CurriculumPlan) => void;
  onCancel: () => void;
}

export function PlanEditor({ plan, onSave, onCancel }: PlanEditorProps) {
  const { t } = useTranslation();
  const [editedPlan, setEditedPlan] = useState<CurriculumPlan>(plan);
  const [activeTab, setActiveTab] = useState<
    "info" | "topics" | "paragraphs" | "goals" | "blocked-weeks"
  >("info");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [copiedToClasses, setCopiedToClasses] = useState<string[]>([]);
  const [weekStartInput, setWeekStartInput] = useState<string>(
    plan.weekRangeStart.toString(),
  );
  const [weekEndInput, setWeekEndInput] = useState<string>(
    plan.weekRangeEnd.toString(),
  );

  // Load available classes from student database
  useEffect(() => {
    loadAvailableClasses();
    if (plan.isTemplate === true) {
      loadCopiedToClasses();
    }
  }, []);

  const loadCopiedToClasses = async () => {
    try {
      const result = await window.curriculumAPI.getAllPlans();
      if (result.success && result.data) {
        const plansData = result.data as { plans: CurriculumPlan[] };
        // Find all class-specific copies that were created from this template
        const copies = (plansData.plans || []).filter(
          (p) => p.sourceTemplateId === plan.id && p.isTemplate === false,
        );
        const classNames = copies.flatMap((p) => p.classNames);
        setCopiedToClasses([...new Set(classNames)]); // Remove duplicates
      }
    } catch (error) {
      logger.error("Failed to load copied classes:", error);
    }
  };

  const loadAvailableClasses = async () => {
    try {
      setIsLoadingClasses(true);
      const result = await window.studentDBAPI.getAllStudents();

      if (result.success && result.data) {
        const students = result.data as Array<{ klassen?: string[] }>;
        const classSet = new Set<string>();

        students.forEach((student) => {
          if (student.klassen && Array.isArray(student.klassen)) {
            student.klassen.forEach((klass) => classSet.add(klass));
          }
        });

        setAvailableClasses(Array.from(classSet).sort());
        logger.log("Loaded classes:", Array.from(classSet));
      }
    } catch (error) {
      logger.error("Failed to load classes:", error);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const handleSave = () => {
    const updatedPlan = {
      ...editedPlan,
      updatedAt: new Date().toISOString(),
    };
    onSave(updatedPlan);
  };

  const handleAddClass = async (className: string) => {
    // Check if already copied to this class
    if (copiedToClasses.includes(className)) {
      alert(
        t("alreadyCopiedToClass", { className }) ||
          `Deze planning is al gekopieerd naar klas "${className}".`,
      );
      return;
    }

    // If this is a template and we're adding a class, create a class-specific copy
    if (editedPlan.isTemplate === true) {
      const classSpecificCopy = {
        ...editedPlan,
        id: crypto.randomUUID(),
        classNames: [className],
        isTemplate: false,
        sourceTemplateId: editedPlan.id, // Link back to the source template
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Deep copy all nested arrays to ensure they're independent
        studyGoals: editedPlan.studyGoals.map((goal) => ({
          ...goal,
          paragraphIds: [...goal.paragraphIds],
          topicIds: [...goal.topicIds],
        })),
        topics: editedPlan.topics.map((topic) => ({ ...topic })),
        paragraphs: editedPlan.paragraphs.map((paragraph) => ({
          ...paragraph,
        })),
        blockedWeeks: editedPlan.blockedWeeks.map((week) => ({ ...week })),
      };

      // Save the class-specific copy
      try {
        const result = await window.curriculumAPI.savePlan(classSpecificCopy);
        if (result.success) {
          logger.log("Class-specific copy created for:", className);
          setCopiedToClasses([...copiedToClasses, className]);
          alert(
            t("classSpecificCopyCreated", { className }) ||
              `✅ Planning gekopieerd naar klas "${className}"!\n\nJe kunt dit nu bekijken in Klassen → ${className} → Planning.`,
          );
        } else {
          logger.error("Failed to create class-specific copy:", result.error);
          alert(
            t("classSpecificCopyError") ||
              "❌ Fout bij het kopiëren van de planning naar de klas.",
          );
        }
      } catch (error) {
        logger.error("Error creating class-specific copy:", error);
        alert(
          t("classSpecificCopyError") ||
            "❌ Fout bij het kopiëren van de planning naar de klas.",
        );
      }

      // Don't add the class to the template itself
      return;
    }

    // If not a template, just add the class normally
    setEditedPlan({
      ...editedPlan,
      classNames: [...editedPlan.classNames, className],
    });
  };

  const handleRemoveClass = (className: string) => {
    setEditedPlan({
      ...editedPlan,
      classNames: editedPlan.classNames.filter((c) => c !== className),
    });
  };

  // Topic management
  const addTopic = () => {
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      order: editedPlan.topics.length,
    };
    setEditedPlan({
      ...editedPlan,
      topics: [...editedPlan.topics, newTopic],
    });
  };

  const updateTopic = (id: string, updates: Partial<Topic>) => {
    setEditedPlan({
      ...editedPlan,
      topics: editedPlan.topics.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    });
  };

  const deleteTopic = (id: string) => {
    setEditedPlan({
      ...editedPlan,
      topics: editedPlan.topics.filter((t) => t.id !== id),
    });
  };

  // Paragraph management
  const addParagraph = () => {
    const newParagraph: Paragraph = {
      id: crypto.randomUUID(),
      number: "",
      title: "",
      order: editedPlan.paragraphs.length,
    };
    setEditedPlan({
      ...editedPlan,
      paragraphs: [...editedPlan.paragraphs, newParagraph],
    });
  };

  const updateParagraph = (id: string, updates: Partial<Paragraph>) => {
    setEditedPlan({
      ...editedPlan,
      paragraphs: editedPlan.paragraphs.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    });
  };

  const deleteParagraph = (id: string) => {
    setEditedPlan({
      ...editedPlan,
      paragraphs: editedPlan.paragraphs.filter((p) => p.id !== id),
    });
  };

  const handleWeekRangeChange = (
    field: "weekRangeStart" | "weekRangeEnd",
    value: string,
  ) => {
    // Update the input field immediately
    if (field === "weekRangeStart") {
      setWeekStartInput(value);
    } else {
      setWeekEndInput(value);
    }
  };

  const handleWeekRangeBlur = (
    field: "weekRangeStart" | "weekRangeEnd",
    value: string,
  ) => {
    // On blur, validate and update the plan
    const parsed = Number.parseInt(value, 10);
    const fallback =
      field === "weekRangeStart" ? DEFAULT_WEEK_START : DEFAULT_WEEK_END;

    if (value === "" || Number.isNaN(parsed)) {
      // Reset to fallback
      if (field === "weekRangeStart") {
        setWeekStartInput(fallback.toString());
      } else {
        setWeekEndInput(fallback.toString());
      }
      setEditedPlan((prev) => ({
        ...prev,
        [field]: fallback,
      }));
    } else {
      const normalized = clampWeekNumber(parsed);
      if (field === "weekRangeStart") {
        setWeekStartInput(normalized.toString());
      } else {
        setWeekEndInput(normalized.toString());
      }
      setEditedPlan((prev) => ({
        ...prev,
        [field]: normalized,
      }));
    }
  };

  return (
    <div className="container mx-auto flex h-full flex-col p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("editPlan")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b">
        {["info", "topics", "paragraphs", "goals", "blocked-weeks"].map(
          (tab) => (
            <button
              key={tab}
              className={`border-b-2 px-4 py-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent hover:border-gray-300"
              }`}
              onClick={() => setActiveTab(tab as typeof activeTab)}
            >
              {tab === "info" && t("planInfo")}
              {tab === "topics" &&
                `${t("topics")} (${editedPlan.topics.length})`}
              {tab === "paragraphs" &&
                `${t("paragraphs")} (${editedPlan.paragraphs.length})`}
              {tab === "goals" &&
                `${t("studyGoals")} (${editedPlan.studyGoals.length})`}
              {tab === "blocked-weeks" &&
                `${t("blockedWeeks")} (${editedPlan.blockedWeeks.length})`}
            </button>
          ),
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "info" && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/20">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {t("templateSchoolYearInfo") ||
                  "Templates zijn schooljaar-onafhankelijk"}
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                {t("templateSchoolYearDescription") ||
                  "Wanneer je een template aan een klas toewijst, wordt het huidige schooljaar uit de instellingen gebruikt."}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("subject")}
              </label>
              <input
                type="text"
                className="w-full rounded border p-2"
                value={editedPlan.subject}
                onChange={(e) =>
                  setEditedPlan({ ...editedPlan, subject: e.target.value })
                }
                placeholder={t("subjectPlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("yearLevel")}
              </label>
              <input
                type="text"
                className="w-full rounded border p-2"
                value={editedPlan.yearLevel || ""}
                onChange={(e) =>
                  setEditedPlan({ ...editedPlan, yearLevel: e.target.value })
                }
                placeholder={t("yearLevelPlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("curriculumDescription")}
              </label>
              <input
                type="text"
                className="w-full rounded border p-2"
                value={editedPlan.description || ""}
                onChange={(e) =>
                  setEditedPlan({ ...editedPlan, description: e.target.value })
                }
                placeholder={t("descriptionPlaceholder")}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("schoolYearWeekRange")}
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                    {t("schoolYearStartWeek")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={53}
                    className="w-full rounded border p-2"
                    value={weekStartInput}
                    onChange={(e) =>
                      handleWeekRangeChange("weekRangeStart", e.target.value)
                    }
                    onBlur={(e) =>
                      handleWeekRangeBlur("weekRangeStart", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                    {t("schoolYearEndWeek")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={53}
                    className="w-full rounded border p-2"
                    value={weekEndInput}
                    onChange={(e) =>
                      handleWeekRangeChange("weekRangeEnd", e.target.value)
                    }
                    onBlur={(e) =>
                      handleWeekRangeBlur("weekRangeEnd", e.target.value)
                    }
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t("schoolYearWeekRangeHint")}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("classesOptional")}
              </label>

              {editedPlan.isTemplate === true && (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    💡 {t("templateWorkflowTitle") || "Hoe werkt het?"}
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-blue-800 dark:text-blue-300">
                    <li>
                      {t("templateWorkflowStep1") ||
                        "Vul eerst je template volledig in (onderwerpen, paragrafen, leerdoelen)"}
                    </li>
                    <li>
                      {t("templateWorkflowStep2") ||
                        "Kies een klas uit de lijst hieronder"}
                    </li>
                    <li>
                      {t("templateWorkflowStep3") ||
                        "Er wordt automatisch een kopie gemaakt voor die klas"}
                    </li>
                    <li>
                      {t("templateWorkflowStep4") ||
                        "Je template blijft ongewijzigd en kan opnieuw worden toegewezen"}
                    </li>
                  </ol>
                </div>
              )}

              {copiedToClasses.length > 0 && (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    ✅ {t("copiedToClasses") || "Gekopieerd naar klassen:"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {copiedToClasses.map((className) => (
                      <span
                        key={className}
                        className="rounded-full bg-green-200 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-200"
                      >
                        {className}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isLoadingClasses ? (
                <div className="text-sm text-gray-500">
                  {t("classesLoading")}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selected classes display */}
                  {editedPlan.classNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 rounded border bg-gray-50 p-3 dark:bg-gray-800">
                      {editedPlan.classNames.map((className) => (
                        <div
                          key={className}
                          className="flex items-center gap-2 rounded bg-blue-500 px-3 py-1 text-sm text-white"
                        >
                          <span>{className}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveClass(className)}
                            className="hover:text-red-200"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add from dropdown - always show */}
                  {availableClasses.length > 0 && (
                    <div>
                      <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                        {t("selectClassLabel")}
                      </label>
                      <select
                        className="w-full rounded border p-2"
                        value=""
                        onChange={(e) => {
                          if (
                            e.target.value &&
                            !editedPlan.classNames.includes(e.target.value)
                          ) {
                            handleAddClass(e.target.value);
                          }
                        }}
                      >
                        <option value="">{t("selectClassPlaceholder")}</option>
                        {availableClasses
                          .filter(
                            (c) =>
                              !editedPlan.classNames.includes(c) &&
                              !copiedToClasses.includes(c),
                          )
                          .map((className) => (
                            <option key={className} value={className}>
                              {className}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {availableClasses.length === 0 && (
                    <div className="text-sm text-gray-500">
                      {t("noClassesFound")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "topics" && (
          <div className="space-y-4">
            <Button onClick={addTopic}>+ {t("addTopic")}</Button>
            <div className="space-y-4">
              {editedPlan.topics.map((topic) => (
                <div key={topic.id} className="space-y-3 rounded border p-4">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded border p-2 font-medium"
                      value={topic.name}
                      onChange={(e) =>
                        updateTopic(topic.id, { name: e.target.value })
                      }
                      placeholder={t("topicName")}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTopic(topic.id)}
                    >
                      🗑️
                    </Button>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      {t("descriptionOptional")}
                    </label>
                    <RichTextEditor
                      content={topic.description || ""}
                      onChange={(content) =>
                        updateTopic(topic.id, { description: content })
                      }
                      placeholder={t("addDetailedDescription")}
                    />
                  </div>
                </div>
              ))}
              {editedPlan.topics.length === 0 && (
                <p className="text-gray-500 italic">{t("noTopicsYet")}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "paragraphs" && (
          <div className="space-y-4">
            <Button onClick={addParagraph}>+ {t("addParagraph")}</Button>
            <div className="space-y-2">
              {editedPlan.paragraphs.map((paragraph) => (
                <div
                  key={paragraph.id}
                  className="flex items-start gap-2 rounded border p-3"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="w-24 rounded border p-2"
                        value={paragraph.number}
                        onChange={(e) =>
                          updateParagraph(paragraph.id, {
                            number: e.target.value,
                          })
                        }
                        placeholder={t("paragraphNumberPlaceholder")}
                      />
                      <input
                        type="text"
                        className="flex-1 rounded border p-2"
                        value={paragraph.title}
                        onChange={(e) =>
                          updateParagraph(paragraph.id, {
                            title: e.target.value,
                          })
                        }
                        placeholder={t("paragraphTitle")}
                      />
                    </div>
                    {editedPlan.topics.length > 0 && (
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          {t("linkTopicOptional")}
                        </label>
                        <select
                          className="w-full rounded border p-2 text-sm"
                          value={paragraph.topicId || ""}
                          onChange={(e) =>
                            updateParagraph(paragraph.id, {
                              topicId: e.target.value || undefined,
                            })
                          }
                        >
                          <option value="">{t("noTopicOption")}</option>
                          {editedPlan.topics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteParagraph(paragraph.id)}
                  >
                    🗑️
                  </Button>
                </div>
              ))}
              {editedPlan.paragraphs.length === 0 && (
                <p className="text-gray-500 italic">{t("noParagraphsYet")}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "goals" && (
          <CurriculumTimeline
            plan={editedPlan}
            currentWeek={getCurrentWeekNumber()}
            onUpdate={(updatedPlan) => setEditedPlan(updatedPlan)}
          />
        )}

        {activeTab === "blocked-weeks" && (
          <BlockedWeeksManager
            blockedWeeks={editedPlan.blockedWeeks}
            availableClasses={availableClasses}
            onChange={(blockedWeeks) =>
              setEditedPlan({ ...editedPlan, blockedWeeks })
            }
          />
        )}
      </div>
    </div>
  );
}
