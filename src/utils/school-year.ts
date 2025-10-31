/**
 * School Year Utilities
 * Format: "2024-2025" (September 2024 to August 2025)
 */

export type SchoolYear = string; // Format: "YYYY-YYYY"

/**
 * Get the current school year based on today's date
 * School year runs from September to August
 * @returns School year string in format "2024-2025"
 */
export function getCurrentSchoolYear(): SchoolYear {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  // If we're in September (8) or later, we're in the new school year
  // Otherwise, we're still in the previous school year
  if (month >= 8) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Generate a list of school years
 * @param count Number of years to generate (default: 10)
 * @param startYear Optional starting year (default: current school year)
 * @returns Array of school year strings
 */
export function generateSchoolYears(
  count: number = 10,
  startYear?: SchoolYear,
): SchoolYear[] {
  const current = startYear || getCurrentSchoolYear();
  const [startYearNum] = current.split("-").map(Number);

  const years: SchoolYear[] = [];

  // Generate past and future years
  const startOffset = Math.floor(count / 2);

  for (let i = -startOffset; i < count - startOffset; i++) {
    const year = startYearNum + i;
    years.push(`${year}-${year + 1}`);
  }

  return years.sort((a, b) => b.localeCompare(a)); // Most recent first
}

/**
 * Validate school year format
 * @param schoolYear School year string to validate
 * @returns True if valid format "YYYY-YYYY" with consecutive years
 */
export function isValidSchoolYear(schoolYear: string): boolean {
  const pattern = /^(\d{4})-(\d{4})$/;
  const match = schoolYear.match(pattern);

  if (!match) return false;

  const [, startYear, endYear] = match;
  const start = parseInt(startYear, 10);
  const end = parseInt(endYear, 10);

  // End year must be exactly one year after start year
  return end === start + 1;
}

/**
 * Parse school year into start and end years
 * @param schoolYear School year string
 * @returns Object with startYear and endYear numbers
 */
export function parseSchoolYear(schoolYear: SchoolYear): {
  startYear: number;
  endYear: number;
} {
  const [startYear, endYear] = schoolYear.split("-").map(Number);
  return { startYear, endYear };
}

/**
 * Format school year for display
 * @param schoolYear School year string
 * @returns Formatted string
 */
export function formatSchoolYear(schoolYear: SchoolYear): string {
  return schoolYear; // Already in the correct format
}

/**
 * Get the next school year
 * @param schoolYear Current school year
 * @returns Next school year
 */
export function getNextSchoolYear(schoolYear: SchoolYear): SchoolYear {
  const { startYear } = parseSchoolYear(schoolYear);
  return `${startYear + 1}-${startYear + 2}`;
}

/**
 * Get the previous school year
 * @param schoolYear Current school year
 * @returns Previous school year
 */
export function getPreviousSchoolYear(schoolYear: SchoolYear): SchoolYear {
  const { startYear } = parseSchoolYear(schoolYear);
  return `${startYear - 1}-${startYear}`;
}
