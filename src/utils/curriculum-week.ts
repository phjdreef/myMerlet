export const MAX_WEEKS_IN_YEAR = 53;
export const DEFAULT_WEEK_START = 1;
export const DEFAULT_WEEK_END = 52;

export interface WeekSpan {
  weekStart: number;
  weekEnd: number;
}

export function clampWeekNumber(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_WEEK_START;
  }

  const rounded = Math.trunc(value);
  if (rounded < 1) return 1;
  if (rounded > MAX_WEEKS_IN_YEAR) return MAX_WEEKS_IN_YEAR;
  return rounded;
}

export function generateWeekSequence(start?: number, end?: number): number[] {
  const normalizedStart = clampWeekNumber(start ?? DEFAULT_WEEK_START);
  const normalizedEnd = clampWeekNumber(end ?? DEFAULT_WEEK_END);
  const weekCap =
    normalizedStart === MAX_WEEKS_IN_YEAR || normalizedEnd === MAX_WEEKS_IN_YEAR
      ? MAX_WEEKS_IN_YEAR
      : DEFAULT_WEEK_END;

  const weeks: number[] = [normalizedStart];
  let current = normalizedStart;
  const safetyLimit = MAX_WEEKS_IN_YEAR - 1;
  let steps = 0;

  while (current !== normalizedEnd && steps < safetyLimit) {
    current = current === weekCap ? 1 : current + 1;
    weeks.push(current);
    steps += 1;
  }

  return weeks;
}

export function goalCoversWeek(goal: WeekSpan, weekNumber: number): boolean {
  const start = clampWeekNumber(goal.weekStart);
  const end = clampWeekNumber(goal.weekEnd);
  const target = clampWeekNumber(weekNumber);

  if (start === end) {
    return target === start;
  }

  if (start < end) {
    return target >= start && target <= end;
  }

  // Wrap across new year
  return target >= start || target <= end;
}

export function parseSchoolYear(schoolYear?: string): {
  startYear?: number;
  endYear?: number;
} {
  if (!schoolYear) {
    return {};
  }

  const normalized = schoolYear.trim();
  const rangedMatch = normalized.match(/(\d{4})\s*[-/]\s*(\d{4})/);
  if (rangedMatch) {
    const startYear = Number.parseInt(rangedMatch[1], 10);
    const endYear = Number.parseInt(rangedMatch[2], 10);
    if (Number.isFinite(startYear) && Number.isFinite(endYear)) {
      return { startYear, endYear };
    }
  }

  const singleMatch = normalized.match(/(\d{4})/);
  if (singleMatch) {
    const year = Number.parseInt(singleMatch[1], 10);
    if (Number.isFinite(year)) {
      return { startYear: year, endYear: year + 1 };
    }
  }

  return {};
}

export function maskSchoolYearInput(input: string): string {
  if (!input) {
    return "";
  }

  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  const start = digits.slice(0, 4);
  const end = digits.slice(4, 8);
  return end.length > 0 ? `${start}-${end}` : `${start}-`;
}

export function formatSchoolYearFromStart(startYear?: number): string {
  if (!startYear || !Number.isFinite(startYear)) {
    return "";
  }
  const endYear = startYear + 1;
  return `${startYear}-${endYear}`;
}

export function getYearForWeek(
  weekNumber: number,
  startWeek: number,
  endWeek: number,
  schoolYears: { startYear?: number; endYear?: number },
  fallbackYear: number,
): number {
  const week = clampWeekNumber(weekNumber);
  const start = clampWeekNumber(startWeek);
  const end = clampWeekNumber(endWeek);
  const { startYear, endYear } = schoolYears;

  if (!startYear && !endYear) {
    return fallbackYear;
  }

  if (!startYear) {
    return endYear ?? fallbackYear;
  }

  if (!endYear) {
    return startYear;
  }

  if (start <= end) {
    return startYear;
  }

  if (week >= start) {
    return startYear;
  }

  if (week <= end) {
    return endYear;
  }

  return fallbackYear;
}
