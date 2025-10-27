import type { CompositeElement, TestType } from "@/services/test-database";

export interface TestFormState {
  name: string;
  date: string;
  description: string;
  weight: number;
  testType: TestType;
  nTerm: number;
  rTerm: number;
  maxPoints: number;
  elements: CompositeElement[];
  customFormula: string;
  classGroups: string[];
}
