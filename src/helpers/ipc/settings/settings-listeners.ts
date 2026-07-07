import { app, dialog, ipcMain } from "electron";
import { copyFile, mkdir, readdir, stat } from "fs/promises";
import path from "path";
import { SETTINGS_CHANNELS } from "./settings-channels";
import { globalSettings } from "../../../services/global-settings";
import type { BlockedWeek } from "../../../services/curriculum-database";

const GLOBAL_SETTINGS_FILE = "global_settings.json";

async function copyDirectoryContents(
  sourceDir: string,
  targetDir: string,
): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === GLOBAL_SETTINGS_FILE) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyDirectoryContents(sourcePath, targetPath);
      continue;
    }

    const targetExists = await stat(targetPath)
      .then(() => true)
      .catch(() => false);

    // Never overwrite existing files in the target directory.
    if (!targetExists) {
      await copyFile(sourcePath, targetPath);
    }
  }
}

export function registerSettingsListeners() {
  const registerHandle = (
    channel: string,
    handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => unknown,
  ) => {
    // Allow safe re-registration during dev reloads or when windows are recreated.
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, handler);
  };

  registerHandle(SETTINGS_CHANNELS.GET_CURRENT_SCHOOL_YEAR, async () => {
    try {
      const schoolYear = await globalSettings.getCurrentSchoolYear();
      return schoolYear;
    } catch (error) {
      console.error("Failed to get current school year:", error);
      throw error;
    }
  });

  registerHandle(
    SETTINGS_CHANNELS.SET_CURRENT_SCHOOL_YEAR,
    async (_event, schoolYear: string) => {
      try {
        await globalSettings.setCurrentSchoolYear(schoolYear);
      } catch (error) {
        console.error("Failed to set current school year:", error);
        throw error;
      }
    },
  );

  registerHandle(SETTINGS_CHANNELS.GET_GLOBAL_BLOCKED_WEEKS, async () => {
    try {
      const blockedWeeks = await globalSettings.getGlobalBlockedWeeks();
      return blockedWeeks;
    } catch (error) {
      console.error("Failed to get global blocked weeks:", error);
      throw error;
    }
  });

  registerHandle(
    SETTINGS_CHANNELS.SET_GLOBAL_BLOCKED_WEEKS,
    async (_event, blockedWeeks: BlockedWeek[]) => {
      try {
        await globalSettings.setGlobalBlockedWeeks(blockedWeeks);
      } catch (error) {
        console.error("Failed to set global blocked weeks:", error);
        throw error;
      }
    },
  );

  registerHandle(SETTINGS_CHANNELS.GET_DATA_DIRECTORY, async () => {
    try {
      return await globalSettings.getDataDirectory();
    } catch (error) {
      console.error("Failed to get data directory:", error);
      throw error;
    }
  });

  registerHandle(SETTINGS_CHANNELS.GET_DEFAULT_DATA_DIRECTORY, async () => {
    try {
      return app.getPath("userData");
    } catch (error) {
      console.error("Failed to get default data directory:", error);
      throw error;
    }
  });

  registerHandle(SETTINGS_CHANNELS.CHOOSE_DATA_DIRECTORY, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0] ?? null;
    } catch (error) {
      console.error("Failed to choose data directory:", error);
      throw error;
    }
  });

  registerHandle(
    SETTINGS_CHANNELS.SET_DATA_DIRECTORY,
    async (_event, directory?: string) => {
      try {
        const normalizedDirectory = directory?.trim();
        const previousCustomDirectory = await globalSettings.getDataDirectory();
        const sourceDirectory =
          previousCustomDirectory || app.getPath("userData");

        if (normalizedDirectory) {
          await mkdir(normalizedDirectory, { recursive: true });

          const sameDirectory =
            path.resolve(sourceDirectory) === path.resolve(normalizedDirectory);

          if (!sameDirectory) {
            await copyDirectoryContents(sourceDirectory, normalizedDirectory);
          }
        }

        await globalSettings.setDataDirectory(normalizedDirectory);
      } catch (error) {
        console.error("Failed to set data directory:", error);
        throw error;
      }
    },
  );
}
