import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { generateSchoolYears } from "@/utils/school-year";
import { CalendarIcon } from "@phosphor-icons/react";
import { logger } from "@/utils/logger";

export function SchoolYearSelector() {
  const { t } = useTranslation();
  const { currentSchoolYear, setSchoolYear, isLoading } = useSchoolYear();
  const [availableYears] = useState(() => generateSchoolYears(10));
  const [saving, setSaving] = useState(false);

  const handleYearChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newYear = event.target.value;
    setSaving(true);
    try {
      await setSchoolYear(newYear);
    } catch (error) {
      logger.error("Failed to change school year:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <CalendarIcon className="text-muted-foreground h-5 w-5" />
        <select
          value={currentSchoolYear}
          onChange={handleYearChange}
          disabled={saving}
          className="border-border bg-background focus:ring-primary flex-1 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <p className="text-muted-foreground text-xs">
        {t("schoolYearDescription")}
      </p>
    </div>
  );
}
