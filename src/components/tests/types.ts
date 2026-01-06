import type {
  CompositeElement,
  CvTECalculationMode,
  TestType,
} from "@/services/test-database";

export interface TestFormState {
  name: string;
  date: string;
  description: string;
  weight: number;
  testType: TestType;
  nTerm: number;
  maxPoints: number;
  cvteCalculationMode: CvTECalculationMode;
  elements: CompositeElement[];
  customFormula: string;
  classGroups: string[];
}
