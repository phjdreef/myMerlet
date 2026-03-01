import type { Student } from "@/services/student-database";
import type { Test, StudentGrade } from "@/services/test-database";

export interface StudentWithExtras extends Student {
  propertyValues: Map<string, string | number | boolean>;
  note: string;
  recentGrades: Array<{ test: Test; grade: StudentGrade } | null>;
  average: number | null;
}

export type SortDirection = "asc" | "desc";
