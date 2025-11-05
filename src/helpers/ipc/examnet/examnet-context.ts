/**
 * Context bridge for exam.net API
 * Exposes exam.net API methods to the renderer process
 */
import { contextBridge, ipcRenderer } from "electron";
import { EXAMNET_CHANNELS } from "./examnet-channels";

export function exposeExamnetAPI() {
  contextBridge.exposeInMainWorld("examnetAPI", {
    login: (username: string, password: string) =>
      ipcRenderer.invoke(EXAMNET_CHANNELS.LOGIN, username, password),
    logout: () => ipcRenderer.invoke(EXAMNET_CHANNELS.LOGOUT),
    getTests: () => ipcRenderer.invoke(EXAMNET_CHANNELS.GET_TESTS),
    getTestResults: (testId: string) =>
      ipcRenderer.invoke(EXAMNET_CHANNELS.GET_TEST_RESULTS, testId),
    getStudents: () => ipcRenderer.invoke(EXAMNET_CHANNELS.GET_STUDENTS),
    syncData: () => ipcRenderer.invoke(EXAMNET_CHANNELS.SYNC_DATA),
  });
}
