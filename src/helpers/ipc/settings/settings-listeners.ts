import { ipcMain } from "electron";
import { SETTINGS_CHANNELS } from "./settings-channels";
import { globalSettings } from "../../../services/global-settings";
import type { BlockedWeek } from "../../../services/curriculum-database";

export function registerSettingsListeners() {
  ipcMain.handle(SETTINGS_CHANNELS.GET_CURRENT_SCHOOL_YEAR, async () => {
    try {
      const schoolYear = await globalSettings.getCurrentSchoolYear();
      return schoolYear;
    } catch (error) {
      console.error("Failed to get current school year:", error);
      throw error;
    }
  });

  ipcMain.handle(
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

  ipcMain.handle(SETTINGS_CHANNELS.GET_GLOBAL_BLOCKED_WEEKS, async () => {
    try {
      const blockedWeeks = await globalSettings.getGlobalBlockedWeeks();
      return blockedWeeks;
    } catch (error) {
      console.error("Failed to get global blocked weeks:", error);
      throw error;
    }
  });

  ipcMain.handle(
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
}
