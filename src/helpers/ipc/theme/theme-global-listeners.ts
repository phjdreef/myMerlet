import { globalSettings } from "../../../services/global-settings";
import { ipcMain } from "electron";

export const THEME_GET_GLOBAL_CHANNEL = "theme:get-global";
export const THEME_SET_GLOBAL_CHANNEL = "theme:set-global";

export function addThemeGlobalSettingsListeners() {
  // Ensure settings are initialized in the main process only
  globalSettings.init().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize global settings:", error);
  });
  ipcMain.handle(THEME_GET_GLOBAL_CHANNEL, async () => {
    return await globalSettings.getTheme();
  });
  ipcMain.handle(THEME_SET_GLOBAL_CHANNEL, async (_event, theme) => {
    await globalSettings.setTheme(theme);
    return true;
  });
}
