/**
 * Get the ISO week number for a given date
 * Week 1 is the week with the first Thursday of the year
 */
export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Get the current week number
 */
export function getCurrentWeekNumber(): number {
  return getWeekNumber(new Date());
}

/**
 * Get the start and end date of a specific week number in a given year
 */
export function getWeekDates(
  weekNumber: number,
  year: number,
): { start: Date; end: Date } {
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const end = new Date(ISOweekStart);
  end.setDate(end.getDate() + 6);
  return { start: ISOweekStart, end };
}

/**
 * Format a date range for display
 */
export function formatWeekRange(weekNumber: number, year: number): string {
  const { start, end } = getWeekDates(weekNumber, year);
  const formatter = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
