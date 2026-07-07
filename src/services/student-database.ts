// Renderer-side wrapper for Student Database API
interface Student {
  id: number;
  voorletters: string;
  roepnaam: string;
  tussenvoegsel?: string;
  achternaam: string;
  code: string;
  emailadres: string;
  klassen: string[];
  lesgroepen: string[];
  studies: string[];
  schoolYear: string; // e.g., "2024-2025"
  profiel1?: string;
}

// Custom properties that can be defined per class
interface StudentPropertyDefinition {
  id: string;
  className: string;
  schoolYear: string;
  name: string; // e.g., "Extra tijd", "Bijles"
  type: "boolean" | "text" | "number" | "letter" | "longtext";
  order: number;
}

// Values for custom properties per student
interface StudentPropertyValue {
  studentId: number;
  className: string;
  schoolYear: string;
  propertyId: string;
  value: string | number | boolean;
}

// Notes per student per class
interface StudentNote {
  studentId: number;
  className: string;
  schoolYear: string;
  note: string;
  updatedAt: string; // ISO date string
}

type TeacherPosition = "left" | "center" | "right";

interface Classroom {
  id: string;
  name: string;
}

interface ClassroomLayoutData {
  seatingPositions: Record<
    string,
    Array<{
      studentId: number;
      row: number;
      col: number;
      className: string;
      schoolYear: string;
    }>
  >;
  classroomsByClass: Record<string, Classroom[]>;
  selectedClassroomByClass: Record<string, string>;
  teacherPositionByClass: Record<string, TeacherPosition>;
}

class StudentDatabase {
  private unwrapResponse<T>(
    response: { success: boolean; data?: unknown; error?: string },
    fallbackMessage: string,
  ): T {
    if (!response.success) {
      throw new Error(response.error || fallbackMessage);
    }

    return response.data as T;
  }

  async saveStudents(students: Student[]): Promise<void> {
    const response = await window.studentDBAPI.saveStudents(students);
    this.unwrapResponse<void>(response, "Failed to save students");
  }

  async getAllStudents(): Promise<Student[]> {
    const response = await window.studentDBAPI.getAllStudents();
    return this.unwrapResponse<Student[]>(response, "Failed to get students");
  }

  async searchStudents(query: string): Promise<Student[]> {
    const response = await window.studentDBAPI.searchStudents(query);
    return this.unwrapResponse<Student[]>(
      response,
      "Failed to search students",
    );
  }

  async getMetadata(): Promise<{
    key: string;
    value: string;
    totalCount: number;
  } | null> {
    const response = await window.studentDBAPI.getMetadata();
    return this.unwrapResponse<{
      key: string;
      value: string;
      totalCount: number;
    } | null>(response, "Failed to get metadata");
  }

  async clearAllData(): Promise<void> {
    const response = await window.studentDBAPI.clearAllData();
    this.unwrapResponse<void>(response, "Failed to clear data");
  }

  // Property Definitions
  async getPropertyDefinitions(
    className: string,
    schoolYear: string,
  ): Promise<StudentPropertyDefinition[]> {
    const response = await window.studentDBAPI.getPropertyDefinitions(
      className,
      schoolYear,
    );
    return this.unwrapResponse<StudentPropertyDefinition[]>(
      response,
      "Failed to get property definitions",
    );
  }

  async savePropertyDefinition(
    property: StudentPropertyDefinition,
  ): Promise<void> {
    const response = await window.studentDBAPI.savePropertyDefinition(property);
    this.unwrapResponse<void>(response, "Failed to save property definition");
  }

  async deletePropertyDefinition(propertyId: string): Promise<void> {
    const response =
      await window.studentDBAPI.deletePropertyDefinition(propertyId);
    this.unwrapResponse<void>(response, "Failed to delete property definition");
  }

  // Property Values
  async getPropertyValues(
    studentId: number,
    className: string,
    schoolYear: string,
  ): Promise<StudentPropertyValue[]> {
    const response = await window.studentDBAPI.getPropertyValues(
      studentId,
      className,
      schoolYear,
    );
    return this.unwrapResponse<StudentPropertyValue[]>(
      response,
      "Failed to get property values",
    );
  }

  async getPropertyValuesBatch(
    studentIds: number[],
    className: string,
    schoolYear: string,
  ): Promise<StudentPropertyValue[]> {
    const response = await window.studentDBAPI.getPropertyValuesBatch(
      studentIds,
      className,
      schoolYear,
    );
    return this.unwrapResponse<StudentPropertyValue[]>(
      response,
      "Failed to get property values batch",
    );
  }

  async savePropertyValue(value: StudentPropertyValue): Promise<void> {
    const response = await window.studentDBAPI.savePropertyValue(value);
    this.unwrapResponse<void>(response, "Failed to save property value");
  }

  async savePropertyValuesBulk(values: StudentPropertyValue[]): Promise<void> {
    const response = await window.studentDBAPI.savePropertyValuesBulk(values);
    this.unwrapResponse<void>(
      response,
      "Failed to save property values in bulk",
    );
  }

  // Notes
  async getNote(
    studentId: number,
    className: string,
    schoolYear: string,
  ): Promise<StudentNote | null> {
    const response = await window.studentDBAPI.getNote(
      studentId,
      className,
      schoolYear,
    );
    return this.unwrapResponse<StudentNote | null>(
      response,
      "Failed to get note",
    );
  }

  async saveNote(note: StudentNote): Promise<void> {
    const response = await window.studentDBAPI.saveNote(note);
    this.unwrapResponse<void>(response, "Failed to save note");
  }

  async getClassroomLayoutData(): Promise<ClassroomLayoutData> {
    const response = await window.studentDBAPI.getClassroomLayoutData();
    return this.unwrapResponse<ClassroomLayoutData>(
      response,
      "Failed to get classroom layout data",
    );
  }

  async saveClassroomLayoutData(
    layoutData: ClassroomLayoutData,
  ): Promise<void> {
    const response =
      await window.studentDBAPI.saveClassroomLayoutData(layoutData);
    this.unwrapResponse<void>(response, "Failed to save classroom layout data");
  }
}

// Export singleton instance
export const studentDB = new StudentDatabase();
export type {
  Student,
  StudentPropertyDefinition,
  StudentPropertyValue,
  StudentNote,
  ClassroomLayoutData,
  Classroom,
  TeacherPosition,
};
