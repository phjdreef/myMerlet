import { contextBridge, ipcRenderer } from "electron";
import { TEST_CHANNELS } from "./test-channels";
import type {
  Test,
  StudentGrade,
  TestStatistics,
  CompositeElementGrade,
} from "../../../services/test-database";

export interface TestAPI {
  // Test operations
  getTestsForClassGroup: (
    classGroup: string,
  ) => Promise<{ success: boolean; data?: Test[]; error?: string }>;
  getAllTests: () => Promise<{
    success: boolean;
    data?: Test[];
    error?: string;
  }>;
  getTest: (
    testId: string,
  ) => Promise<{ success: boolean; data?: Test; error?: string }>;
  createTest: (
    test: Omit<Test, "id" | "createdAt" | "updatedAt">,
  ) => Promise<{ success: boolean; data?: Test; error?: string }>;
  updateTest: (
    testId: string,
    updates: Partial<Test>,
  ) => Promise<{ success: boolean; data?: Test; error?: string }>;
  deleteTest: (testId: string) => Promise<{ success: boolean; error?: string }>;

  // Grade operations
  getGradesForTest: (
    testId: string,
  ) => Promise<{ success: boolean; data?: StudentGrade[]; error?: string }>;
  getGradesForStudent: (
    studentId: number,
    classGroup: string,
  ) => Promise<{ success: boolean; data?: StudentGrade[]; error?: string }>;
  saveGrade: (
    testId: string,
    studentId: number,
    pointsEarned: number,
    manualOverride?: number,
  ) => Promise<{ success: boolean; data?: StudentGrade; error?: string }>;
  saveCompositeGrade: (
    testId: string,
    studentId: number,
    elementGrades: CompositeElementGrade[],
    manualOverride?: number,
  ) => Promise<{ success: boolean; data?: StudentGrade; error?: string }>;
  getTestStatistics: (
    testId: string,
    classGroup?: string,
  ) => Promise<{ success: boolean; data?: TestStatistics; error?: string }>;
}

export function exposeTestAPI() {
  const testAPI: TestAPI = {
    getTestsForClassGroup: (classGroup: string) =>
      ipcRenderer.invoke(TEST_CHANNELS.GET_TESTS_FOR_CLASS, classGroup),
    getAllTests: () => ipcRenderer.invoke(TEST_CHANNELS.GET_ALL_TESTS),
    getTest: (testId: string) =>
      ipcRenderer.invoke(TEST_CHANNELS.GET_TEST, testId),
    createTest: (test) => ipcRenderer.invoke(TEST_CHANNELS.CREATE_TEST, test),
    updateTest: (testId: string, updates: Partial<Test>) =>
      ipcRenderer.invoke(TEST_CHANNELS.UPDATE_TEST, testId, updates),
    deleteTest: (testId: string) =>
      ipcRenderer.invoke(TEST_CHANNELS.DELETE_TEST, testId),
    getGradesForTest: (testId: string) =>
      ipcRenderer.invoke(TEST_CHANNELS.GET_GRADES_FOR_TEST, testId),
    getGradesForStudent: (studentId: number, classGroup: string) =>
      ipcRenderer.invoke(
        TEST_CHANNELS.GET_GRADES_FOR_STUDENT,
        studentId,
        classGroup,
      ),
    saveGrade: (
      testId: string,
      studentId: number,
      pointsEarned: number,
      manualOverride?: number,
    ) =>
      ipcRenderer.invoke(
        TEST_CHANNELS.SAVE_GRADE,
        testId,
        studentId,
        pointsEarned,
        manualOverride,
      ),
    saveCompositeGrade: (
      testId: string,
      studentId: number,
      elementGrades: CompositeElementGrade[],
      manualOverride?: number,
    ) =>
      ipcRenderer.invoke(
        TEST_CHANNELS.SAVE_COMPOSITE_GRADE,
        testId,
        studentId,
        elementGrades,
        manualOverride,
      ),
    getTestStatistics: (testId: string, classGroup?: string) =>
      ipcRenderer.invoke(TEST_CHANNELS.GET_TEST_STATISTICS, testId, classGroup),
  };

  contextBridge.exposeInMainWorld("testAPI", testAPI);
}
