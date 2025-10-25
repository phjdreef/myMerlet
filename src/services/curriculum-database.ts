import { app } from "electron";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";

export interface Topic {
  id: string;
  name: string;
  description?: string; // Rich text HTML content
  order: number;
}

export interface Paragraph {
  id: string;
  number: string; // e.g., "1.1", "2.3"
  title: string;
  topicId?: string; // Optional link to a topic
  order: number;
}

export interface StudyGoal {
  id: string; // unique ID for the goal
  title: string; // e.g., "Paragraaf 3.2: Fotosynthese"
  description?: string;
  weekStart: number; // week number (e.g., 1, 2, 3...)
  weekEnd: number; // week number for multi-week goals
  topicIds: string[]; // Can be 0 to multiple topics
  paragraphIds: string[]; // Can be 0 to multiple paragraphs
  order: number; // order within the curriculum
}

export interface CurriculumPlan {
  id: string;
  classNames: string[]; // Changed from className to support multiple classes
  subject: string;
  schoolYear: string;
  topics: Topic[];
  paragraphs: Paragraph[];
  studyGoals: StudyGoal[];
  createdAt: string;
  updatedAt: string;
}

interface CurriculumData {
  plans: CurriculumPlan[];
  metadata: {
    lastSync: string;
    totalPlans: number;
  } | null;
}

class CurriculumDatabase {
  private dbPath: string;
  private initialized = false;

  constructor() {
    this.dbPath = "";
  }

  private getDbPath(): string {
    if (!this.dbPath) {
      try {
        const userDataPath = app.getPath("userData");
        this.dbPath = path.join(userDataPath, "curriculum_plans.json");
        logger.debug("Curriculum database will be stored at:", this.dbPath);
      } catch (error) {
        logger.error("Failed to get user data path:", error);
        this.dbPath = path.join(process.cwd(), "curriculum_plans.json");
        logger.debug("Using fallback curriculum path:", this.dbPath);
      }
    }
    return this.dbPath;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const dbPath = this.getDbPath();
      logger.debug("Initializing curriculum database at:", dbPath);

      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      if (!fs.existsSync(dbPath)) {
        const initialData: CurriculumData = {
          plans: [],
          metadata: null,
        };
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
        logger.debug("Created initial curriculum database file");
      }

      this.initialized = true;
    } catch (error) {
      logger.error("Failed to initialize curriculum database:", error);
      throw new Error(
        `Curriculum database initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private readDatabase(): CurriculumData {
    const dbPath = this.getDbPath();

    if (!fs.existsSync(dbPath)) {
      return { plans: [], metadata: null };
    }

    try {
      const data = fs.readFileSync(dbPath, "utf8");
      return JSON.parse(data) as CurriculumData;
    } catch (error) {
      logger.error("Failed to read curriculum database:", error);
      return { plans: [], metadata: null };
    }
  }

  private writeDatabase(data: CurriculumData): void {
    const dbPath = this.getDbPath();
    try {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error("Failed to write curriculum database:", error);
      throw new Error("Failed to write to curriculum database");
    }
  }

  async getAllPlans(): Promise<CurriculumPlan[]> {
    if (!this.initialized) await this.init();

    try {
      const data = this.readDatabase();
      return data.plans.sort((a, b) => {
        const aClass = a.classNames.join(", ");
        const bClass = b.classNames.join(", ");
        return aClass.localeCompare(bClass);
      });
    } catch (error) {
      logger.error("Failed to get curriculum plans:", error);
      throw new Error("Failed to retrieve curriculum plans");
    }
  }

  async getPlanByClass(className: string): Promise<CurriculumPlan | null> {
    if (!this.initialized) await this.init();

    try {
      const data = this.readDatabase();
      return (
        data.plans.find((plan) => plan.classNames.includes(className)) || null
      );
    } catch (error) {
      logger.error("Failed to get plan by class:", error);
      return null;
    }
  }

  async savePlan(plan: CurriculumPlan): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const data = this.readDatabase();
      const existingIndex = data.plans.findIndex((p) => p.id === plan.id);

      plan.updatedAt = new Date().toISOString();

      if (existingIndex >= 0) {
        data.plans[existingIndex] = plan;
      } else {
        plan.createdAt = plan.createdAt || new Date().toISOString();
        data.plans.push(plan);
      }

      data.metadata = {
        lastSync: new Date().toISOString(),
        totalPlans: data.plans.length,
      };

      this.writeDatabase(data);
      logger.debug(
        `Successfully saved curriculum plan for ${plan.classNames.join(", ")}`,
      );
    } catch (error) {
      logger.error("Failed to save curriculum plan:", error);
      throw new Error("Failed to save curriculum plan");
    }
  }

  async deletePlan(planId: string): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const data = this.readDatabase();
      data.plans = data.plans.filter((p) => p.id !== planId);

      data.metadata = {
        lastSync: new Date().toISOString(),
        totalPlans: data.plans.length,
      };

      this.writeDatabase(data);
      logger.debug(`Successfully deleted curriculum plan ${planId}`);
    } catch (error) {
      logger.error("Failed to delete curriculum plan:", error);
      throw new Error("Failed to delete curriculum plan");
    }
  }

  close(): void {
    logger.debug("Curriculum database connection closed");
  }
}

export const curriculumDB = new CurriculumDatabase();
