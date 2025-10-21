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
  externeId: string;
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
}

// Export singleton instance
export const studentDB = new StudentDatabase();
export type { Student };
