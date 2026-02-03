import { ipcMain } from "electron";
import { STUDENT_DB_CHANNELS } from "./studentdb-channels";
import {
  mainStudentDB,
  type Student,
  type StudentPropertyDefinition,
  type StudentPropertyValue,
  type StudentNote,
} from "../../../services/main-student-database";

export function addStudentDBEventListeners() {
  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_STUDENTS,
    async (_, students: Student[]) => {
      try {
        await mainStudentDB.saveStudents(students);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to save students",
        };
      }
    },
  );

  ipcMain.handle(STUDENT_DB_CHANNELS.GET_ALL_STUDENTS, async () => {
    try {
      const students = await mainStudentDB.getAllStudents();
      return { success: true, data: students };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get students",
      };
    }
  });

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SEARCH_STUDENTS,
    async (_, query: string) => {
      try {
        const students = await mainStudentDB.searchStudents(query);
        return { success: true, data: students };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to search students",
        };
      }
    },
  );

  ipcMain.handle(STUDENT_DB_CHANNELS.GET_METADATA, async () => {
    try {
      const metadata = await mainStudentDB.getMetadata();
      return { success: true, data: metadata };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get metadata",
      };
    }
  });

  ipcMain.handle(STUDENT_DB_CHANNELS.CLEAR_ALL_DATA, async () => {
    try {
      await mainStudentDB.clearAllData();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear data",
      };
    }
  });

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_PHOTO,
    async (_, studentId: number, photoData: string) => {
      try {
        await mainStudentDB.savePhoto(studentId, photoData);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to save photo",
        };
      }
    },
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.GET_PHOTO,
    async (_, studentId: number) => {
      try {
        const photo = await mainStudentDB.getPhoto(studentId);
        return { success: true, data: photo };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get photo",
        };
      }
    },
  );

  // Property Definitions
  ipcMain.handle(
    STUDENT_DB_CHANNELS.GET_PROPERTY_DEFINITIONS,
    async (_, className: string, schoolYear: string) => {
      try {
        const definitions = await mainStudentDB.getPropertyDefinitions(
          className,
          schoolYear,
        );
        return { success: true, data: definitions };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get property definitions",
        };
      }
    },
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_PROPERTY_DEFINITION,
    async (_, property: StudentPropertyDefinition) => {
      try {
        await mainStudentDB.savePropertyDefinition(property);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to save property definition",
        };
      }
    },
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.DELETE_PROPERTY_DEFINITION,
    async (_, propertyId: string) => {
      try {
        await mainStudentDB.deletePropertyDefinition(propertyId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete property definition",
        };
      }
    },
  );

  // Property Values
  ipcMain.handle(
    STUDENT_DB_CHANNELS.GET_PROPERTY_VALUES,
    async (
      _,
      studentId: number,
      className: string,
      schoolYear: string,
    ) => {
      try {
        const values = await mainStudentDB.getPropertyValues(
          studentId,
          className,
          schoolYear,
        );
        return { success: true, data: values };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get property values",
        };
      }
    },
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_PROPERTY_VALUE,
    async (_, value: StudentPropertyValue) => {
      try {
        await mainStudentDB.savePropertyValue(value);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to save property value",
        };
      }
    },
  );

  // Notes
  ipcMain.handle(
    STUDENT_DB_CHANNELS.GET_NOTE,
    async (
      _,
      studentId: number,
      className: string,
      schoolYear: string,
    ) => {
      try {
        const note = await mainStudentDB.getNote(
          studentId,
          className,
          schoolYear,
        );
        return { success: true, data: note };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get note",
        };
      }
    },
  );

  ipcMain.handle(
    STUDENT_DB_CHANNELS.SAVE_NOTE,
    async (_, note: StudentNote) => {
      try {
        await mainStudentDB.saveNote(note);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to save note",
        };
      }
    },
  );
}
