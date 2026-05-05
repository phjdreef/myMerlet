/**
 * Data migration service
 * Handles migrating existing data to new schema versions
 */
import { app } from "electron";
import path from "path";
import { promises as fsPromises } from "fs";
import { getCurrentSchoolYear } from "../utils/school-year";
import { logger } from "../utils/logger";

interface MigrationStatus {
  lastMigration: string | null;
  migrations: string[];
}

let migrationStatusCache: MigrationStatus | null = null;

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the migration status file path
 */
function getMigrationStatusPath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "migration_status.json");
}

/**
 * Read migration status
 */
async function readMigrationStatus(): Promise<MigrationStatus> {
  if (migrationStatusCache) {
    return migrationStatusCache;
  }

  const filePath = getMigrationStatusPath();
  if (!(await pathExists(filePath))) {
    migrationStatusCache = { lastMigration: null, migrations: [] };
    return migrationStatusCache;
  }

  try {
    const content = await fsPromises.readFile(filePath, "utf-8");
    migrationStatusCache = JSON.parse(content) as MigrationStatus;
    return migrationStatusCache;
  } catch (error) {
    logger.error("Failed to read migration status:", error);
    migrationStatusCache = { lastMigration: null, migrations: [] };
    return migrationStatusCache;
  }
}

/**
 * Write migration status
 */
async function writeMigrationStatus(status: MigrationStatus): Promise<void> {
  migrationStatusCache = status;
  const filePath = getMigrationStatusPath();
  await fsPromises.writeFile(filePath, JSON.stringify(status, null, 2));
}

/**
 * Mark a migration as completed
 */
async function markMigrationComplete(migrationName: string): Promise<void> {
  const status = await readMigrationStatus();
  if (!status.migrations.includes(migrationName)) {
    status.migrations.push(migrationName);
    status.lastMigration = migrationName;
    await writeMigrationStatus(status);
    logger.log(`Migration completed: ${migrationName}`);
  }
}

/**
 * Check if a migration has been completed
 */
async function isMigrationComplete(migrationName: string): Promise<boolean> {
  const status = await readMigrationStatus();
  return status.migrations.includes(migrationName);
}

type SchoolYearMigrationItem = {
  schoolYear?: string;
};

interface SchoolYearFileMigrationOptions {
  migrationName: string;
  fileName: string;
  missingFileMessage: string;
  migratedLabel: string;
  getItems: (parsedData: unknown) => SchoolYearMigrationItem[] | null;
}

async function migrateSchoolYearFile(
  options: SchoolYearFileMigrationOptions,
): Promise<void> {
  const {
    migrationName,
    fileName,
    missingFileMessage,
    migratedLabel,
    getItems,
  } = options;

  if (await isMigrationComplete(migrationName)) {
    logger.debug(`Migration ${migrationName} already completed, skipping`);
    return;
  }

  const userDataPath = app.getPath("userData");
  const filePath = path.join(userDataPath, fileName);

  if (!(await pathExists(filePath))) {
    logger.debug(missingFileMessage);
    await markMigrationComplete(migrationName);
    return;
  }

  try {
    const content = await fsPromises.readFile(filePath, "utf-8");
    const parsedData = JSON.parse(content) as unknown;
    const items = getItems(parsedData);
    const defaultSchoolYear = getCurrentSchoolYear();
    let migrated = 0;

    if (items) {
      for (const item of items) {
        if (!item.schoolYear) {
          item.schoolYear = defaultSchoolYear;
          migrated++;
        }
      }

      if (migrated > 0) {
        await fsPromises.writeFile(
          filePath,
          JSON.stringify(parsedData, null, 2),
        );
        logger.log(
          `Migrated ${migrated} ${migratedLabel} to have schoolYear field`,
        );
      }
    }

    await markMigrationComplete(migrationName);
  } catch (error) {
    logger.error(`Failed to migrate ${migratedLabel} schoolYear:`, error);
  }
}

/**
 * Migration: Add schoolYear field to existing students
 */
async function migrateStudentsSchoolYear(): Promise<void> {
  await migrateSchoolYearFile({
    migrationName: "students_school_year_v1",
    fileName: "magister_students.json",
    missingFileMessage: "Students file does not exist, skipping migration",
    migratedLabel: "students",
    getItems: (parsedData: unknown): SchoolYearMigrationItem[] | null => {
      if (!parsedData || typeof parsedData !== "object") {
        return null;
      }

      const students = (parsedData as { students?: unknown }).students;
      return Array.isArray(students)
        ? (students as SchoolYearMigrationItem[])
        : null;
    },
  });
}

/**
 * Migration: Add schoolYear field to existing tests
 */
async function migrateTestsSchoolYear(): Promise<void> {
  await migrateSchoolYearFile({
    migrationName: "tests_school_year_v1",
    fileName: "tests.json",
    missingFileMessage: "Tests file does not exist, skipping migration",
    migratedLabel: "tests",
    getItems: (parsedData: unknown): SchoolYearMigrationItem[] | null =>
      Array.isArray(parsedData)
        ? (parsedData as SchoolYearMigrationItem[])
        : null,
  });
}

/**
 * Migration: Add schoolYear field to existing grades
 */
async function migrateGradesSchoolYear(): Promise<void> {
  await migrateSchoolYearFile({
    migrationName: "grades_school_year_v1",
    fileName: "grades.json",
    missingFileMessage: "Grades file does not exist, skipping migration",
    migratedLabel: "grades",
    getItems: (parsedData: unknown): SchoolYearMigrationItem[] | null =>
      Array.isArray(parsedData)
        ? (parsedData as SchoolYearMigrationItem[])
        : null,
  });
}

/**
 * Migration: Add schoolYear field to existing seating positions in localStorage
 * Note: This needs to be handled differently as localStorage is in the renderer process
 * We'll export a function that can be called from the renderer
 */
export function migrateSeatingPositionsSchoolYear(
  currentSchoolYear: string,
): void {
  try {
    const saved = localStorage.getItem("classroom_seating_positions");
    if (!saved) {
      return;
    }

    const positionsData = JSON.parse(saved) as Record<
      string,
      Array<{
        studentId: number;
        row: number;
        col: number;
        className: string;
        schoolYear?: string;
      }>
    >;

    let migrated = 0;
    for (const positions of Object.values(positionsData)) {
      for (const position of positions) {
        if (!position.schoolYear) {
          position.schoolYear = currentSchoolYear;
          migrated++;
        }
      }
    }

    if (migrated > 0) {
      localStorage.setItem(
        "classroom_seating_positions",
        JSON.stringify(positionsData),
      );
      logger.log(
        `Migrated ${migrated} seating positions to have schoolYear field`,
      );
    }
  } catch (error) {
    logger.error("Failed to migrate seating positions schoolYear:", error);
  }
}

/**
 * Migration: Move paragraph study goals from studyGoals array to paragraph.studyGoals field
 */
async function migrateParagraphStudyGoals(): Promise<void> {
  const migrationName = "paragraph_study_goals_v1";

  if (await isMigrationComplete(migrationName)) {
    logger.debug(`Migration ${migrationName} already completed, skipping`);
    return;
  }

  const userDataPath = app.getPath("userData");
  const curriculumPath = path.join(userDataPath, "curriculum_plans.json");

  if (!(await pathExists(curriculumPath))) {
    logger.debug("Curriculum plans file does not exist, skipping migration");
    await markMigrationComplete(migrationName);
    return;
  }

  try {
    const content = await fsPromises.readFile(curriculumPath, "utf-8");
    type CurriculumParagraph = {
      id: string;
      studyGoals?: string;
    };
    type CurriculumStudyGoal = {
      paragraphIds?: string[];
      title?: string;
      description?: string;
    };
    type CurriculumPlanMigration = {
      paragraphs?: CurriculumParagraph[];
      studyGoals?: CurriculumStudyGoal[];
    };
    const data = JSON.parse(content) as { plans?: CurriculumPlanMigration[] };
    let migrated = 0;

    if (data.plans && Array.isArray(data.plans)) {
      for (const plan of data.plans) {
        if (!plan.paragraphs || !plan.studyGoals) continue;

        // For each paragraph, find studyGoals that reference it
        for (const paragraph of plan.paragraphs) {
          const paragraphGoals: CurriculumStudyGoal[] = plan.studyGoals.filter(
            (goal: CurriculumStudyGoal): boolean => {
              const paragraphIds = goal.paragraphIds;
              return (
                Array.isArray(paragraphIds) &&
                paragraphIds.includes(paragraph.id) &&
                (!goal.title || goal.title.trim() === "")
              );
            },
          );

          if (paragraphGoals.length > 0) {
            // Combine all paragraph goals into one rich text field
            const combinedGoals = paragraphGoals
              .map(
                (goal: CurriculumStudyGoal): string => goal.description || "",
              )
              .filter((desc: string): boolean => desc.trim() !== "")
              .join("<br><br>");

            if (combinedGoals) {
              paragraph.studyGoals = combinedGoals;
              migrated++;
            }

            // Remove these goals from the studyGoals array
            const paragraphGoalSet = new Set<CurriculumStudyGoal>(
              paragraphGoals,
            );
            plan.studyGoals = plan.studyGoals.filter(
              (goal: CurriculumStudyGoal): boolean =>
                !paragraphGoalSet.has(goal),
            );
          }
        }
      }

      await fsPromises.writeFile(curriculumPath, JSON.stringify(data, null, 2));
      logger.log(
        `Migrated ${migrated} paragraph study goals to paragraph.studyGoals field`,
      );
    }

    await markMigrationComplete(migrationName);
  } catch (error) {
    logger.error("Failed to migrate paragraph study goals:", error);
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  logger.log("Running data migrations...");

  await migrateStudentsSchoolYear();
  await migrateTestsSchoolYear();
  await migrateGradesSchoolYear();
  await migrateParagraphStudyGoals();

  logger.log("All migrations completed");
}
