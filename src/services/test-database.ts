/**
 * Test and Grade Management Database Service
 * Stores test information and student grades with CvTE formula calculations
 */
import { evaluateFormulaExpression } from "../utils/formula-parser";

export type TestType = "cvte" | "composite";

export interface CompositeElement {
  id: string;
  name: string; // e.g., "Creativity", "Effort", "Cleanliness"
  maxPoints: number;
  weight: number; // Weight of this element in the final calculation (e.g., 0.3 for 30%)
  order: number; // Display order
}

export interface Test {
  id: string;
  classGroups: string[]; // Class groups this test applies to
  name: string;
  date: string; // ISO date string
  description: string;
  weight: number; // Weight of the test (e.g., 1, 2, 3 for single, double, triple weight)
  testType: TestType; // Type of test: "cvte" or "composite"
  schoolYear: string; // e.g., "2024-2025"

  // CvTE test properties (only for testType === "cvte")
  nTerm?: number; // The n-term for CvTE formula (normering)
  rTerm?: number; // The R-term (multiplier) for CvTE formula (default: 9)
  maxPoints?: number; // Maximum points for the entire test

  // Composite test properties (only for testType === "composite")
  elements?: CompositeElement[]; // Array of elements to score
  customFormula?: string; // Custom formula using element names (e.g., "(Creativity + Effort) / 20")

  createdAt: string;
  updatedAt: string;
}

export interface CompositeElementGrade {
  elementId: string;
  pointsEarned: number;
}

export interface StudentGrade {
  id: string;
  testId: string;
  studentId: number; // Links to student from student database
  schoolYear: string; // e.g., "2024-2025"

  // For CvTE tests
  pointsEarned?: number; // Points the student earned (for CvTE tests)

  // For composite tests
  elementGrades?: CompositeElementGrade[]; // Grades for each element

  manualOverride?: number; // Optional manual grade override (1-10 scale)
  calculatedGrade: number; // Calculated grade using CvTE formula or composite calculation
  finalGrade: number; // Final grade (either calculated or manual override)
  createdAt: string;
  updatedAt: string;
}

export interface TestStatistics {
  average: number;
  highest: number;
  lowest: number;
  underThreshold: number; // Count of grades < 5.5
  aboveThreshold: number; // Count of grades >= 5.5
  totalGraded: number;
}

/**
 * Calculate grade using CvTE formula
 * Cijfer = R × (behaalde_score / maximale_score) + n
 *
 * @param pointsEarned - Points the student earned
 * @param maxPoints - Maximum points possible
 * @param nTerm - The n-term (normering)
 * @param rTerm - The R-term (multiplier, default: 9)
 * @returns Calculated grade (cijfer)
 */
export function calculateCvTEGrade(
  pointsEarned: number,
  maxPoints: number,
  nTerm: number,
  rTerm: number = 9,
): number {
  if (maxPoints === 0) return nTerm;
  const cijfer = rTerm * (pointsEarned / maxPoints) + nTerm;
  return Math.round(cijfer * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate grade for a composite test using custom formula or weighted average
 * If customFormula is provided, it evaluates the formula using element names.
 * Otherwise, uses weighted average (each element normalized to 0-10, then weighted)
 *
 * @param elementGrades - Array of element grades
 * @param elements - Array of element definitions
 * @param customFormula - Optional custom formula using element names (e.g., "(Netheid + Originaliteit) / 15")
 * @returns Calculated grade (cijfer)
 */
export function calculateCompositeGrade(
  elementGrades: CompositeElementGrade[],
  elements: CompositeElement[],
  customFormula?: string,
): number {
  if (elements.length === 0) return 0;

  // If custom formula is provided, evaluate it
  if (customFormula && customFormula.trim() !== "") {
    try {
      const escapeRegExp = (value: string) =>
        value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const context: Record<string, number> = {};

      for (const element of elements) {
        const normalizedKey = element.name.trim().toLowerCase();
        const grade = elementGrades.find((g) => g.elementId === element.id);
        context[normalizedKey] = grade?.pointsEarned ?? 0;
      }

      let formula = customFormula.trim();

      // Replace element names (case-insensitive) with their values
      for (const element of elements) {
        const name = element.name.trim();
        if (!name) continue;

        const normalizedKey = name.toLowerCase();
        const value = context[normalizedKey] ?? 0;
        const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi");
        formula = formula.replace(regex, String(value));
      }

      // Support comma decimals by converting to dot
      formula = formula.replace(/,/g, ".");

      // Validate: only digits, spaces, operators, and decimal dots remain
      if (!/^[\d\s+\-*/().]+$/.test(formula)) {
        console.error(
          "Invalid formula: contains forbidden characters",
          formula,
        );
        return 0;
      }

      const result = evaluateFormulaExpression(formula);

      if (result !== null) {
        return Math.round(result * 100) / 100;
      }

      console.error(
        "Formula evaluation did not return a valid number",
        formula,
      );
      return 0;
    } catch (error) {
      console.error("Error evaluating custom formula:", error);
      return 0;
    }
  }

  // Default: weighted average calculation
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const element of elements) {
    const grade = elementGrades.find((g) => g.elementId === element.id);
    if (!grade) continue;

    // Normalize the score to 0-10 scale
    const normalizedScore =
      element.maxPoints > 0 ? (grade.pointsEarned / element.maxPoints) * 10 : 0;

    totalWeightedScore += normalizedScore * element.weight;
    totalWeight += element.weight;
  }

  if (totalWeight === 0) return 0;

  const finalGrade = totalWeightedScore / totalWeight;
  return Math.round(finalGrade * 100) / 100; // Round to 2 decimals
}

/**
 * Round grade to nearest 0.1 (standard Dutch grading)
 */
export function roundGrade(grade: number): number {
  return Math.round(grade * 10) / 10;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
class TestDatabase {
  private dbPath: string;

  constructor() {
    // Will be set by main process
    this.dbPath = "";
  }

  /**
   * Initialize database path
   */
  setPath(path: string) {
    this.dbPath = path;
  }

  /**
   * Get all tests for a specific class
   */
  async getTestsForClassGroup(classGroup: string): Promise<Test[]> {
    // Will be implemented via IPC
    return [];
  }

  /**
   * Get a specific test by ID
   */
  async getTest(testId: string): Promise<Test | null> {
    // Will be implemented via IPC
    return null;
  }

  /**
   * Create a new test
   */
  async createTest(
    test: Omit<Test, "id" | "createdAt" | "updatedAt">,
  ): Promise<Test> {
    // Will be implemented via IPC
    return {
      ...test,
      id: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update a test
   */
  async updateTest(
    testId: string,
    updates: Partial<Test>,
  ): Promise<Test | null> {
    // Will be implemented via IPC
    return null;
  }

  /**
   * Delete a test (and all associated grades)
   */
  async deleteTest(testId: string): Promise<boolean> {
    // Will be implemented via IPC
    return false;
  }

  /**
   * Get all grades for a specific test
   */
  async getGradesForTest(testId: string): Promise<StudentGrade[]> {
    // Will be implemented via IPC
    return [];
  }

  /**
   * Get all grades for a specific student across all tests in a class
   */
  async getGradesForStudent(
    studentId: number,
    classGroup: string,
  ): Promise<StudentGrade[]> {
    // Will be implemented via IPC
    return [];
  }

  /**
   * Save or update a student's grade for a test
   */
  async saveGrade(
    testId: string,
    studentId: number,
    pointsEarned: number,
    manualOverride?: number,
  ): Promise<StudentGrade> {
    // Will be implemented via IPC
    const now = new Date().toISOString();
    return {
      id: "",
      testId,
      studentId,
      schoolYear: "", // Will be set by IPC handler
      pointsEarned,
      manualOverride,
      calculatedGrade: 0,
      finalGrade: manualOverride || 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Calculate statistics for a test
   */
  async getTestStatistics(testId: string): Promise<TestStatistics> {
    // Will be implemented via IPC
    return {
      average: 0,
      highest: 0,
      lowest: 0,
      underThreshold: 0,
      aboveThreshold: 0,
      totalGraded: 0,
    };
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

export const testDB = new TestDatabase();
