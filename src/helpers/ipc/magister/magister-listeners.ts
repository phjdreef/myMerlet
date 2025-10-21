import { ipcMain } from "electron";
import { MAGISTER_CHANNELS } from "./magister-channels";
import { magisterAPI } from "../../../services/magister-api";

export function addMagisterEventListeners() {
  ipcMain.handle(MAGISTER_CHANNELS.AUTHENTICATE, async () => {
    try {
      const authData = await magisterAPI.instance.authenticate();
      return { success: true, data: authData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  });

  ipcMain.handle(MAGISTER_CHANNELS.GET_TODAY_INFO, async () => {
    try {
      const todayInfo = await magisterAPI.instance.getTodayInfo();
      return { success: true, data: todayInfo };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch today info",
      };
    }
  });

  ipcMain.handle(MAGISTER_CHANNELS.GET_USER_INFO, async () => {
    try {
      const userInfo = await magisterAPI.instance.getUserInfo();
      return { success: true, data: userInfo };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch user info",
      };
    }
  });

  ipcMain.handle(MAGISTER_CHANNELS.LOGOUT, async () => {
    try {
      await magisterAPI.instance.logout();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed",
      };
    }
  });

  ipcMain.handle(MAGISTER_CHANNELS.IS_AUTHENTICATED, async () => {
    try {
      const isAuth = await magisterAPI.instance.isAuthenticated();
      return { success: true, data: isAuth };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check auth status",
      };
    }
  });

  ipcMain.handle(MAGISTER_CHANNELS.TEST_API, async () => {
    try {
      const testResult = await magisterAPI.instance.testAPI();
      return testResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "API test failed",
      };
    }
  });

  ipcMain.handle(MAGISTER_CHANNELS.GET_ALL_STUDENTS, async () => {
    try {
      const studentsResult = await magisterAPI.instance.getAllStudents();
      return studentsResult;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch all students",
      };
    }
  });

  ipcMain.handle(MAGISTER_CHANNELS.CLEAR_TOKEN, async () => {
    try {
      await magisterAPI.instance.clearToken();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear token",
      };
    }
  });

  ipcMain.handle(
    MAGISTER_CHANNELS.FETCH_STUDENT_PHOTO,
    async (_, studentId: number) => {
      try {
        const result = await magisterAPI.instance.fetchStudentPhoto(studentId);
        return result;
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch student photo",
        };
      }
    },
  );
}
