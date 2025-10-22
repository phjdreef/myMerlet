import { ipcMain } from "electron";
import { STUDENT_DB_CHANNELS } from "./studentdb-channels";
import {
  mainStudentDB,
  type Student,
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
    async (_, externeId: string, photoData: string) => {
      try {
        await mainStudentDB.savePhoto(externeId, photoData);
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
    async (_, externeId: string) => {
      try {
        const photo = await mainStudentDB.getPhoto(externeId);
        return { success: true, data: photo };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get photo",
        };
      }
    },
  );
}
