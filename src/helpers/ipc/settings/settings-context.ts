import { contextBridge, ipcRenderer } from "electron";
import { SETTINGS_CHANNELS } from "./settings-channels";
import type { BlockedWeek } from "../../../services/curriculum-database";

export function exposeSettingsAPI() {
  const settingsAPI = {
    getCurrentSchoolYear: () =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.GET_CURRENT_SCHOOL_YEAR),
    setCurrentSchoolYear: (schoolYear: string) =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.SET_CURRENT_SCHOOL_YEAR, schoolYear),
    getGlobalBlockedWeeks: (): Promise<BlockedWeek[]> =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.GET_GLOBAL_BLOCKED_WEEKS),
    setGlobalBlockedWeeks: (blockedWeeks: BlockedWeek[]) =>
      ipcRenderer.invoke(
        SETTINGS_CHANNELS.SET_GLOBAL_BLOCKED_WEEKS,
        blockedWeeks,
      ),
  };

  contextBridge.exposeInMainWorld("settingsAPI", settingsAPI);
}
