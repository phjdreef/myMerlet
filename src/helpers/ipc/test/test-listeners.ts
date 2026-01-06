import { ipcMain } from "electron";
import { app } from "electron";
import { TEST_CHANNELS } from "./test-channels";
import type {
  Test,
  StudentGrade,
  TestStatistics,
  CompositeElementGrade,
} from "../../../services/test-database";
import {
  calculateCompositeGrade,
  calculateCvTEGrade,
  roundGrade,
} from "../../../services/test-database";
import { globalSettings } from "../../../services/global-settings";
import * as fs from "fs";
import * as path from "path";

// File-based storage paths
const getTestsFilePath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "tests.json");
};

const getGradesFilePath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "grades.json");
};

// Utility functions for file operations
function readJSONFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJSONFile<T>(filePath: string, data: T): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

type StoredTestRecord = Omit<Test, "classGroups"> & {
  classGroups?: string[];
  classNames?: string[]; // legacy support
  className?: string; // legacy single value
};

const sanitizeClassGroups = (
  classGroups?: string[],
  legacyClassNames?: string[],
  legacySingle?: string,
): string[] => {
  const aggregated: string[] = [];

  if (Array.isArray(classGroups)) {
    aggregated.push(...classGroups);
  }
  if (Array.isArray(legacyClassNames)) {
    aggregated.push(...legacyClassNames);
  }
  if (legacySingle) {
    aggregated.push(legacySingle);
  }

  return Array.from(
    new Set(
      aggregated
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
};

const normalizeTestRecord = (test: StoredTestRecord): Test => {
  const classGroups = sanitizeClassGroups(
    test.classGroups,
    test.classNames,
    test.className,
  );

  return {
    ...test,
    classGroups,
  } as Test;
};

const readTests = (): Test[] => {
  const storedTests = readJSONFile<StoredTestRecord[]>(getTestsFilePath(), []);
  return storedTests.map(normalizeTestRecord);
};

const writeTests = (tests: Test[]): void => {
  const normalized = tests.map((test) => {
    const classGroups = sanitizeClassGroups(test.classGroups);
    const [primary] = classGroups;
    return {
      ...test,
      classGroups,
      classNames: classGroups, // keep legacy field for backward compatibility
      className: primary,
    } as StoredTestRecord;
  });

  writeJSONFile(getTestsFilePath(), normalized);
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function registerTestListeners() {
  // Get all tests for a class
  ipcMain.handle(
    TEST_CHANNELS.GET_TESTS_FOR_CLASS,
    async (_event, classGroup: string) => {
      try {
        const tests = readTests();
        const currentSchoolYear = await globalSettings.getCurrentSchoolYear();
        const classTests = tests.filter(
          (test) =>
            test.classGroups.includes(classGroup) &&
            test.schoolYear === currentSchoolYear,
        );
        return { success: true, data: classTests };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle(TEST_CHANNELS.GET_ALL_TESTS, async () => {
    try {
      const tests = readTests();
      const currentSchoolYear = await globalSettings.getCurrentSchoolYear();
      const filteredTests = tests.filter(
        (test) => test.schoolYear === currentSchoolYear,
      );
      return { success: true, data: filteredTests };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get a single test
  ipcMain.handle(TEST_CHANNELS.GET_TEST, async (_event, testId: string) => {
    try {
      const tests = readTests();
      const test = tests.find((t) => t.id === testId);
      if (!test) {
        return { success: false, error: "Test not found" };
      }
      return { success: true, data: test };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Create a new test
  ipcMain.handle(
    TEST_CHANNELS.CREATE_TEST,
    async (_event, testData: Omit<Test, "id" | "createdAt" | "updatedAt">) => {
      try {
        const tests = readTests();
        const incoming = testData as StoredTestRecord;
        const classGroups = sanitizeClassGroups(
          incoming.classGroups,
          incoming.classNames,
          incoming.className,
        );

        if (classGroups.length === 0) {
          return { success: false, error: "At least one class is required" };
        }

        const newTest: Test = {
          ...testData,
          classGroups,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        tests.push(newTest);
        writeTests(tests);
        return { success: true, data: newTest };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  // Update a test
  ipcMain.handle(
    TEST_CHANNELS.UPDATE_TEST,
    async (_event, testId: string, updates: Partial<Test>) => {
      try {
        const tests = readTests();
        const testIndex = tests.findIndex((t) => t.id === testId);
        if (testIndex === -1) {
          return { success: false, error: "Test not found" };
        }
        const mergedRecord: StoredTestRecord = {
          ...tests[testIndex],
          ...updates,
          id: testId,
          updatedAt: new Date().toISOString(),
        };

        const sanitizedGroups = sanitizeClassGroups(
          updates.classGroups ?? mergedRecord.classGroups,
          undefined,
          undefined,
        );

        const updatedRecord: StoredTestRecord = {
          ...mergedRecord,
          classGroups: sanitizedGroups,
          classNames: sanitizedGroups,
          className: sanitizedGroups[0],
        };

        const updatedTest = normalizeTestRecord(updatedRecord);
        tests[testIndex] = updatedTest;
        writeTests(tests);

        // Recalculate all grades linked to this test so the final grade aligns
        // with the updated settings (n-term, weights, etc.).
        const grades = readJSONFile<StudentGrade[]>(getGradesFilePath(), []);
        let hasGradeUpdates = false;
        const now = new Date().toISOString();

        const recalculatedGrades = grades.map((grade) => {
          if (grade.testId !== testId) {
            return grade;
          }

          const nextGrade: StudentGrade = {
            ...grade,
            updatedAt: now,
          };

          if (updatedTest.testType === "cvte") {
            const maxPoints = toNumber(updatedTest.maxPoints) ?? 0;
            const nTerm = toNumber(updatedTest.nTerm) ?? 1;
            const pointsEarned = toNumber(grade.pointsEarned);
            const mode = updatedTest.cvteCalculationMode ?? "legacy";

            const calculatedRaw =
              maxPoints > 0 && pointsEarned !== undefined
                ? calculateCvTEGrade(pointsEarned, maxPoints, nTerm, mode)
                : 0;
            const calculated = Number.isFinite(calculatedRaw)
              ? calculatedRaw
              : 0;
            const manualOverride = toNumber(nextGrade.manualOverride);

            nextGrade.pointsEarned = pointsEarned;
            delete nextGrade.elementGrades;
            nextGrade.calculatedGrade = calculated;

            if (manualOverride !== undefined) {
              nextGrade.manualOverride = manualOverride;
              nextGrade.finalGrade = manualOverride;
            } else {
              delete nextGrade.manualOverride;
              nextGrade.finalGrade = roundGrade(calculated);
            }
          } else if (updatedTest.testType === "composite") {
            const elementGrades = grade.elementGrades ?? [];
            const elements = updatedTest.elements ?? [];
            const calculatedRaw = calculateCompositeGrade(
              elementGrades,
              elements,
              updatedTest.customFormula,
            );
            const calculated = Number.isFinite(calculatedRaw)
              ? calculatedRaw
              : 0;
            const manualOverride = toNumber(nextGrade.manualOverride);

            nextGrade.elementGrades = elementGrades;
            delete nextGrade.pointsEarned;
            nextGrade.calculatedGrade = calculated;

            if (manualOverride !== undefined) {
              nextGrade.manualOverride = manualOverride;
              nextGrade.finalGrade = manualOverride;
            } else {
              delete nextGrade.manualOverride;
              nextGrade.finalGrade = roundGrade(calculated);
            }
          }

          hasGradeUpdates = true;
          return nextGrade;
        });

        if (hasGradeUpdates) {
          writeJSONFile(getGradesFilePath(), recalculatedGrades);
        }

        return { success: true, data: updatedTest };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  // Delete a test
  ipcMain.handle(TEST_CHANNELS.DELETE_TEST, async (_event, testId: string) => {
    try {
      const tests = readTests();
      const filteredTests = tests.filter((t) => t.id !== testId);
      if (filteredTests.length === tests.length) {
        return { success: false, error: "Test not found" };
      }
      writeTests(filteredTests);

      // Also delete associated grades
      const grades = readJSONFile<StudentGrade[]>(getGradesFilePath(), []);
      const filteredGrades = grades.filter((g) => g.testId !== testId);
      writeJSONFile(getGradesFilePath(), filteredGrades);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get all grades for a test
  ipcMain.handle(
    TEST_CHANNELS.GET_GRADES_FOR_TEST,
    async (_event, testId: string) => {
      try {
        const grades = readJSONFile<StudentGrade[]>(getGradesFilePath(), []);
        const currentSchoolYear = await globalSettings.getCurrentSchoolYear();
        const testGrades = grades.filter(
          (grade) =>
            grade.testId === testId && grade.schoolYear === currentSchoolYear,
        );
        return { success: true, data: testGrades };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  // Get all grades for a student in a class
  ipcMain.handle(
    TEST_CHANNELS.GET_GRADES_FOR_STUDENT,
    async (_event, studentId: number, classGroup: string) => {
      try {
        const tests = readTests();
        const currentSchoolYear = await globalSettings.getCurrentSchoolYear();
        const classTests = tests.filter(
          (t) =>
            t.classGroups.includes(classGroup) &&
            t.schoolYear === currentSchoolYear,
        );
        const testIds = classTests.map((t) => t.id);

        const grades = readJSONFile<StudentGrade[]>(getGradesFilePath(), []);
        const studentGrades = grades.filter(
          (g) =>
            g.studentId === studentId &&
            testIds.includes(g.testId) &&
            g.schoolYear === currentSchoolYear,
        );
        return { success: true, data: studentGrades };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  // Save or update a grade
  ipcMain.handle(
    TEST_CHANNELS.SAVE_GRADE,
    async (
      _event,
      testId: string,
      studentId: number,
      pointsEarned: number,
      manualOverride?: number,
    ) => {
      try {
        // Get the test to access test type and properties
        const tests = readTests();
        const test = tests.find((t) => t.id === testId);
        if (!test) {
          return { success: false, error: "Test not found" };
        }

        let calculatedGrade = 0;

        // Calculate grade based on test type
        if (test.testType === "cvte") {
          // CvTE formula calculation
          if (test.maxPoints && test.nTerm !== undefined) {
            calculatedGrade = calculateCvTEGrade(
              pointsEarned,
              test.maxPoints,
              test.nTerm,
              test.cvteCalculationMode ?? "legacy",
            );
          }
        } else if (test.testType === "composite") {
          // Composite calculation - will be handled separately via a different IPC call
          calculatedGrade = 0; // Placeholder, actual calculation done client-side or via separate handler
        }

        const finalGrade =
          manualOverride !== undefined
            ? manualOverride
            : roundGrade(calculatedGrade);

        const grades = readJSONFile<StudentGrade[]>(getGradesFilePath(), []);
        const existingGradeIndex = grades.findIndex(
          (g) => g.testId === testId && g.studentId === studentId,
        );

        const gradeData: StudentGrade = {
          id:
            existingGradeIndex !== -1
              ? grades[existingGradeIndex].id
              : generateId(),
          testId,
          studentId,
          schoolYear: test.schoolYear,
          pointsEarned: test.testType === "cvte" ? pointsEarned : undefined,
          calculatedGrade,
          manualOverride,
          finalGrade,
          createdAt:
            existingGradeIndex !== -1
              ? grades[existingGradeIndex].createdAt
              : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingGradeIndex !== -1) {
          grades[existingGradeIndex] = gradeData;
        } else {
          grades.push(gradeData);
        }

        writeJSONFile(getGradesFilePath(), grades);
        return { success: true, data: gradeData };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  // Save or update a composite grade
  ipcMain.handle(
    TEST_CHANNELS.SAVE_COMPOSITE_GRADE,
    async (
      _event,
      testId: string,
      studentId: number,
      elementGrades: CompositeElementGrade[],
      manualOverride?: number,
    ) => {
      try {
        // Get the test to access elements
        const tests = readTests();
        const test = tests.find((t) => t.id === testId);
        if (!test) {
          return { success: false, error: "Test not found" };
        }

        if (test.testType !== "composite" || !test.elements) {
          return { success: false, error: "Test is not a composite test" };
        }

        // Calculate composite grade using custom formula if available
        const calculatedGrade = calculateCompositeGrade(
          elementGrades,
          test.elements,
          test.customFormula,
        );
        const finalGrade =
          manualOverride !== undefined
            ? manualOverride
            : roundGrade(calculatedGrade);

        const grades = readJSONFile<StudentGrade[]>(getGradesFilePath(), []);
        const existingGradeIndex = grades.findIndex(
          (g) => g.testId === testId && g.studentId === studentId,
        );

        const gradeData: StudentGrade = {
          id:
            existingGradeIndex !== -1
              ? grades[existingGradeIndex].id
              : generateId(),
          testId,
          studentId,
          schoolYear: test.schoolYear,
          elementGrades,
          calculatedGrade,
          manualOverride,
          finalGrade,
          createdAt:
            existingGradeIndex !== -1
              ? grades[existingGradeIndex].createdAt
              : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingGradeIndex !== -1) {
          grades[existingGradeIndex] = gradeData;
        } else {
          grades.push(gradeData);
        }

        writeJSONFile(getGradesFilePath(), grades);
        return { success: true, data: gradeData };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  // Get test statistics
  ipcMain.handle(
    TEST_CHANNELS.GET_TEST_STATISTICS,
    async (_event, testId: string) => {
      try {
        const grades = readJSONFile<StudentGrade[]>(getGradesFilePath(), []);
        const testGrades = grades.filter((g) => g.testId === testId);

        if (testGrades.length === 0) {
          return {
            success: true,
            data: {
              average: 0,
              highest: 0,
              lowest: 0,
              underThreshold: 0,
              aboveThreshold: 0,
              totalGraded: 0,
            },
          };
        }

        const finalGrades = testGrades.map((g) => g.finalGrade);
        const sum = finalGrades.reduce((acc, grade) => acc + grade, 0);
        const average = sum / finalGrades.length;
        const highest = Math.max(...finalGrades);
        const lowest = Math.min(...finalGrades);
        const underThreshold = finalGrades.filter((g) => g < 5.5).length;
        const aboveThreshold = finalGrades.filter((g) => g >= 5.5).length;

        const statistics: TestStatistics = {
          average: Math.round(average * 10) / 10,
          highest,
          lowest,
          underThreshold,
          aboveThreshold,
          totalGraded: testGrades.length,
        };

        return { success: true, data: statistics };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );
}
