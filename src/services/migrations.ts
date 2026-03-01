/**
 * Data migration service
 * Handles migrating existing data to new schema versions
 */
import { app } from "electron";
import path from "path";
import fs from "fs";
import { getCurrentSchoolYear } from "../utils/school-year";
import { logger } from "../utils/logger";

interface MigrationStatus {
  lastMigration: string | null;
  migrations: string[];
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
function readMigrationStatus(): MigrationStatus {
  const filePath = getMigrationStatusPath();
  if (!fs.existsSync(filePath)) {
    return { lastMigration: null, migrations: [] };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    logger.error("Failed to read migration status:", error);
    return { lastMigration: null, migrations: [] };
  }
}

/**
 * Write migration status
 */
function writeMigrationStatus(status: MigrationStatus): void {
  const filePath = getMigrationStatusPath();
  fs.writeFileSync(filePath, JSON.stringify(status, null, 2));
}

/**
 * Mark a migration as completed
 */
function markMigrationComplete(migrationName: string): void {
  const status = readMigrationStatus();
  if (!status.migrations.includes(migrationName)) {
    status.migrations.push(migrationName);
    status.lastMigration = migrationName;
    writeMigrationStatus(status);
    logger.log(`Migration completed: ${migrationName}`);
  }
}

/**
 * Check if a migration has been completed
 */
function isMigrationComplete(migrationName: string): boolean {
  const status = readMigrationStatus();
  return status.migrations.includes(migrationName);
}

/**
 * Migration: Add schoolYear field to existing students
 */
async function migrateStudentsSchoolYear(): Promise<void> {
  const migrationName = "students_school_year_v1";

  if (isMigrationComplete(migrationName)) {
    logger.debug(`Migration ${migrationName} already completed, skipping`);
    return;
  }

  const userDataPath = app.getPath("userData");
  const studentsPath = path.join(userDataPath, "magister_students.json");

  if (!fs.existsSync(studentsPath)) {
    logger.debug("Students file does not exist, skipping migration");
    markMigrationComplete(migrationName);
    return;
  }

  try {
    const content = fs.readFileSync(studentsPath, "utf-8");
    const data = JSON.parse(content);
    const defaultSchoolYear = getCurrentSchoolYear();
    let migrated = 0;

    if (data.students && Array.isArray(data.students)) {
      for (const student of data.students) {
        if (!student.schoolYear) {
          student.schoolYear = defaultSchoolYear;
          migrated++;
        }
      }

      if (migrated > 0) {
        fs.writeFileSync(studentsPath, JSON.stringify(data, null, 2));
        logger.log(`Migrated ${migrated} students to have schoolYear field`);
      }
    }

    markMigrationComplete(migrationName);
  } catch (error) {
    logger.error(`Failed to migrate students schoolYear:`, error);
  }
}

/**
 * Migration: Add schoolYear field to existing tests
 */
async function migrateTestsSchoolYear(): Promise<void> {
  const migrationName = "tests_school_year_v1";

  if (isMigrationComplete(migrationName)) {
    logger.debug(`Migration ${migrationName} already completed, skipping`);
    return;
  }

  const userDataPath = app.getPath("userData");
  const testsPath = path.join(userDataPath, "tests.json");

  if (!fs.existsSync(testsPath)) {
    logger.debug("Tests file does not exist, skipping migration");
    markMigrationComplete(migrationName);
    return;
  }

  try {
    const content = fs.readFileSync(testsPath, "utf-8");
    const tests = JSON.parse(content);
    const defaultSchoolYear = getCurrentSchoolYear();
    let migrated = 0;

    if (Array.isArray(tests)) {
      for (const test of tests) {
        if (!test.schoolYear) {
          test.schoolYear = defaultSchoolYear;
          migrated++;
        }
      }

      if (migrated > 0) {
        fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));
        logger.log(`Migrated ${migrated} tests to have schoolYear field`);
      }
    }

    markMigrationComplete(migrationName);
  } catch (error) {
    logger.error(`Failed to migrate tests schoolYear:`, error);
  }
}

/**
 * Migration: Add schoolYear field to existing grades
 */
async function migrateGradesSchoolYear(): Promise<void> {
  const migrationName = "grades_school_year_v1";

  if (isMigrationComplete(migrationName)) {
    logger.debug(`Migration ${migrationName} already completed, skipping`);
    return;
  }

  const userDataPath = app.getPath("userData");
  const gradesPath = path.join(userDataPath, "grades.json");

  if (!fs.existsSync(gradesPath)) {
    logger.debug("Grades file does not exist, skipping migration");
    markMigrationComplete(migrationName);
    return;
  }

  try {
    const content = fs.readFileSync(gradesPath, "utf-8");
    const grades = JSON.parse(content);
    const defaultSchoolYear = getCurrentSchoolYear();
    let migrated = 0;

    if (Array.isArray(grades)) {
      for (const grade of grades) {
        if (!grade.schoolYear) {
          grade.schoolYear = defaultSchoolYear;
          migrated++;
        }
      }

      if (migrated > 0) {
        fs.writeFileSync(gradesPath, JSON.stringify(grades, null, 2));
        logger.log(`Migrated ${migrated} grades to have schoolYear field`);
      }
    }

    markMigrationComplete(migrationName);
  } catch (error) {
    logger.error(`Failed to migrate grades schoolYear:`, error);
  }
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

  if (isMigrationComplete(migrationName)) {
    logger.debug(`Migration ${migrationName} already completed, skipping`);
    return;
  }

  const userDataPath = app.getPath("userData");
  const curriculumPath = path.join(userDataPath, "curriculum_plans.json");

  if (!fs.existsSync(curriculumPath)) {
    logger.debug("Curriculum plans file does not exist, skipping migration");
    markMigrationComplete(migrationName);
    return;
  }

  try {
    const content = fs.readFileSync(curriculumPath, "utf-8");
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
          const paragraphGoals = plan.studyGoals.filter(
            (goal) =>
              goal.paragraphIds &&
              goal.paragraphIds.includes(paragraph.id) &&
              (!goal.title || goal.title.trim() === ""),
          );

          if (paragraphGoals.length > 0) {
            // Combine all paragraph goals into one rich text field
            const combinedGoals = paragraphGoals
              .map((goal) => goal.description || "")
              .filter((desc) => desc.trim() !== "")
              .join("<br><br>");

            if (combinedGoals) {
              paragraph.studyGoals = combinedGoals;
              migrated++;
            }

            // Remove these goals from the studyGoals array
            plan.studyGoals = plan.studyGoals.filter(
              (goal) => !paragraphGoals.includes(goal),
            );
          }
        }
      }

      fs.writeFileSync(curriculumPath, JSON.stringify(data, null, 2));
      logger.log(
        `Migrated ${migrated} paragraph study goals to paragraph.studyGoals field`,
      );
    }

    markMigrationComplete(migrationName);
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
