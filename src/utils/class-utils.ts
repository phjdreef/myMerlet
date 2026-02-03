/**
 * Utility functions for parsing and formatting class names
 */

export interface ClassInfo {
  code: string; // Afkorting voor de streep (bijv. "H/M", "M/K", "A")
  description: string; // Omschrijving na de streep (bijv. "HAVO/MAVO", "Atheneum")
  fullName: string; // Volledige naam zoals van Magister
}

/**
 * Parse a class name into code and description
 * Examples:
 *   "H/M - HAVO/MAVO" → { code: "H/M", description: "HAVO/MAVO", fullName: "H/M - HAVO/MAVO" }
 *   "A - Atheneum" → { code: "A", description: "Atheneum", fullName: "A - Atheneum" }
 *   "M/K - MAVO/VMBO Kader" → { code: "M/K", description: "MAVO/VMBO Kader", fullName: "M/K - MAVO/VMBO Kader" }
 */
export function parseClassName(fullName: string): ClassInfo {
  const parts = fullName.split(" - ");
  
  if (parts.length >= 2) {
    return {
      code: parts[0].trim(),
      description: parts.slice(1).join(" - ").trim(),
      fullName: fullName,
    };
  }
  
  // Geen streep gevonden, gebruik hele naam als code
  return {
    code: fullName.trim(),
    description: "",
    fullName: fullName,
  };
}

/**
 * Format a class name for display (shows only code by default)
 */
export function formatClassName(fullName: string, showDescription = false): string {
  const info = parseClassName(fullName);
  
  if (showDescription && info.description) {
    return `${info.code} - ${info.description}`;
  }
  
  return info.code;
}

/**
 * Get all unique class info from a list of full class names
 */
export function getClassInfoList(classNames: string[]): ClassInfo[] {
  const uniqueClasses = new Map<string, ClassInfo>();
  
  for (const className of classNames) {
    if (!uniqueClasses.has(className)) {
      uniqueClasses.set(className, parseClassName(className));
    }
  }
  
  return Array.from(uniqueClasses.values());
}
