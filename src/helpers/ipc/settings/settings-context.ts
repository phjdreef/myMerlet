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
    getDataDirectory: (): Promise<string | undefined> =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.GET_DATA_DIRECTORY),
    getDefaultDataDirectory: (): Promise<string> =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.GET_DEFAULT_DATA_DIRECTORY),
    chooseDataDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.CHOOSE_DATA_DIRECTORY),
    setDataDirectory: (directory?: string) =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.SET_DATA_DIRECTORY, directory),
  };

  contextBridge.exposeInMainWorld("settingsAPI", settingsAPI);
}
