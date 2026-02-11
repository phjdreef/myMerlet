import type { Student } from "@/services/student-database";

export const LEVEL_OVERRIDE_PROPERTY_ID = "level_override";

export const LEVEL_OVERRIDE_OPTIONS = [
  { code: "B", label: "B - Basis" },
  { code: "K", label: "K - Kader" },
  { code: "M", label: "M - Mavo" },
  { code: "H", label: "H - Havo" },
  { code: "A", label: "A - Atheneum" },
  { code: "G", label: "G - Gymnasium" },
];

/**
 * Extract the short level code from a niveau string.
 * Examples:
 * - "M/K - MAVO/VMBO KADER" -> "M/K"
 * - "HAVO" -> "HAVO"
 * - "A - ATHENEUM" -> "A"
 */
export function extractShortLevel(level: string): string {
  return level.split(" - ")[0].trim().toUpperCase();
}

export function isValidNiveau(value: string): boolean {
  const normalized = value.toUpperCase();
  const validNiveaus = ["HAVO", "VWO", "MAVO", "VMBO", "ATHENEUM", "GYMNASIUM"];
  return validNiveaus.some((niveau) => normalized.includes(niveau));
}

interface FormatStudentNameOptions {
  /**
   * When true, use the student's initials/voorletters as the leading portion of the name.
   * Falls back to the call name (roepnaam) when voorletters are not present.
   */
  preferVoorletters?: boolean;
  /**
   * When set, include the call name (roepnaam) before the surname. Defaults to true when
   * preferVoorletters is false.
   */
  includeRoepnaam?: boolean;
}

/**
 * Format a student's full name while ensuring the tussenvoegsel (infix) is present before the surname.
 */
export function formatStudentName(
  student: Student,
  options: FormatStudentNameOptions = {},
): string {
  const { preferVoorletters = false, includeRoepnaam } = options;

  const parts: string[] = [];
  const surnameParts = [student.tussenvoegsel, student.achternaam]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && value.length));

  const shouldIncludeRoepnaam =
    includeRoepnaam ?? (!preferVoorletters || !student.voorletters);

  if (preferVoorletters && student.voorletters) {
    parts.push(student.voorletters.trim());
  }

  if (shouldIncludeRoepnaam && student.roepnaam) {
    parts.push(student.roepnaam.trim());
  }

  parts.push(...surnameParts);

  return parts.filter(Boolean).join(" ");
}

export function formatStudentInitials(student: Student): string {
  if (student.voorletters && student.voorletters.trim().length > 0) {
    return student.voorletters.trim();
  }

  return student.roepnaam?.charAt(0).toUpperCase() ?? "";
}

const dutchNameCollator = new Intl.Collator("nl-NL", {
  sensitivity: "base",
  ignorePunctuation: true,
  numeric: true,
});

const normalize = (value?: string | null) => value?.trim() ?? "";

type StudentSortKey = "achternaam" | "roepnaam";

interface StudentSortMeta {
  lastName: string;
  prefix: string;
  roepnaam: string;
  voorletters: string;
  primaryFirstName: string;
}

// Cache trimmed name fragments per student so repeated sorts stay cheap.
const sortMetaCache = new WeakMap<Student, StudentSortMeta>();

const buildSortMeta = (student: Student): StudentSortMeta => {
  const roepnaam = normalize(student.roepnaam);
  const voorletters = normalize(student.voorletters);

  return {
    lastName: normalize(student.achternaam),
    prefix: normalize(student.tussenvoegsel),
    roepnaam,
    voorletters,
    primaryFirstName: roepnaam || voorletters,
  };
};

const getSortMeta = (student: Student) => {
  const cached = sortMetaCache.get(student);
  if (cached) {
    return cached;
  }

  const meta = buildSortMeta(student);
  sortMetaCache.set(student, meta);
  return meta;
};

const compareByLastName = (a: Student, b: Student) => {
  const metaA = getSortMeta(a);
  const metaB = getSortMeta(b);

  let comparison = dutchNameCollator.compare(metaA.lastName, metaB.lastName);
  if (comparison !== 0) {
    return comparison;
  }

  comparison = dutchNameCollator.compare(metaA.prefix, metaB.prefix);
  if (comparison !== 0) {
    return comparison;
  }

  comparison = dutchNameCollator.compare(metaA.roepnaam, metaB.roepnaam);
  if (comparison !== 0) {
    return comparison;
  }

  comparison = dutchNameCollator.compare(metaA.voorletters, metaB.voorletters);
  if (comparison !== 0) {
    return comparison;
  }

  return (a.id ?? 0) - (b.id ?? 0);
};

const compareByFirstName = (a: Student, b: Student) => {
  const metaA = getSortMeta(a);
  const metaB = getSortMeta(b);

  let comparison = dutchNameCollator.compare(
    metaA.primaryFirstName,
    metaB.primaryFirstName,
  );
  if (comparison !== 0) {
    return comparison;
  }

  comparison = dutchNameCollator.compare(metaA.lastName, metaB.lastName);
  if (comparison !== 0) {
    return comparison;
  }

  comparison = dutchNameCollator.compare(metaA.prefix, metaB.prefix);
  if (comparison !== 0) {
    return comparison;
  }

  comparison = dutchNameCollator.compare(metaA.roepnaam, metaB.roepnaam);
  if (comparison !== 0) {
    return comparison;
  }

  comparison = dutchNameCollator.compare(metaA.voorletters, metaB.voorletters);
  if (comparison !== 0) {
    return comparison;
  }

  return (a.id ?? 0) - (b.id ?? 0);
};

export function compareStudents(
  a: Student,
  b: Student,
  sortKey: StudentSortKey = "achternaam",
): number {
  if (sortKey === "roepnaam") {
    return compareByFirstName(a, b);
  }
  return compareByLastName(a, b);
}

export function createStudentComparator(
  sortKey: StudentSortKey = "achternaam",
) {
  return (a: Student, b: Student) => compareStudents(a, b, sortKey);
}

export function sortStudents(
  students: Student[],
  sortKey: StudentSortKey = "achternaam",
): Student[] {
  if (students.length <= 1) {
    return students.slice();
  }

  for (const student of students) {
    getSortMeta(student);
  }

  return [...students].sort(createStudentComparator(sortKey));
}

export type { StudentSortKey };
