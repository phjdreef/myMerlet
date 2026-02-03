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
  type: "boolean" | "text" | "number" | "letter";
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
  async saveStudents(students: Student[]): Promise<void> {
    const response = await window.studentDBAPI.saveStudents(students);
    if (!response.success) {
      throw new Error(response.error || "Failed to save students");
    }
  }

  async getAllStudents(): Promise<Student[]> {
    const response = await window.studentDBAPI.getAllStudents();
    if (!response.success) {
      throw new Error(response.error || "Failed to get students");
    }
    return response.data as Student[];
  }

  async searchStudents(query: string): Promise<Student[]> {
    const response = await window.studentDBAPI.searchStudents(query);
    if (!response.success) {
      throw new Error(response.error || "Failed to search students");
    }
    return response.data as Student[];
  }

  async getMetadata(): Promise<{
    key: string;
    value: string;
    totalCount: number;
  } | null> {
    const response = await window.studentDBAPI.getMetadata();
    if (!response.success) {
      throw new Error(response.error || "Failed to get metadata");
    }
    return response.data as {
      key: string;
      value: string;
      totalCount: number;
    } | null;
  }

  async clearAllData(): Promise<void> {
    const response = await window.studentDBAPI.clearAllData();
    if (!response.success) {
      throw new Error(response.error || "Failed to clear data");
    }
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
    if (!response.success) {
      throw new Error(response.error || "Failed to get property definitions");
    }
    return response.data as StudentPropertyDefinition[];
  }

  async savePropertyDefinition(
    property: StudentPropertyDefinition,
  ): Promise<void> {
    const response = await window.studentDBAPI.savePropertyDefinition(
      property,
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to save property definition");
    }
  }

  async deletePropertyDefinition(propertyId: string): Promise<void> {
    const response = await window.studentDBAPI.deletePropertyDefinition(
      propertyId,
    );
    if (!response.success) {
      throw new Error(
        response.error || "Failed to delete property definition",
      );
    }
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
    if (!response.success) {
      throw new Error(response.error || "Failed to get property values");
    }
    return response.data as StudentPropertyValue[];
  }

  async savePropertyValue(value: StudentPropertyValue): Promise<void> {
    const response = await window.studentDBAPI.savePropertyValue(value);
    if (!response.success) {
      throw new Error(response.error || "Failed to save property value");
    }
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
    if (!response.success) {
      throw new Error(response.error || "Failed to get note");
    }
    return response.data as StudentNote | null;
  }

  async saveNote(note: StudentNote): Promise<void> {
    const response = await window.studentDBAPI.saveNote(note);
    if (!response.success) {
      throw new Error(response.error || "Failed to save note");
    }
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
