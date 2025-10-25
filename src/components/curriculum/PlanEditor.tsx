import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { RichTextEditor } from "../ui/rich-text-editor";
import { TimelineEditor } from "./TimelineEditor";
import { logger } from "../../utils/logger";
import { useTranslation } from "react-i18next";
import type {
  CurriculumPlan,
  Topic,
  Paragraph,
} from "../../services/curriculum-database";

interface PlanEditorProps {
  plan: CurriculumPlan;
  onSave: (plan: CurriculumPlan) => void;
  onCancel: () => void;
}

export function PlanEditor({ plan, onSave, onCancel }: PlanEditorProps) {
  const { t } = useTranslation();
  const [editedPlan, setEditedPlan] = useState<CurriculumPlan>(plan);
  const [activeTab, setActiveTab] = useState<
    "info" | "topics" | "paragraphs" | "goals"
  >("info");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Load available classes from student database
  useEffect(() => {
    loadAvailableClasses();
  }, []);

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
        {["info", "topics", "paragraphs", "goals"].map((tab) => (
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
            {tab === "topics" && `${t("topics")} (${editedPlan.topics.length})`}
            {tab === "paragraphs" &&
              `${t("paragraphs")} (${editedPlan.paragraphs.length})`}
            {tab === "goals" &&
              `${t("studyGoals")} (${editedPlan.studyGoals.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "info" && (
          <div className="max-w-2xl space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("classesOptional")}
              </label>
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
                            onClick={() => {
                              setEditedPlan({
                                ...editedPlan,
                                classNames: editedPlan.classNames.filter(
                                  (c) => c !== className,
                                ),
                              });
                            }}
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
                            setEditedPlan({
                              ...editedPlan,
                              classNames: [
                                ...editedPlan.classNames,
                                e.target.value,
                              ],
                            });
                          }
                        }}
                      >
                        <option value="">{t("selectClassPlaceholder")}</option>
                        {availableClasses
                          .filter((c) => !editedPlan.classNames.includes(c))
                          .map((className) => (
                            <option key={className} value={className}>
                              {className}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Add custom class */}
                  <div>
                    <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                      {t("addCustomClassName")}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="custom-class-input"
                        className="flex-1 rounded border p-2"
                        placeholder={t("customClassPlaceholder")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget;
                            const value = input.value.trim();
                            if (
                              value &&
                              !editedPlan.classNames.includes(value)
                            ) {
                              setEditedPlan({
                                ...editedPlan,
                                classNames: [...editedPlan.classNames, value],
                              });
                              input.value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.getElementById(
                            "custom-class-input",
                          ) as HTMLInputElement;
                          const value = input.value.trim();
                          if (value && !editedPlan.classNames.includes(value)) {
                            setEditedPlan({
                              ...editedPlan,
                              classNames: [...editedPlan.classNames, value],
                            });
                            input.value = "";
                          }
                        }}
                      >
                        {t("add")}
                      </Button>
                    </div>
                  </div>

                  {availableClasses.length === 0 && (
                    <div className="text-sm text-gray-500">
                      {t("noClassesFound")}
                    </div>
                  )}
                </div>
              )}
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
                {t("schoolYear")}
              </label>
              <input
                type="text"
                className="w-full rounded border p-2"
                value={editedPlan.schoolYear}
                onChange={(e) =>
                  setEditedPlan({ ...editedPlan, schoolYear: e.target.value })
                }
                placeholder={t("schoolYearPlaceholder")}
              />
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
          <TimelineEditor
            plan={editedPlan}
            onUpdate={(updatedPlan) => setEditedPlan(updatedPlan)}
          />
        )}
      </div>
    </div>
  );
}
