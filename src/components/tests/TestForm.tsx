import { useTranslation } from "react-i18next";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useRef } from "react";
import type { CompositeElement, TestType } from "@/services/test-database";
import { Button } from "../ui/button";
import type { TestFormState } from "./types";

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
  const formulaInputRef = useRef<HTMLInputElement>(null);

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
                min="1"
                max="9"
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

      <div className="flex gap-2">
        <Button type="submit">{t("save")}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
