import type { Test } from "../../services/test-database";

export type LegacyTestShape = Test & {
  classNames?: string[];
  className?: string;
};

/**
 * Normalize legacy test records so class groups are consistently stored in the
 * {@link Test.classGroups} array. This helper keeps backward compatibility with
 * older persistence formats that used {@code className} or {@code classNames}.
 */
export function normalizeTestRecord(test: LegacyTestShape): Test {
  const candidateGroups =
    (Array.isArray(test.classGroups) && test.classGroups.length > 0
      ? test.classGroups
      : undefined) ??
    (Array.isArray(test.classNames) && test.classNames.length > 0
      ? test.classNames
      : undefined) ??
    (test.className ? [test.className] : []);

  const normalizedGroups = Array.from(
    new Set(
      candidateGroups
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

  return {
    ...test,
    classGroups: normalizedGroups,
  } as Test;
}
