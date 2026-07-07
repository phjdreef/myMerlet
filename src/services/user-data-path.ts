import { app } from "electron";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";

const GLOBAL_SETTINGS_FILE_NAME = "global_settings.json";

function resolveConfiguredDataDirectory(defaultUserDataPath: string): string {
  try {
    const settingsPath = path.join(
      defaultUserDataPath,
      GLOBAL_SETTINGS_FILE_NAME,
    );
    if (!fs.existsSync(settingsPath)) {
      return defaultUserDataPath;
    }

    const settingsRaw = fs.readFileSync(settingsPath, "utf8");
    const settings = JSON.parse(settingsRaw) as { dataDirectory?: unknown };
    if (
      typeof settings.dataDirectory === "string" &&
      settings.dataDirectory.trim()
    ) {
      return settings.dataDirectory.trim();
    }
  } catch (error) {
    logger.error("Failed to resolve configured data directory:", error);
  }

  return defaultUserDataPath;
}

export function resolveUserDataFilePath(
  fileName: string,
  storageLabel: string,
): string {
  try {
    const userDataPath = app.getPath("userData");

    // Keep global settings in Electron's default userData folder so it can
    // always bootstrap custom data directory resolution for other files.
    if (fileName === GLOBAL_SETTINGS_FILE_NAME) {
      const globalSettingsPath = path.join(userDataPath, fileName);
      logger.debug(`${storageLabel} will be stored at:`, globalSettingsPath);
      return globalSettingsPath;
    }

    const configuredDataDirectory =
      resolveConfiguredDataDirectory(userDataPath);
    const resolvedPath = path.join(configuredDataDirectory, fileName);
    logger.debug(`${storageLabel} will be stored at:`, resolvedPath);
    return resolvedPath;
  } catch (error) {
    logger.error("Failed to get user data path:", error);
    const fallbackPath = path.join(process.cwd(), fileName);
    logger.debug(`Using fallback ${storageLabel} path:`, fallbackPath);
    return fallbackPath;
  }
}
