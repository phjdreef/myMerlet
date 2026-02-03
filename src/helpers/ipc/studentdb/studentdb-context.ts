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
  // Property Definitions
  getPropertyDefinitions: (className: string, schoolYear: string) =>
    ipcRenderer.invoke(
      STUDENT_DB_CHANNELS.GET_PROPERTY_DEFINITIONS,
      className,
      schoolYear,
    ),
  savePropertyDefinition: (property: unknown) =>
    ipcRenderer.invoke(STUDENT_DB_CHANNELS.SAVE_PROPERTY_DEFINITION, property),
  deletePropertyDefinition: (propertyId: string) =>
    ipcRenderer.invoke(
      STUDENT_DB_CHANNELS.DELETE_PROPERTY_DEFINITION,
      propertyId,
    ),
  // Property Values
  getPropertyValues: (
    studentId: number,
    className: string,
    schoolYear: string,
  ) =>
    ipcRenderer.invoke(
      STUDENT_DB_CHANNELS.GET_PROPERTY_VALUES,
      studentId,
      className,
      schoolYear,
    ),
  savePropertyValue: (value: unknown) =>
    ipcRenderer.invoke(STUDENT_DB_CHANNELS.SAVE_PROPERTY_VALUE, value),
  // Notes
  getNote: (studentId: number, className: string, schoolYear: string) =>
    ipcRenderer.invoke(
      STUDENT_DB_CHANNELS.GET_NOTE,
      studentId,
      className,
      schoolYear,
    ),
  saveNote: (note: unknown) =>
    ipcRenderer.invoke(STUDENT_DB_CHANNELS.SAVE_NOTE, note),
};

contextBridge.exposeInMainWorld("studentDBAPI", studentDBAPI);
