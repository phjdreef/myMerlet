import { ipcMain } from "electron";
import { SETTINGS_CHANNELS } from "./settings-channels";
import { globalSettings } from "../../../services/global-settings";

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
}
