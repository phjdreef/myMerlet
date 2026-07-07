import { ipcMain } from "electron";
import { STUDENT_DB_CHANNELS } from "./studentdb-channels";
import {
  mainStudentDB,
  type Student,
  type StudentPropertyDefinition,
  type StudentPropertyValue,
  type StudentNote,
  type ClassroomLayoutData,
} from "../../../services/main-student-database";
import { withIpcData, withIpcVoid } from "../ipc-handler-utils";

export function addStudentDBEventListeners() {
  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_STUDENTS,
    async (_, students: Student[]) =>
      withIpcVoid(
        () => mainStudentDB.saveStudents(students),
        "Failed to save students",
      ),
  );

  ipcMain.handle(STUDENT_DB_CHANNELS.GET_ALL_STUDENTS, async () =>
    withIpcData(() => mainStudentDB.getAllStudents(), "Failed to get students"),
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SEARCH_STUDENTS,
    async (_, query: string) =>
      withIpcData(
        () => mainStudentDB.searchStudents(query),
        "Failed to search students",
      ),
  );

  ipcMain.handle(STUDENT_DB_CHANNELS.GET_METADATA, async () =>
    withIpcData(() => mainStudentDB.getMetadata(), "Failed to get metadata"),
  );

  ipcMain.handle(STUDENT_DB_CHANNELS.CLEAR_ALL_DATA, async () =>
    withIpcVoid(() => mainStudentDB.clearAllData(), "Failed to clear data"),
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_PHOTO,
    async (_, studentId: number, photoData: string) =>
      withIpcVoid(
        () => mainStudentDB.savePhoto(studentId, photoData),
        "Failed to save photo",
      ),
  );

  ipcMain.handle(STUDENT_DB_CHANNELS.GET_PHOTO, async (_, studentId: number) =>
    withIpcData(() => mainStudentDB.getPhoto(studentId), "Failed to get photo"),
  );

  // Property Definitions
  ipcMain.handle(
    STUDENT_DB_CHANNELS.GET_PROPERTY_DEFINITIONS,
    async (_, className: string, schoolYear: string) =>
      withIpcData(
        () => mainStudentDB.getPropertyDefinitions(className, schoolYear),
        "Failed to get property definitions",
      ),
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_PROPERTY_DEFINITION,
    async (_, property: StudentPropertyDefinition) =>
      withIpcVoid(
        () => mainStudentDB.savePropertyDefinition(property),
        "Failed to save property definition",
      ),
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.DELETE_PROPERTY_DEFINITION,
    async (_, propertyId: string) =>
      withIpcVoid(
        () => mainStudentDB.deletePropertyDefinition(propertyId),
        "Failed to delete property definition",
      ),
  );

  // Property Values
  ipcMain.handle(
    STUDENT_DB_CHANNELS.GET_PROPERTY_VALUES,
    async (_, studentId: number, className: string, schoolYear: string) =>
      withIpcData(
        () => mainStudentDB.getPropertyValues(studentId, className, schoolYear),
        "Failed to get property values",
      ),
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.GET_PROPERTY_VALUES_BATCH,
    async (_, studentIds: number[], className: string, schoolYear: string) =>
      withIpcData(
        () =>
          mainStudentDB.getPropertyValuesBatch(
            studentIds,
            className,
            schoolYear,
          ),
        "Failed to get property values batch",
      ),
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_PROPERTY_VALUE,
    async (_, value: StudentPropertyValue) =>
      withIpcVoid(
        () => mainStudentDB.savePropertyValue(value),
        "Failed to save property value",
      ),
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_PROPERTY_VALUES_BULK,
    async (_, values: StudentPropertyValue[]) =>
      withIpcVoid(
        () => mainStudentDB.savePropertyValuesBulk(values),
        "Failed to save property values in bulk",
      ),
  );

  // Notes
  ipcMain.handle(
    STUDENT_DB_CHANNELS.GET_NOTE,
    async (_, studentId: number, className: string, schoolYear: string) =>
      withIpcData(
        () => mainStudentDB.getNote(studentId, className, schoolYear),
        "Failed to get note",
      ),
  );

  ipcMain.handle(STUDENT_DB_CHANNELS.SAVE_NOTE, async (_, note: StudentNote) =>
    withIpcVoid(() => mainStudentDB.saveNote(note), "Failed to save note"),
  );

  // Classroom layout storage
  ipcMain.handle(STUDENT_DB_CHANNELS.GET_CLASSROOM_LAYOUT_DATA, async () =>
    withIpcData(
      () => mainStudentDB.getClassroomLayoutData(),
      "Failed to get classroom layout data",
    ),
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_CLASSROOM_LAYOUT_DATA,
    async (_, layoutData: ClassroomLayoutData) =>
      withIpcVoid(
        () => mainStudentDB.saveClassroomLayoutData(layoutData),
        "Failed to save classroom layout data",
      ),
  );
}
