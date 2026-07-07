import { contextBridge, ipcRenderer } from "electron";
import { MAGISTER_CHANNELS } from "./magister-channels";

export const magisterAPI = {
  authenticate: () => ipcRenderer.invoke(MAGISTER_CHANNELS.AUTHENTICATE),
  getTodayInfo: () => ipcRenderer.invoke(MAGISTER_CHANNELS.GET_TODAY_INFO),
  getUserInfo: () => ipcRenderer.invoke(MAGISTER_CHANNELS.GET_USER_INFO),
  logout: () => ipcRenderer.invoke(MAGISTER_CHANNELS.LOGOUT),
  isAuthenticated: () => ipcRenderer.invoke(MAGISTER_CHANNELS.IS_AUTHENTICATED),
  testAPI: () => ipcRenderer.invoke(MAGISTER_CHANNELS.TEST_API),
  getAllStudents: (teacherNameFilter?: string) =>
    ipcRenderer.invoke(MAGISTER_CHANNELS.GET_ALL_STUDENTS, teacherNameFilter),
  clearToken: () => ipcRenderer.invoke(MAGISTER_CHANNELS.CLEAR_TOKEN),
  fetchStudentPhoto: (studentId: number, photoHref?: string) =>
    ipcRenderer.invoke(
      MAGISTER_CHANNELS.FETCH_STUDENT_PHOTO,
      studentId,
      photoHref,
    ),
};

contextBridge.exposeInMainWorld("magisterAPI", magisterAPI);
