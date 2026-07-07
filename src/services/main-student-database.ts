import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";
import { globalSettings } from "./global-settings";
import { logger } from "../utils/logger";
import { resolveUserDataFilePath } from "./user-data-path";

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
  type: "boolean" | "text" | "number" | "letter" | "longtext";
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

interface Classroom {
  id: string;
  name: string;
}

type TeacherPosition = "left" | "center" | "right";

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
  private classroomLayoutPath: string;
  private initialized = false;

  constructor() {
    // Store database in user data directory - defer path resolution until init
    this.dbPath = "";
    this.photosPath = "";
    this.propertyDefinitionsPath = "";
    this.propertyValuesPath = "";
    this.notesPath = "";
    this.classroomLayoutPath = "";
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fsPromises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private readJsonFile<T>(filePath: string): T {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data) as T;
  }

  private readJsonFileIfExists<T>(filePath: string, fallbackValue: T): T {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    return this.readJsonFile<T>(filePath);
  }

  private writeJsonFile(filePath: string, data: unknown): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  private propertyValueKey(value: StudentPropertyValue): string {
    return `${value.studentId}::${value.className}::${value.schoolYear}::${value.propertyId}`;
  }

  private getDbPath(): string {
    if (!this.dbPath) {
      this.dbPath = resolveUserDataFilePath(
        "magister_students.json",
        "Database",
      );
    }
    return this.dbPath;
  }

  private getPhotosPath(): string {
    if (!this.photosPath) {
      this.photosPath = resolveUserDataFilePath(
        "magister_photos.json",
        "Photos cache",
      );
    }
    return this.photosPath;
  }

  private getPropertyDefinitionsPath(): string {
    if (!this.propertyDefinitionsPath) {
      this.propertyDefinitionsPath = resolveUserDataFilePath(
        "student_property_definitions.json",
        "Student property definitions",
      );
    }
    return this.propertyDefinitionsPath;
  }

  private getPropertyValuesPath(): string {
    if (!this.propertyValuesPath) {
      this.propertyValuesPath = resolveUserDataFilePath(
        "student_property_values.json",
        "Student property values",
      );
    }
    return this.propertyValuesPath;
  }

  private getNotesPath(): string {
    if (!this.notesPath) {
      this.notesPath = resolveUserDataFilePath(
        "student_notes.json",
        "Student notes",
      );
    }
    return this.notesPath;
  }

  private getClassroomLayoutPath(): string {
    if (!this.classroomLayoutPath) {
      this.classroomLayoutPath = resolveUserDataFilePath(
        "classroom_layouts.json",
        "Classroom layouts",
      );
    }
    return this.classroomLayoutPath;
  }

  private getDefaultClassroomLayoutData(): ClassroomLayoutData {
    return {
      seatingPositions: {},
      classroomsByClass: {},
      selectedClassroomByClass: {},
      teacherPositionByClass: {},
    };
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const dbPath = this.getDbPath();
      logger.debug("Initializing JSON database at:", dbPath);

      // Ensure the directory exists
      const dbDir = path.dirname(dbPath);
      const dbDirExisted = await this.pathExists(dbDir);
      await fsPromises.mkdir(dbDir, { recursive: true });
      if (!dbDirExisted) {
        logger.debug("Created database directory:", dbDir);
      }

      // Initialize JSON file if it doesn't exist
      if (!(await this.pathExists(dbPath))) {
        const initialData: DatabaseData = {
          students: [],
          metadata: null,
        };
        await fsPromises.writeFile(
          dbPath,
          JSON.stringify(initialData, null, 2),
        );
        logger.debug("Created initial database file");
      }

      // Initialize photos cache file if it doesn't exist
      const photosPath = this.getPhotosPath();
      if (!(await this.pathExists(photosPath))) {
        const initialPhotos: PhotoCache = {};
        await fsPromises.writeFile(
          photosPath,
          JSON.stringify(initialPhotos, null, 2),
        );
        logger.debug("Created initial photos cache file");
      }

      // Initialize property definitions file if it doesn't exist
      const propertyDefinitionsPath = this.getPropertyDefinitionsPath();
      if (!(await this.pathExists(propertyDefinitionsPath))) {
        const initialData: StudentPropertyDefinition[] = [];
        await fsPromises.writeFile(
          propertyDefinitionsPath,
          JSON.stringify(initialData, null, 2),
        );
        logger.debug("Created initial property definitions file");
      }

      // Initialize property values file if it doesn't exist
      const propertyValuesPath = this.getPropertyValuesPath();
      if (!(await this.pathExists(propertyValuesPath))) {
        const initialData: StudentPropertyValue[] = [];
        await fsPromises.writeFile(
          propertyValuesPath,
          JSON.stringify(initialData, null, 2),
        );
        logger.debug("Created initial property values file");
      }

      // Initialize notes file if it doesn't exist
      const notesPath = this.getNotesPath();
      if (!(await this.pathExists(notesPath))) {
        const initialData: StudentNote[] = [];
        await fsPromises.writeFile(
          notesPath,
          JSON.stringify(initialData, null, 2),
        );
        logger.debug("Created initial notes file");
      }

      // Initialize classroom layout file if it doesn't exist
      const classroomLayoutPath = this.getClassroomLayoutPath();
      if (!(await this.pathExists(classroomLayoutPath))) {
        await fsPromises.writeFile(
          classroomLayoutPath,
          JSON.stringify(this.getDefaultClassroomLayoutData(), null, 2),
        );
        logger.debug("Created initial classroom layout file");
      }

      logger.debug("JSON database initialized successfully");

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

    try {
      return this.readJsonFileIfExists<DatabaseData>(dbPath, {
        students: [],
        metadata: null,
      });
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
      this.writeJsonFile(dbPath, data);
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
      const photos = this.readJsonFileIfExists<PhotoCache>(photosPath, {});

      photos[studentId.toString()] = {
        data: photoData,
        cachedAt: new Date().toISOString(),
      };

      this.writeJsonFile(photosPath, photos);
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
      const photos = this.readJsonFileIfExists<PhotoCache>(photosPath, {});

      const photo = photos[studentId.toString()];
      if (photo) {
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
      const all = this.readJsonFileIfExists<StudentPropertyDefinition[]>(
        path,
        [],
      );
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
      const all = this.readJsonFileIfExists<StudentPropertyDefinition[]>(
        path,
        [],
      );

      // Update or add
      const index = all.findIndex((p) => p.id === property.id);
      if (index >= 0) {
        all[index] = property;
      } else {
        all.push(property);
      }

      this.writeJsonFile(path, all);
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

      let all = this.readJsonFile<StudentPropertyDefinition[]>(path);

      all = all.filter((p) => p.id !== propertyId);
      this.writeJsonFile(path, all);

      // Also delete all values for this property
      const valuesPath = this.getPropertyValuesPath();
      if (fs.existsSync(valuesPath)) {
        let allValues = this.readJsonFile<StudentPropertyValue[]>(valuesPath);
        allValues = allValues.filter((v) => v.propertyId !== propertyId);
        this.writeJsonFile(valuesPath, allValues);
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
      const all = this.readJsonFileIfExists<StudentPropertyValue[]>(path, []);
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

  async getPropertyValuesBatch(
    studentIds: number[],
    className: string,
    schoolYear: string,
  ): Promise<StudentPropertyValue[]> {
    if (!this.initialized) await this.init();

    if (studentIds.length === 0) return [];

    try {
      const path = this.getPropertyValuesPath();
      const studentIdSet = new Set(studentIds);
      const all = this.readJsonFileIfExists<StudentPropertyValue[]>(path, []);

      return all.filter(
        (propertyValue) =>
          studentIdSet.has(propertyValue.studentId) &&
          propertyValue.className === className &&
          propertyValue.schoolYear === schoolYear,
      );
    } catch (error) {
      logger.error("Failed to get property values batch:", error);
      return [];
    }
  }

  async savePropertyValue(value: StudentPropertyValue): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const path = this.getPropertyValuesPath();
      const all = this.readJsonFileIfExists<StudentPropertyValue[]>(path, []);

      // Update or add (unique by studentId + className + schoolYear + propertyId)
      const existingIndex = all.findIndex(
        (v) => this.propertyValueKey(v) === this.propertyValueKey(value),
      );

      if (existingIndex >= 0) {
        all[existingIndex] = value;
      } else {
        all.push(value);
      }

      this.writeJsonFile(path, all);
    } catch (error) {
      logger.error("Failed to save property value:", error);
      throw new Error("Failed to save property value");
    }
  }

  async savePropertyValuesBulk(values: StudentPropertyValue[]): Promise<void> {
    if (!this.initialized) await this.init();
    if (values.length === 0) return;

    try {
      const path = this.getPropertyValuesPath();
      const all = this.readJsonFileIfExists<StudentPropertyValue[]>(path, []);

      const indexByKey = new Map<string, number>();
      all.forEach((value, index) => {
        indexByKey.set(this.propertyValueKey(value), index);
      });

      for (const value of values) {
        const key = this.propertyValueKey(value);
        const existingIndex = indexByKey.get(key);
        if (existingIndex !== undefined) {
          all[existingIndex] = value;
          continue;
        }

        indexByKey.set(key, all.length);
        all.push(value);
      }

      this.writeJsonFile(path, all);
    } catch (error) {
      logger.error("Failed to save property values in bulk:", error);
      throw new Error("Failed to save property values in bulk");
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
      const all = this.readJsonFileIfExists<StudentNote[]>(path, []);
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
      const all = this.readJsonFileIfExists<StudentNote[]>(path, []);

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

      this.writeJsonFile(path, all);
    } catch (error) {
      logger.error("Failed to save note:", error);
      throw new Error("Failed to save note");
    }
  }

  async getClassroomLayoutData(): Promise<ClassroomLayoutData> {
    if (!this.initialized) await this.init();

    try {
      const layoutPath = this.getClassroomLayoutPath();
      return this.readJsonFileIfExists<ClassroomLayoutData>(
        layoutPath,
        this.getDefaultClassroomLayoutData(),
      );
    } catch (error) {
      logger.error("Failed to get classroom layout data:", error);
      return this.getDefaultClassroomLayoutData();
    }
  }

  async saveClassroomLayoutData(
    layoutData: ClassroomLayoutData,
  ): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const layoutPath = this.getClassroomLayoutPath();
      this.writeJsonFile(layoutPath, layoutData);
    } catch (error) {
      logger.error("Failed to save classroom layout data:", error);
      throw new Error("Failed to save classroom layout data");
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
  ClassroomLayoutData,
};
