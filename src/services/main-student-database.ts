import { app } from "electron";
import path from "path";
import fs from "fs";
import { globalSettings } from "./global-settings";
import { logger } from "../utils/logger";

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
  schoolYear: string;
}

interface StudentPropertyDefinition {
  id: string;
  className: string;
  schoolYear: string;
  name: string;
  type: "boolean" | "text" | "number" | "letter";
  order: number;
}

interface StudentPropertyValue {
  studentId: number;
  className: string;
  schoolYear: string;
  propertyId: string;
  value: string | number | boolean;
}

interface StudentNote {
  studentId: number;
  className: string;
  schoolYear: string;
  note: string;
  updatedAt: string;
}

interface DatabaseData {
  students: Student[];
  metadata: {
    lastSync: string;
    totalCount: number;
    created_at: string;
  } | null;
}

interface PhotoCache {
  [externeId: string]: {
    data: string; // base64 data URL
    cachedAt: string;
  };
}

class MainStudentDatabase {
  private dbPath: string;
  private photosPath: string;
  private propertyDefinitionsPath: string;
  private propertyValuesPath: string;
  private notesPath: string;
  private initialized = false;

  constructor() {
    // Store database in user data directory - defer path resolution until init
    this.dbPath = "";
    this.photosPath = "";
    this.propertyDefinitionsPath = "";
    this.propertyValuesPath = "";
    this.notesPath = "";
  }

  private getDbPath(): string {
    if (!this.dbPath) {
      try {
        const userDataPath = app.getPath("userData");
        this.dbPath = path.join(userDataPath, "magister_students.json");
        logger.debug("Database will be stored at:", this.dbPath);
      } catch (error) {
        logger.error("Failed to get user data path:", error);
        // Fallback to current directory
        this.dbPath = path.join(process.cwd(), "magister_students.json");
        logger.debug("Using fallback database path:", this.dbPath);
      }
    }
    return this.dbPath;
  }

  private getPhotosPath(): string {
    if (!this.photosPath) {
      try {
        const userDataPath = app.getPath("userData");
        this.photosPath = path.join(userDataPath, "magister_photos.json");
        logger.debug("Photos cache will be stored at:", this.photosPath);
      } catch (error) {
        logger.error("Failed to get user data path:", error);
        // Fallback to current directory
        this.photosPath = path.join(process.cwd(), "magister_photos.json");
        logger.debug("Using fallback photos path:", this.photosPath);
      }
    }
    return this.photosPath;
  }

  private getPropertyDefinitionsPath(): string {
    if (!this.propertyDefinitionsPath) {
      try {
        const userDataPath = app.getPath("userData");
        this.propertyDefinitionsPath = path.join(
          userDataPath,
          "student_property_definitions.json",
        );
      } catch {
        this.propertyDefinitionsPath = path.join(
          process.cwd(),
          "student_property_definitions.json",
        );
      }
    }
    return this.propertyDefinitionsPath;
  }

  private getPropertyValuesPath(): string {
    if (!this.propertyValuesPath) {
      try {
        const userDataPath = app.getPath("userData");
        this.propertyValuesPath = path.join(
          userDataPath,
          "student_property_values.json",
        );
      } catch {
        this.propertyValuesPath = path.join(
          process.cwd(),
          "student_property_values.json",
        );
      }
    }
    return this.propertyValuesPath;
  }

  private getNotesPath(): string {
    if (!this.notesPath) {
      try {
        const userDataPath = app.getPath("userData");
        this.notesPath = path.join(userDataPath, "student_notes.json");
      } catch {
        this.notesPath = path.join(process.cwd(), "student_notes.json");
      }
    }
    return this.notesPath;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const dbPath = this.getDbPath();
      logger.debug("Initializing JSON database at:", dbPath);

      // Ensure the directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.debug("Created database directory:", dbDir);
      }

      // Initialize JSON file if it doesn't exist
      if (!fs.existsSync(dbPath)) {
        const initialData: DatabaseData = {
          students: [],
          metadata: null,
        };
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
        logger.debug("Created initial database file");
      }

      // Initialize photos cache file if it doesn't exist
      const photosPath = this.getPhotosPath();
      if (!fs.existsSync(photosPath)) {
        const initialPhotos: PhotoCache = {};
        fs.writeFileSync(photosPath, JSON.stringify(initialPhotos, null, 2));
        logger.debug("Created initial photos cache file");
      }

      // Initialize property definitions file if it doesn't exist
      const propertyDefinitionsPath = this.getPropertyDefinitionsPath();
      if (!fs.existsSync(propertyDefinitionsPath)) {
        const initialData: StudentPropertyDefinition[] = [];
        fs.writeFileSync(
          propertyDefinitionsPath,
          JSON.stringify(initialData, null, 2),
        );
        logger.debug("Created initial property definitions file");
      }

      // Initialize property values file if it doesn't exist
      const propertyValuesPath = this.getPropertyValuesPath();
      if (!fs.existsSync(propertyValuesPath)) {
        const initialData: StudentPropertyValue[] = [];
        fs.writeFileSync(
          propertyValuesPath,
          JSON.stringify(initialData, null, 2),
        );
        logger.debug("Created initial property values file");
      }

      // Initialize notes file if it doesn't exist
      const notesPath = this.getNotesPath();
      if (!fs.existsSync(notesPath)) {
        const initialData: StudentNote[] = [];
        fs.writeFileSync(notesPath, JSON.stringify(initialData, null, 2));
        logger.debug("Created initial notes file");
      }

      // Test read/write
      const testData = this.readDatabase();
      logger.debug(
        `JSON database initialized successfully. Contains ${testData.students.length} students`,
      );

      this.initialized = true;
    } catch (error) {
      logger.error("Failed to initialize database:", error);
      logger.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        dbPath: this.getDbPath(),
      });

      throw new Error(
        `Database initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private readDatabase(): DatabaseData {
    const dbPath = this.getDbPath();

    if (!fs.existsSync(dbPath)) {
      return {
        students: [],
        metadata: null,
      };
    }

    try {
      const data = fs.readFileSync(dbPath, "utf8");
      return JSON.parse(data) as DatabaseData;
    } catch (error) {
      logger.error("Failed to read database:", error);
      // Return empty data if file is corrupted
      return {
        students: [],
        metadata: null,
      };
    }
  }

  private writeDatabase(data: DatabaseData): void {
    const dbPath = this.getDbPath();
    try {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error("Failed to write database:", error);
      throw new Error("Failed to write to database file");
    }
  }

  async saveStudents(students: Student[]): Promise<void> {
    logger.debug(`Attempting to save ${students.length} students to database`);

    if (!this.initialized) {
      logger.debug("Database not initialized, calling init()");
      await this.init();
    }

    try {
      logger.debug("Starting database save operation");

      // Read existing data to merge with new students
      const existingData = this.readDatabase();
      const existingStudentsMap = new Map<string, Student>();

      // Create a map of existing students by externeId
      for (const student of existingData.students) {
        if (student.externeId) {
          existingStudentsMap.set(student.externeId, student);
        }
      }

      // Merge new students with existing ones (update if externeId exists, add if new)
      for (const student of students) {
        if (student.externeId) {
          existingStudentsMap.set(student.externeId, student);
        }
      }

      // Convert map back to array
      const mergedStudents = Array.from(existingStudentsMap.values());

      const data: DatabaseData = {
        students: mergedStudents,
        metadata: {
          lastSync: new Date().toISOString(),
          totalCount: mergedStudents.length,
          created_at:
            existingData.metadata?.created_at || new Date().toISOString(),
        },
      };

      this.writeDatabase(data);
      logger.debug(
        `Successfully saved ${mergedStudents.length} students to database (${students.length} new/updated)`,
      );
    } catch (error) {
      logger.error("Failed to save students:", error);
      throw new Error("Failed to save students to database");
    }
  }

  async getAllStudents(): Promise<Student[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const data = this.readDatabase();
      const currentSchoolYear = await globalSettings.getCurrentSchoolYear();

      // Filter by current school year
      const filteredStudents = data.students.filter(
        (student) => student.schoolYear === currentSchoolYear,
      );

      // Sort by roepnaam
      return filteredStudents.sort((a, b) =>
        a.roepnaam.localeCompare(b.roepnaam),
      );
    } catch (error) {
      logger.error("Failed to get students:", error);
      throw new Error("Failed to retrieve students from database");
    }
  }

  async searchStudents(query: string): Promise<Student[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const data = this.readDatabase();
      const currentSchoolYear = await globalSettings.getCurrentSchoolYear();
      const lowerQuery = query.toLowerCase();

      const filteredStudents = data.students.filter(
        (student) =>
          student.schoolYear === currentSchoolYear &&
          (student.roepnaam.toLowerCase().includes(lowerQuery) ||
            student.achternaam.toLowerCase().includes(lowerQuery) ||
            student.emailadres.toLowerCase().includes(lowerQuery) ||
            student.code.toLowerCase().includes(lowerQuery) ||
            (student.tussenvoegsel &&
              student.tussenvoegsel.toLowerCase().includes(lowerQuery))),
      );

      // Sort by roepnaam
      return filteredStudents.sort((a, b) =>
        a.roepnaam.localeCompare(b.roepnaam),
      );
    } catch (error) {
      logger.error("Failed to search students:", error);
      throw new Error("Failed to search students in database");
    }
  }

  async getMetadata(): Promise<{
    key: string;
    value: string;
    totalCount: number;
  } | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const data = this.readDatabase();
      if (data.metadata) {
        return {
          key: "lastSync",
          value: data.metadata.lastSync,
          totalCount: data.metadata.totalCount,
        };
      }
      return null;
    } catch (error) {
      logger.error("Failed to get metadata:", error);
      throw new Error("Failed to retrieve metadata from database");
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const emptyData: DatabaseData = {
        students: [],
        metadata: null,
      };

      this.writeDatabase(emptyData);
      logger.debug("Successfully cleared all data from database");
    } catch (error) {
      logger.error("Failed to clear data:", error);
      throw new Error("Failed to clear database data");
    }
  }

  async savePhoto(studentId: number, photoData: string): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const photosPath = this.getPhotosPath();
      let photos: PhotoCache = {};

      if (fs.existsSync(photosPath)) {
        const data = fs.readFileSync(photosPath, "utf8");
        photos = JSON.parse(data) as PhotoCache;
      }

      photos[studentId.toString()] = {
        data: photoData,
        cachedAt: new Date().toISOString(),
      };

      fs.writeFileSync(photosPath, JSON.stringify(photos, null, 2));
      logger.debug(`Saved photo for student ${studentId}`);
    } catch (error) {
      logger.error("Failed to save photo:", error);
      throw new Error("Failed to save photo to cache");
    }
  }

  async getPhoto(studentId: number): Promise<string | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const photosPath = this.getPhotosPath();

      if (!fs.existsSync(photosPath)) {
        return null;
      }

      const data = fs.readFileSync(photosPath, "utf8");
      const photos = JSON.parse(data) as PhotoCache;

      const photo = photos[studentId.toString()];
      if (photo) {
        logger.debug(`Retrieved cached photo for student ${studentId}`);
        return photo.data;
      }

      return null;
    } catch (error) {
      logger.error("Failed to get photo:", error);
      return null;
    }
  }

  // Property Definitions methods
  async getPropertyDefinitions(
    className: string,
    schoolYear: string,
  ): Promise<StudentPropertyDefinition[]> {
    if (!this.initialized) await this.init();

    try {
      const path = this.getPropertyDefinitionsPath();
      if (!fs.existsSync(path)) return [];

      const data = fs.readFileSync(path, "utf8");
      const all = JSON.parse(data) as StudentPropertyDefinition[];
      return all.filter(
        (p) => p.className === className && p.schoolYear === schoolYear,
      );
    } catch (error) {
      logger.error("Failed to get property definitions:", error);
      return [];
    }
  }

  async savePropertyDefinition(
    property: StudentPropertyDefinition,
  ): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const path = this.getPropertyDefinitionsPath();
      let all: StudentPropertyDefinition[] = [];

      if (fs.existsSync(path)) {
        const data = fs.readFileSync(path, "utf8");
        all = JSON.parse(data) as StudentPropertyDefinition[];
      }

      // Update or add
      const index = all.findIndex((p) => p.id === property.id);
      if (index >= 0) {
        all[index] = property;
      } else {
        all.push(property);
      }

      fs.writeFileSync(path, JSON.stringify(all, null, 2));
      logger.debug(`Saved property definition ${property.id}`);
    } catch (error) {
      logger.error("Failed to save property definition:", error);
      throw new Error("Failed to save property definition");
    }
  }

  async deletePropertyDefinition(propertyId: string): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const path = this.getPropertyDefinitionsPath();
      if (!fs.existsSync(path)) return;

      const data = fs.readFileSync(path, "utf8");
      let all = JSON.parse(data) as StudentPropertyDefinition[];

      all = all.filter((p) => p.id !== propertyId);
      fs.writeFileSync(path, JSON.stringify(all, null, 2));

      // Also delete all values for this property
      const valuesPath = this.getPropertyValuesPath();
      if (fs.existsSync(valuesPath)) {
        const valuesData = fs.readFileSync(valuesPath, "utf8");
        let allValues = JSON.parse(valuesData) as StudentPropertyValue[];
        allValues = allValues.filter((v) => v.propertyId !== propertyId);
        fs.writeFileSync(valuesPath, JSON.stringify(allValues, null, 2));
      }

      logger.debug(`Deleted property definition ${propertyId}`);
    } catch (error) {
      logger.error("Failed to delete property definition:", error);
      throw new Error("Failed to delete property definition");
    }
  }

  // Property Values methods
  async getPropertyValues(
    studentId: number,
    className: string,
    schoolYear: string,
  ): Promise<StudentPropertyValue[]> {
    if (!this.initialized) await this.init();

    try {
      const path = this.getPropertyValuesPath();
      if (!fs.existsSync(path)) return [];

      const data = fs.readFileSync(path, "utf8");
      const all = JSON.parse(data) as StudentPropertyValue[];
      return all.filter(
        (v) =>
          v.studentId === studentId &&
          v.className === className &&
          v.schoolYear === schoolYear,
      );
    } catch (error) {
      logger.error("Failed to get property values:", error);
      return [];
    }
  }

  async savePropertyValue(value: StudentPropertyValue): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const path = this.getPropertyValuesPath();
      let all: StudentPropertyValue[] = [];

      if (fs.existsSync(path)) {
        const data = fs.readFileSync(path, "utf8");
        all = JSON.parse(data) as StudentPropertyValue[];
      }

      // Update or add (unique by studentId + className + schoolYear + propertyId)
      const existingIndex = all.findIndex(
        (v) =>
          v.studentId === value.studentId &&
          v.className === value.className &&
          v.schoolYear === value.schoolYear &&
          v.propertyId === value.propertyId,
      );

      if (existingIndex >= 0) {
        all[existingIndex] = value;
      } else {
        all.push(value);
      }

      fs.writeFileSync(path, JSON.stringify(all, null, 2));
    } catch (error) {
      logger.error("Failed to save property value:", error);
      throw new Error("Failed to save property value");
    }
  }

  // Notes methods
  async getNote(
    studentId: number,
    className: string,
    schoolYear: string,
  ): Promise<StudentNote | null> {
    if (!this.initialized) await this.init();

    try {
      const path = this.getNotesPath();
      if (!fs.existsSync(path)) return null;

      const data = fs.readFileSync(path, "utf8");
      const all = JSON.parse(data) as StudentNote[];
      return (
        all.find(
          (n) =>
            n.studentId === studentId &&
            n.className === className &&
            n.schoolYear === schoolYear,
        ) || null
      );
    } catch (error) {
      logger.error("Failed to get note:", error);
      return null;
    }
  }

  async saveNote(note: StudentNote): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const path = this.getNotesPath();
      let all: StudentNote[] = [];

      if (fs.existsSync(path)) {
        const data = fs.readFileSync(path, "utf8");
        all = JSON.parse(data) as StudentNote[];
      }

      // Update or add (unique by studentId + className + schoolYear)
      const existingIndex = all.findIndex(
        (n) =>
          n.studentId === note.studentId &&
          n.className === note.className &&
          n.schoolYear === note.schoolYear,
      );

      if (existingIndex >= 0) {
        all[existingIndex] = note;
      } else {
        all.push(note);
      }

      fs.writeFileSync(path, JSON.stringify(all, null, 2));
    } catch (error) {
      logger.error("Failed to save note:", error);
      throw new Error("Failed to save note");
    }
  }

  close(): void {
    // No-op for JSON database, but keeping for compatibility
    logger.debug("Database connection closed");
  }
}

// Export singleton instance
export const mainStudentDB = new MainStudentDatabase();

export type {
  Student,
  StudentPropertyDefinition,
  StudentPropertyValue,
  StudentNote,
};
