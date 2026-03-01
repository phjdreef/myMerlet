export interface GradeEntryFormEntry {
  pointsEarned?: number;
  elementGrades?: { elementId: string; pointsEarned: number }[];
  manualOverride?: number;
  calculatedGrade: number | null;
  finalGrade: number | null;
}
