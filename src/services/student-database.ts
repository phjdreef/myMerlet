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
}

// Export singleton instance
export const studentDB = new StudentDatabase();
export type {
  Student,
  StudentPropertyDefinition,
  StudentPropertyValue,
  StudentNote,
};
