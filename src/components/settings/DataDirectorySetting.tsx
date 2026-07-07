import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpenIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logger } from "@/utils/logger";

export function DataDirectorySetting() {
  const { t } = useTranslation();
  const [defaultDirectory, setDefaultDirectory] = useState("");
  const [customDirectory, setCustomDirectory] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadDirectories = async () => {
      try {
        const [defaultPath, customPath] = await Promise.all([
          window.settingsAPI.getDefaultDataDirectory(),
          window.settingsAPI.getDataDirectory(),
        ]);

        setDefaultDirectory(defaultPath);
        setCustomDirectory(customPath);
      } catch (error) {
        logger.error("Failed to load data directory settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadDirectories();
  }, []);

  const activeDirectory = useMemo(
    () => customDirectory || defaultDirectory,
    [customDirectory, defaultDirectory],
  );

  const handleChooseDirectory = async () => {
    setIsSaving(true);
    try {
      const selectedDirectory = await window.settingsAPI.chooseDataDirectory();
      if (!selectedDirectory) return;

      await window.settingsAPI.setDataDirectory(selectedDirectory);
      setCustomDirectory(selectedDirectory);
    } catch (error) {
      logger.error("Failed to set data directory:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSaving(true);
    try {
      await window.settingsAPI.setDataDirectory(undefined);
      setCustomDirectory(undefined);
    } catch (error) {
      logger.error("Failed to reset data directory:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">{t("loading")}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">
          {t("dataDirectoryCurrent")}
        </p>
        <Input value={activeDirectory} readOnly />
      </div>

      <p className="text-muted-foreground text-xs">
        {customDirectory
          ? t("dataDirectoryCustomInUse")
          : t("dataDirectoryDefaultInUse")}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleChooseDirectory} disabled={isSaving}>
          <FolderOpenIcon />
          {t("chooseDataDirectory")}
        </Button>
        <Button
          variant="outline"
          onClick={handleResetToDefault}
          disabled={isSaving || !customDirectory}
        >
          {t("resetDataDirectory")}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        {t("dataDirectoryRestartHint")}
      </p>
    </div>
  );
}
