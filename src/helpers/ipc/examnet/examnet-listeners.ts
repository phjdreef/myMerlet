/**
 * IPC event listeners for exam.net API
 */
import { ipcMain } from "electron";
import { EXAMNET_CHANNELS } from "./examnet-channels";
import { examnetAPI } from "../../../services/examnet-api";

export function addExamnetEventListeners() {
  // Login to exam.net (opens BrowserWindow for manual authentication)
  ipcMain.handle(EXAMNET_CHANNELS.LOGIN, async () => {
    try {
      const result = await examnetAPI.login();
      // Result already has { success, message } from authenticate()
      return {
        success: result.success,
        error: result.success ? undefined : result.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  });

  // Logout from exam.net
  ipcMain.handle(EXAMNET_CHANNELS.LOGOUT, async () => {
    try {
      await examnetAPI.logout();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed",
      };
    }
  });

  // Get all tests from exam.net
  ipcMain.handle(EXAMNET_CHANNELS.GET_TESTS, async () => {
    try {
      const tests = await examnetAPI.getTests();
      return { success: true, data: tests };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tests",
      };
    }
  });

  // Get test results
  ipcMain.handle(
    EXAMNET_CHANNELS.GET_TEST_RESULTS,
    async (_event, testId: string) => {
      try {
        const results = await examnetAPI.getTestResults(testId);
        return { success: true, data: results };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch test results",
        };
      }
    },
  );

  // Get students
  ipcMain.handle(EXAMNET_CHANNELS.GET_STUDENTS, async () => {
    try {
      const students = await examnetAPI.getStudents();
      return { success: true, data: students };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch students",
      };
    }
  });

  // Sync all data
  ipcMain.handle(EXAMNET_CHANNELS.SYNC_DATA, async () => {
    try {
      console.log("[IPC] Sync data request received");
      const result = await examnetAPI.syncData();
      console.log("[IPC] Sync data completed successfully");
      return { success: true, data: result };
    } catch (error) {
      console.error("[IPC] Sync data failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync data",
      };
    }
  });
}
