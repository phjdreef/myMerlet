import { expect, test } from "vitest";

import { calculateCvTEGrade } from "@/services/test-database";

test("CvTE grade (N=1) matches hoofdrelatie", () => {
  const maxPoints = 50;
  expect(calculateCvTEGrade(0, maxPoints, 1, "official")).toBe(1);
  expect(calculateCvTEGrade(25, maxPoints, 1, "official")).toBe(5.5);
  expect(calculateCvTEGrade(50, maxPoints, 1, "official")).toBe(10);
});

test("CvTE grade respects boundaries for low N", () => {
  const maxPoints = 40;
  const nTerm = 0.5;

  // 0% is always 1.0, 100% always 10.0
  expect(calculateCvTEGrade(0, maxPoints, nTerm, "official")).toBe(1);
  expect(calculateCvTEGrade(maxPoints, maxPoints, nTerm, "official")).toBe(10);

  // Still monotone and within bounds
  const mid = calculateCvTEGrade(20, maxPoints, nTerm, "official");
  expect(mid).toBeGreaterThanOrEqual(1);
  expect(mid).toBeLessThanOrEqual(10);
});

test("CvTE grade respects boundaries for high N", () => {
  const maxPoints = 30;
  const nTerm = 1.5;

  expect(calculateCvTEGrade(0, maxPoints, nTerm, "official")).toBe(1);
  expect(calculateCvTEGrade(maxPoints, maxPoints, nTerm, "official")).toBe(10);

  // Upper bound: should never exceed 10
  expect(
    calculateCvTEGrade(maxPoints - 1, maxPoints, nTerm, "official"),
  ).toBeLessThanOrEqual(10);
});

test("CvTE grade clamps out-of-range scores", () => {
  const maxPoints = 20;

  expect(calculateCvTEGrade(-5, maxPoints, 1, "official")).toBe(1);
  expect(calculateCvTEGrade(999, maxPoints, 1, "official")).toBe(10);
});
