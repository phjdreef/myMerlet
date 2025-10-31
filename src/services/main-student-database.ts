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
  private initialized = false;

  constructor() {
    // Store database in user data directory - defer path resolution until init
    this.dbPath = "";
    this.photosPath = "";
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

  async savePhoto(externeId: string, photoData: string): Promise<void> {
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

      photos[externeId] = {
        data: photoData,
        cachedAt: new Date().toISOString(),
      };

      fs.writeFileSync(photosPath, JSON.stringify(photos, null, 2));
      logger.debug(`Saved photo for student ${externeId}`);
    } catch (error) {
      logger.error("Failed to save photo:", error);
      throw new Error("Failed to save photo to cache");
    }
  }

  async getPhoto(externeId: string): Promise<string | null> {
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

      const photo = photos[externeId];
      if (photo) {
        logger.debug(`Retrieved cached photo for student ${externeId}`);
        return photo.data;
      }

      return null;
    } catch (error) {
      logger.error("Failed to get photo:", error);
      return null;
    }
  }

  close(): void {
    // No-op for JSON database, but keeping for compatibility
    logger.debug("Database connection closed");
  }
}

// Export singleton instance
export const mainStudentDB = new MainStudentDatabase();

export type { Student };
