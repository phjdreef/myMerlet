import { app } from "electron";
import path from "path";
import { logger } from "../utils/logger";

export function resolveUserDataFilePath(
  fileName: string,
  storageLabel: string,
): string {
  try {
    const userDataPath = app.getPath("userData");
    const resolvedPath = path.join(userDataPath, fileName);
    logger.debug(`${storageLabel} will be stored at:`, resolvedPath);
    return resolvedPath;
  } catch (error) {
    logger.error("Failed to get user data path:", error);
    const fallbackPath = path.join(process.cwd(), fileName);
    logger.debug(`Using fallback ${storageLabel} path:`, fallbackPath);
    return fallbackPath;
  }
}
