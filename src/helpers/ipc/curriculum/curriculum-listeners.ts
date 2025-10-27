import { dialog, ipcMain } from "electron";
import { promises as fs } from "fs";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph as DocParagraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { CURRICULUM_CHANNELS } from "./curriculum-channels";
import {
  curriculumDB,
  type CurriculumPlan,
  type Paragraph as CurriculumParagraph,
} from "../../../services/curriculum-database";
import { logger } from "../../../utils/logger";
import {
  clampWeekNumber,
  generateWeekSequence,
  goalCoversWeek,
  parseSchoolYear,
  getYearForWeek,
} from "../../../utils/curriculum-week";

const CANCELLED_ERROR_CODE = "cancelled";

function sanitizeFileName(input: string): string {
  const cleaned = input.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.length > 0 ? cleaned : "curriculum-plan";
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createBoldParagraph(text: string): DocParagraph {
  return new DocParagraph({
    children: [new TextRun({ text, bold: true })],
  });
}

function buildPlanDocument(plan: CurriculumPlan): Document {
  const parsedYears = parseSchoolYear(plan.schoolYear);
  const startYear = plan.schoolYearStart ?? parsedYears.startYear ?? undefined;
  const endYear = plan.schoolYearEnd ?? parsedYears.endYear ?? undefined;
  const headerParagraphs: DocParagraph[] = [
    new DocParagraph({
      text: plan.subject?.trim()
        ? `${plan.subject.trim()} – Curriculum Overview`
        : "Curriculum Overview",
      heading: HeadingLevel.TITLE,
    }),
    new DocParagraph({
      text: `School year: ${plan.schoolYear || "n/a"}`,
    }),
  ];

  if (plan.classNames.length > 0) {
    headerParagraphs.push(
      new DocParagraph({
        text: `Classes: ${plan.classNames.join(", ")}`,
      }),
    );
  }

  if (startYear) {
    headerParagraphs.push(
      new DocParagraph({
        text: endYear
          ? `Start year: ${startYear} → ${endYear}`
          : `Start year: ${startYear}`,
      }),
    );
  }

  const wrapsYear = plan.weekRangeStart > plan.weekRangeEnd;
  headerParagraphs.push(
    new DocParagraph({
      text: `Weeks covered: ${plan.weekRangeStart} – ${plan.weekRangeEnd}${wrapsYear ? " (wraps over New Year)" : ""}`,
    }),
  );

  headerParagraphs.push(
    new DocParagraph({
      text: `Generated on ${new Date().toLocaleDateString()}`,
    }),
  );

  const weekSequence = generateWeekSequence(
    plan.weekRangeStart,
    plan.weekRangeEnd,
  );
  const paragraphMap = new Map<string, CurriculumParagraph>();
  plan.paragraphs.forEach((paragraph) => {
    paragraphMap.set(paragraph.id, paragraph);
  });

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ children: [createBoldParagraph("Week")] }),
        new TableCell({ children: [createBoldParagraph("Subject")] }),
        new TableCell({ children: [createBoldParagraph("Goals")] }),
        new TableCell({ children: [createBoldParagraph("Paragraphs")] }),
      ],
    }),
  ];

  const subjectText = plan.subject?.trim() || "—";
  weekSequence.forEach((weekNumber) => {
    const goals = plan.studyGoals.filter((goal) =>
      goalCoversWeek(goal, weekNumber),
    );
    const yearForWeek = getYearForWeek(
      weekNumber,
      plan.weekRangeStart,
      plan.weekRangeEnd,
      { startYear, endYear },
      startYear ?? new Date().getFullYear(),
    );

    const goalParagraphs = goals.length
      ? goals.flatMap((goal) => {
          const goalTitle = goal.title?.trim() || "Study goal";
          const startWeek = clampWeekNumber(goal.weekStart);
          const endWeek = clampWeekNumber(goal.weekEnd);
          const rangeLabel =
            startWeek === endWeek ? "" : ` (weeks ${startWeek}-${endWeek})`;
          const paragraphs: DocParagraph[] = [
            new DocParagraph({
              children: [new TextRun({ text: `${goalTitle}${rangeLabel}` })],
              bullet: { level: 0 },
            }),
          ];

          if (goal.description) {
            const description = stripHtml(goal.description);
            if (description) {
              paragraphs.push(
                new DocParagraph({
                  children: [new TextRun({ text: description })],
                  bullet: { level: 1 },
                }),
              );
            }
          }

          return paragraphs;
        })
      : [new DocParagraph({ text: "No goals planned" })];

    const paragraphSummaries = new Map<string, string>();
    goals.forEach((goal) => {
      goal.paragraphIds.forEach((id) => {
        const paragraph = paragraphMap.get(id);
        if (paragraph) {
          const number = paragraph.number ? `§${paragraph.number}` : "§?";
          const title = paragraph.title?.trim() || "Paragraph";
          paragraphSummaries.set(paragraph.id, `${number} ${title}`);
        }
      });
    });

    const paragraphParagraphs = paragraphSummaries.size
      ? Array.from(paragraphSummaries.values()).map(
          (summary) =>
            new DocParagraph({
              children: [new TextRun({ text: summary })],
              bullet: { level: 0 },
            }),
        )
      : [new DocParagraph({ text: "—" })];

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new DocParagraph({
                text: `Week ${weekNumber} (${yearForWeek})`,
              }),
            ],
          }),
          new TableCell({
            children: [new DocParagraph({ text: subjectText })],
          }),
          new TableCell({ children: goalParagraphs }),
          new TableCell({ children: paragraphParagraphs }),
        ],
      }),
    );
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  return new Document({
    sections: [
      {
        children: [...headerParagraphs, new DocParagraph({ text: "" }), table],
      },
    ],
  });
}

export function registerCurriculumListeners() {
  ipcMain.handle(CURRICULUM_CHANNELS.GET_ALL_PLANS, async () => {
    try {
      const plans = await curriculumDB.getAllPlans();
      return { success: true, data: { plans } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get plans",
      };
    }
  });

  ipcMain.handle(
    CURRICULUM_CHANNELS.GET_PLAN_BY_CLASS,
    async (_, className: string) => {
      try {
        const plan = await curriculumDB.getPlanByClass(className);
        return { success: true, data: plan };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get plan",
        };
      }
    },
  );

  ipcMain.handle(
    CURRICULUM_CHANNELS.SAVE_PLAN,
    async (_, plan: CurriculumPlan) => {
      try {
        await curriculumDB.savePlan(plan);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to save plan",
        };
      }
    },
  );

  ipcMain.handle(CURRICULUM_CHANNELS.DELETE_PLAN, async (_, planId: string) => {
    try {
      await curriculumDB.deletePlan(planId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete plan",
      };
    }
  });

  ipcMain.handle(
    CURRICULUM_CHANNELS.EXPORT_PLAN_DOCX,
    async (_, planId: string) => {
      try {
        const plan = await curriculumDB.getPlanById(planId);
        if (!plan) {
          return { success: false, error: "Plan not found" };
        }

        const document = buildPlanDocument(plan);
        const buffer = await Packer.toBuffer(document);
        const defaultName = `${sanitizeFileName(
          `${plan.subject || "curriculum-plan"}-${plan.schoolYear || "plan"}`,
        )}.docx`;

        const { canceled, filePath } = await dialog.showSaveDialog({
          title: "Save curriculum overview",
          defaultPath: defaultName,
          filters: [{ name: "Word Document", extensions: ["docx"] }],
        });

        if (canceled || !filePath) {
          return { success: false, error: CANCELLED_ERROR_CODE };
        }

        await fs.writeFile(filePath, buffer);
        logger.log("Curriculum plan exported to", filePath);

        return { success: true, data: { filePath } };
      } catch (error) {
        logger.error("Failed to export curriculum plan:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to export curriculum plan",
        };
      }
    },
  );
}
