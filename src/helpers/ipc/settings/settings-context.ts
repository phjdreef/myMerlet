import { contextBridge, ipcRenderer } from "electron";
import { SETTINGS_CHANNELS } from "./settings-channels";

export function exposeSettingsAPI() {
  const settingsAPI = {
    getCurrentSchoolYear: () =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.GET_CURRENT_SCHOOL_YEAR),
    setCurrentSchoolYear: (schoolYear: string) =>
      ipcRenderer.invoke(SETTINGS_CHANNELS.SET_CURRENT_SCHOOL_YEAR, schoolYear),
  };

  contextBridge.exposeInMainWorld("settingsAPI", settingsAPI);
}
