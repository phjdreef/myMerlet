import { app } from "electron";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";
import {
  clampWeekNumber,
  DEFAULT_WEEK_END,
  DEFAULT_WEEK_START,
  parseSchoolYear,
  formatSchoolYearFromStart,
} from "../utils/curriculum-week";

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
  experiment?: string; // Experiment details
  skills?: string; // Skills to be learned
  details?: string; // Additional details
}

export interface BlockedWeek {
  id: string;
  weekNumber: number;
  reason: string; // e.g., "Christmas Holiday", "Exam Week", "School Trip"
  type: "holiday" | "exam" | "event" | "other"; // Category for visual styling
  isGeneral: boolean; // If true, applies to all classes; if false, only specific classes
  classNames: string[]; // Only used if isGeneral is false
}

export interface CurriculumPlan {
  id: string;
  classNames: string[]; // Changed from className to support multiple classes
  subject: string;
  schoolYear: string;
  schoolYearStart?: number | null;
  schoolYearEnd?: number | null;
  weekRangeStart: number;
  weekRangeEnd: number;
  topics: Topic[];
  paragraphs: Paragraph[];
  studyGoals: StudyGoal[];
  blockedWeeks: BlockedWeek[]; // Weeks that are holidays, exams, etc.
  createdAt: string;
  updatedAt: string;
}

function withNormalizedWeekRange(plan: CurriculumPlan): CurriculumPlan {
  const weekRangeStart = clampWeekNumber(
    plan.weekRangeStart ?? DEFAULT_WEEK_START,
  );
  const weekRangeEnd = clampWeekNumber(plan.weekRangeEnd ?? DEFAULT_WEEK_END);
  const { startYear, endYear } = parseSchoolYear(plan.schoolYear);

  const schoolYearStart = startYear ?? plan.schoolYearStart ?? null;
  const schoolYearEnd =
    endYear ?? plan.schoolYearEnd ?? (startYear ? startYear + 1 : null);
  const normalizedSchoolYear = plan.schoolYear?.trim()
    ? plan.schoolYear
    : schoolYearStart
      ? formatSchoolYearFromStart(schoolYearStart)
      : "";

  return {
    ...plan,
    weekRangeStart,
    weekRangeEnd,
    schoolYear: normalizedSchoolYear,
    schoolYearStart,
    schoolYearEnd,
  };
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
    if (!fs.existsSync(this.dbPath)) {
      return { plans: [], metadata: null };
    }

    const fileContent = fs.readFileSync(this.dbPath, "utf-8");
    const data = JSON.parse(fileContent) as CurriculumData;

    // Migration: Add blockedWeeks to existing plans if missing
    data.plans = data.plans.map((plan) => ({
      ...plan,
      blockedWeeks: plan.blockedWeeks || [],
    }));

    return data;
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
      return data.plans.map(withNormalizedWeekRange).sort((a, b) => {
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
      const plan = data.plans.find((p) => p.classNames.includes(className));
      return plan ? withNormalizedWeekRange(plan) : null;
    } catch (error) {
      logger.error("Failed to get plan by class:", error);
      return null;
    }
  }

  async getPlanById(planId: string): Promise<CurriculumPlan | null> {
    if (!this.initialized) await this.init();

    try {
      const data = this.readDatabase();
      const plan = data.plans.find((p) => p.id === planId);
      return plan ? withNormalizedWeekRange(plan) : null;
    } catch (error) {
      logger.error("Failed to get plan by id:", error);
      return null;
    }
  }

  async savePlan(plan: CurriculumPlan): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const data = this.readDatabase();
      const planToSave = withNormalizedWeekRange({
        ...plan,
        updatedAt: new Date().toISOString(),
      });
      const existingIndex = data.plans.findIndex((p) => p.id === plan.id);

      if (existingIndex >= 0) {
        data.plans[existingIndex] = planToSave;
      } else {
        const planWithCreatedAt = {
          ...planToSave,
          createdAt: plan.createdAt || new Date().toISOString(),
        };
        data.plans.push(planWithCreatedAt);
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
