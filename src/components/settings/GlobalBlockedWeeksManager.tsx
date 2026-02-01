import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BlockedWeeksManager } from "../curriculum/BlockedWeeksManager";
import type { BlockedWeek } from "../../services/curriculum-database";
import LoadingSpinner from "../LoadingSpinner";
import { logger } from "../../utils/logger";

export function GlobalBlockedWeeksManager() {
  const { t } = useTranslation();
  const [blockedWeeks, setBlockedWeeks] = useState<BlockedWeek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlockedWeeks();
  }, []);

  const loadBlockedWeeks = async () => {
    try {
      const weeks = await window.settingsAPI.getGlobalBlockedWeeks();
      setBlockedWeeks(weeks);
    } catch (error) {
      logger.error("Failed to load global blocked weeks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (weeks: BlockedWeek[]) => {
    try {
      await window.settingsAPI.setGlobalBlockedWeeks(weeks);
      setBlockedWeeks(weeks);
    } catch (error) {
      logger.error("Failed to save global blocked weeks:", error);
    }
  };

  if (loading) {
    return <LoadingSpinner size="sm" text={t("loading")} />;
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("globalBlockedWeeksDescription")}
        </p>
      </div>
      <BlockedWeeksManager
        blockedWeeks={blockedWeeks}
        availableClasses={[]} // Global blocked weeks don't need class selection
        onChange={handleChange}
        isGlobal={true}
      />
    </div>
  );
}
