import {
  THEME_GET_GLOBAL_CHANNEL,
  THEME_SET_GLOBAL_CHANNEL,
} from "./theme-global-listeners";

export function exposeThemeGlobalSettings() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  contextBridge.exposeInMainWorld("themeGlobal", {
    get: () => ipcRenderer.invoke(THEME_GET_GLOBAL_CHANNEL),
    set: (
      theme:
        | "system"
        | "twitter"
        | "graphite"
        | "nord"
        | "dracula"
        | "solarized",
    ) => ipcRenderer.invoke(THEME_SET_GLOBAL_CHANNEL, theme),
  });
}
