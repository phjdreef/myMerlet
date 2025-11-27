import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { BlockedWeek } from "../../services/curriculum-database";
import { Button } from "../ui/button";
import { Trash2, Edit2, Plus } from "lucide-react";
import { formatBlockedWeekRange } from "../../utils/curriculum-week";

interface BlockedWeeksManagerProps {
  blockedWeeks: BlockedWeek[];
  availableClasses: string[];
  onChange: (blockedWeeks: BlockedWeek[]) => void;
  isGlobal?: boolean; // If true, all blocked weeks are global and don't show class selection
}

interface BlockedWeekFormData {
  weekStart: number;
  weekEnd: number;
  reason: string;
  type: "holiday" | "exam" | "event" | "other";
  isGeneral: boolean;
  classNames: string[];
}

export const BlockedWeeksManager: React.FC<BlockedWeeksManagerProps> = ({
  blockedWeeks,
  availableClasses,
  onChange,
  isGlobal = false,
}) => {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BlockedWeekFormData>({
    weekStart: 1,
    weekEnd: 1,
    reason: "",
    type: "holiday",
    isGeneral: isGlobal || true,
    classNames: [],
  });

  const resetForm = () => {
    setFormData({
      weekStart: 1,
      weekEnd: 1,
      reason: "",
      type: "holiday",
      isGeneral: isGlobal || true,
      classNames: [],
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.reason.trim() ||
      formData.weekStart < 1 ||
      formData.weekStart > 53 ||
      formData.weekEnd < 1 ||
      formData.weekEnd > 53
    ) {
      return;
    }

    if (editingId) {
      // Update existing blocked week
      onChange(
        blockedWeeks.map((bw) =>
          bw.id === editingId
            ? {
                ...bw,
                weekStart: formData.weekStart,
                weekEnd: formData.weekEnd,
                reason: formData.reason.trim(),
                type: formData.type,
                isGeneral: formData.isGeneral,
                classNames: formData.isGeneral ? [] : formData.classNames,
              }
            : bw,
        ),
      );
    } else {
      // Add new blocked week
      const newBlockedWeek: BlockedWeek = {
        id: crypto.randomUUID(),
        weekStart: formData.weekStart,
        weekEnd: formData.weekEnd,
        reason: formData.reason.trim(),
        type: formData.type,
        isGeneral: formData.isGeneral,
        classNames: formData.isGeneral ? [] : formData.classNames,
      };
      onChange([...blockedWeeks, newBlockedWeek]);
    }

    resetForm();
  };

  const handleEdit = (blockedWeek: BlockedWeek) => {
    setFormData({
      weekStart: blockedWeek.weekStart,
      weekEnd: blockedWeek.weekEnd,
      reason: blockedWeek.reason,
      type: blockedWeek.type,
      isGeneral: blockedWeek.isGeneral,
      classNames: blockedWeek.classNames,
    });
    setEditingId(blockedWeek.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteBlockedWeek"))) {
      onChange(blockedWeeks.filter((bw) => bw.id !== id));
    }
  };

  const toggleClass = (className: string) => {
    setFormData((prev) => ({
      ...prev,
      classNames: prev.classNames.includes(className)
        ? prev.classNames.filter((c) => c !== className)
        : [...prev.classNames, className],
    }));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "holiday":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "exam":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "event":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const sortedBlockedWeeks = [...blockedWeeks].sort(
    (a, b) => a.weekStart - b.weekStart,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("blockedWeeks")}</h3>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {t("addBlockedWeek")}
          </Button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border p-4"
        >
          <h4 className="font-medium">
            {editingId ? t("editBlockedWeek") : t("blockWeek")}
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("weekStart")}
              </label>
              <input
                type="number"
                min="1"
                max="53"
                value={formData.weekStart}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weekStart: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("weekEnd")}
              </label>
              <input
                type="number"
                min="1"
                max="53"
                value={formData.weekEnd}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weekEnd: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("blockType")}
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as BlockedWeekFormData["type"],
                })
              }
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="holiday">{t("holiday")}</option>
              <option value="exam">{t("exam")}</option>
              <option value="event">{t("event")}</option>
              <option value="other">{t("other")}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("reason")}
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder={t("reasonPlaceholder")}
              className="w-full rounded-md border px-3 py-2"
              required
            />
          </div>

          {!isGlobal && (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.isGeneral}
                  onChange={() =>
                    setFormData({
                      ...formData,
                      isGeneral: true,
                      classNames: [],
                    })
                  }
                />
                <span>{t("applyToAllClasses")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!formData.isGeneral}
                  onChange={() =>
                    setFormData({ ...formData, isGeneral: false })
                  }
                />
                <span>{t("applyToSpecificClasses")}</span>
              </label>
            </div>
          )}

          {!isGlobal && !formData.isGeneral && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("selectClassesForBlock")}
              </label>
              <div className="flex flex-wrap gap-2">
                {availableClasses.map((className) => (
                  <label
                    key={className}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={formData.classNames.includes(className)}
                      onChange={() => toggleClass(className)}
                    />
                    <span>{className}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              {t("cancel")}
            </Button>
            <Button type="submit">{editingId ? t("save") : t("add")}</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {sortedBlockedWeeks.length === 0 ? (
          <p className="text-sm text-gray-500 italic dark:text-gray-400">
            {t("noBlockedWeeks")}
          </p>
        ) : (
          sortedBlockedWeeks.map((blockedWeek) => (
            <div
              key={blockedWeek.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium">
                    {formatBlockedWeekRange(
                      blockedWeek.weekStart,
                      blockedWeek.weekEnd,
                    )}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${getTypeColor(
                      blockedWeek.type,
                    )}`}
                  >
                    {t(blockedWeek.type)}
                  </span>
                  {!isGlobal &&
                    (blockedWeek.isGeneral ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({t("general")})
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({t("classSpecific")}:{" "}
                        {blockedWeek.classNames.join(", ")})
                      </span>
                    ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {blockedWeek.reason}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(blockedWeek)}
                  className="p-2"
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(blockedWeek.id)}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
