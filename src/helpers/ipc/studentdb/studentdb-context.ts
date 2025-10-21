import { contextBridge, ipcRenderer } from "electron";
import { STUDENT_DB_CHANNELS } from "./studentdb-channels";

export const studentDBAPI = {
  saveStudents: (students: unknown[]) =>
    ipcRenderer.invoke(STUDENT_DB_CHANNELS.SAVE_STUDENTS, students),
  getAllStudents: () =>
    ipcRenderer.invoke(STUDENT_DB_CHANNELS.GET_ALL_STUDENTS),
  searchStudents: (query: string) =>
    ipcRenderer.invoke(STUDENT_DB_CHANNELS.SEARCH_STUDENTS, query),
  getMetadata: () => ipcRenderer.invoke(STUDENT_DB_CHANNELS.GET_METADATA),
  clearAllData: () => ipcRenderer.invoke(STUDENT_DB_CHANNELS.CLEAR_ALL_DATA),
  savePhoto: (studentId: number, photoData: string) =>
    ipcRenderer.invoke(STUDENT_DB_CHANNELS.SAVE_PHOTO, studentId, photoData),
  getPhoto: (studentId: number) =>
    ipcRenderer.invoke(STUDENT_DB_CHANNELS.GET_PHOTO, studentId),
};

contextBridge.exposeInMainWorld("studentDBAPI", studentDBAPI);
