import { dialog, ipcMain } from "electron";
import { promises as fs } from "fs";
import path from "path";
import {
  Document,
  Header,
  Footer,
  HeadingLevel,
  Packer,
  Paragraph as DocParagraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  ImageRun,
  PageNumber,
} from "docx";
import { CURRICULUM_CHANNELS } from "./curriculum-channels";
import {
  curriculumDB,
  type CurriculumPlan,
  type Paragraph as CurriculumParagraph,
} from "../../../services/curriculum-database";
import { logger } from "../../../utils/logger";
import {
  generateWeekSequence,
  goalCoversWeek,
  parseSchoolYear,
  getYearForWeek,
} from "../../../utils/curriculum-week";
import { formatWeekRange } from "../../../utils/week-utils";
import { curriculumExportTranslations } from "../../../localization/curriculum-export-translations";

const CANCELLED_ERROR_CODE = "cancelled";

// Font styles for Word document
const FONT_STYLES = {
  normal: { font: "Arial", size: 20 } as const, // 10pt
  bold: { font: "Arial", size: 20, bold: true } as const, // 10pt bold
  title: { font: "Arial", size: 28, bold: true } as const, // 14pt bold
  small: { font: "Arial", size: 18 } as const, // 9pt
  weekNumber: { font: "Arial", size: 28, bold: true } as const, // 14pt bold
  weekDate: { font: "Arial", size: 18, color: "808080" } as const, // 9pt gray
};

function sanitizeFileName(input: string): string {
  const cleaned = input.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.length > 0 ? cleaned : "curriculum-plan";
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ") // Only collapse spaces and tabs, preserve newlines
    .trim();
}

function formatDateShort(date: Date, language: "nl" | "en"): string {
  const day = date.getDate();
  const month = date
    .toLocaleDateString(language === "nl" ? "nl-NL" : "en-US", {
      month: "short",
    })
    .toLowerCase();
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function createBoldParagraph(text: string): DocParagraph {
  return new DocParagraph({
    children: [
      new TextRun({
        text,
        ...FONT_STYLES.bold,
      }),
    ],
  });
}

function createNormalParagraph(text: string): DocParagraph {
  return new DocParagraph({
    children: [
      new TextRun({
        text,
        ...FONT_STYLES.normal,
      }),
    ],
  });
}

async function loadMerletIcon(): Promise<Buffer> {
  // Try multiple possible paths for the Merlet icon
  const possiblePaths = [
    path.join(__dirname, "../../../../resources/icons/merlet.png"),
    path.join(__dirname, "../../../resources/icons/merlet.png"),
    path.join(__dirname, "../../resources/icons/merlet.png"),
    path.join(process.resourcesPath || "", "icons/merlet.png"),
    path.join(process.cwd(), "resources/icons/merlet.png"),
  ];

  for (const iconPath of possiblePaths) {
    try {
      const buffer = await fs.readFile(iconPath);
      logger.log("Merlet icon loaded from:", iconPath);
      return buffer;
    } catch {
      // Continue to next path
    }
  }

  logger.error("Failed to load Merlet icon from any path");
  return Buffer.from("");
}

async function buildPlanDocument(
  plan: CurriculumPlan,
  language: "nl" | "en" = "nl",
): Promise<Document> {
  const t = curriculumExportTranslations[language];
  const parsedYears = parseSchoolYear(plan.schoolYear);
  const startYear = plan.schoolYearStart ?? parsedYears.startYear ?? undefined;
  const endYear = plan.schoolYearEnd ?? parsedYears.endYear ?? undefined;
  const headerParagraphs: DocParagraph[] = [
    new DocParagraph({
      children: [
        new TextRun({
          text: plan.subject?.trim()
            ? `${plan.subject.trim()} – ${t.curriculumOverview}`
            : t.curriculumOverview,
          ...FONT_STYLES.title,
        }),
      ],
      heading: HeadingLevel.TITLE,
    }),
    new DocParagraph({
      children: [
        new TextRun({
          text: `${t.schoolYear}: ${plan.schoolYear || "n/a"}`,
          ...FONT_STYLES.normal,
        }),
      ],
    }),
  ];

  if (plan.classNames.length > 0) {
    headerParagraphs.push(
      new DocParagraph({
        children: [
          new TextRun({
            text: `${t.classes}: ${plan.classNames.join(", ")}`,
            ...FONT_STYLES.normal,
          }),
        ],
      }),
    );
  }

  if (startYear) {
    headerParagraphs.push(
      new DocParagraph({
        children: [
          new TextRun({
            text: endYear
              ? `${t.startYear}: ${startYear} → ${endYear}`
              : `${t.startYear}: ${startYear}`,
            ...FONT_STYLES.normal,
          }),
        ],
      }),
    );
  }

  const wrapsYear = plan.weekRangeStart > plan.weekRangeEnd;
  headerParagraphs.push(
    new DocParagraph({
      children: [
        new TextRun({
          text: `${t.weeksCovered}: ${plan.weekRangeStart} – ${plan.weekRangeEnd}${wrapsYear ? ` ${t.wrapsOverNewYear}` : ""}`,
          ...FONT_STYLES.normal,
        }),
      ],
    }),
  );

  headerParagraphs.push(
    new DocParagraph({
      children: [
        new TextRun({
          text: `${t.generatedOn} ${formatDateShort(new Date(), language)}`,
          ...FONT_STYLES.normal,
        }),
      ],
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
        new TableCell({ children: [createBoldParagraph(t.week)] }),
        new TableCell({
          children: [createBoldParagraph(t.goalParagraphSubject)],
        }),
        new TableCell({ children: [createBoldParagraph(t.experiment)] }),
        new TableCell({ children: [createBoldParagraph(t.skills)] }),
        new TableCell({ children: [createBoldParagraph(t.details)] }),
      ],
    }),
  ];

  const topicMap = new Map<string, string>();
  plan.topics.forEach((topic) => {
    topicMap.set(topic.id, topic.name?.trim() || "Topic");
  });

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

    // Build combined cell content: Goal, Paragraphs, and Subject
    const combinedContentParagraphs: DocParagraph[] = [];

    if (goals.length === 0) {
      combinedContentParagraphs.push(createNormalParagraph(t.noGoalsPlanned));
    } else {
      goals.forEach((goal, goalIndex) => {
        // Goal title
        const goalTitle = goal.title?.trim() || "Study goal";

        combinedContentParagraphs.push(
          new DocParagraph({
            children: [
              new TextRun({
                text: `${goalTitle}`,
                ...FONT_STYLES.bold,
              }),
            ],
          }),
        );

        // Description
        if (goal.description) {
          const description = stripHtml(goal.description);
          if (description) {
            // Split by newlines and create separate paragraphs for each line
            const lines = description.split("\n");
            lines.forEach((line) => {
              // Create paragraph even for empty lines to preserve spacing
              combinedContentParagraphs.push(
                new DocParagraph({
                  children: [
                    new TextRun({
                      text: line || " ", // Use space for empty lines
                      ...FONT_STYLES.normal,
                    }),
                  ],
                }),
              );
            });
          }
        }

        // Paragraphs
        if (goal.paragraphIds && goal.paragraphIds.length > 0) {
          goal.paragraphIds.forEach((paragraphId) => {
            const paragraph = paragraphMap.get(paragraphId);
            if (paragraph) {
              const number = paragraph.number ? `§${paragraph.number}` : "§?";
              const title = paragraph.title?.trim() || "Paragraph";
              combinedContentParagraphs.push(
                new DocParagraph({
                  children: [
                    new TextRun({
                      text: `${number} ${title}`,
                      ...FONT_STYLES.normal,
                    }),
                  ],
                }),
              );
            }
          });
        }

        // Subject (topics)
        if (goal.topicIds && goal.topicIds.length > 0) {
          goal.topicIds.forEach((topicId) => {
            const topicName = topicMap.get(topicId);
            if (topicName) {
              combinedContentParagraphs.push(
                new DocParagraph({
                  children: [
                    new TextRun({
                      text: topicName,
                      ...FONT_STYLES.normal,
                    }),
                  ],
                }),
              );
            }
          });
        }

        // Add spacing between goals
        if (goalIndex < goals.length - 1) {
          combinedContentParagraphs.push(new DocParagraph({ text: "" }));
        }
      });
    }

    // Collect experiment, skills, and details from all goals for this week
    const experiments: string[] = [];
    const skills: string[] = [];
    const details: string[] = [];

    goals.forEach((goal) => {
      if (goal.experiment?.trim()) {
        // Split by newlines to preserve line breaks
        const lines = goal.experiment.trim().split("\n");
        // Filter out completely empty lines but keep lines with spaces
        experiments.push(...lines.filter((line) => line !== ""));
      }
      if (goal.skills?.trim()) {
        // Split by newlines to preserve line breaks
        const lines = goal.skills.trim().split("\n");
        // Filter out completely empty lines but keep lines with spaces
        skills.push(...lines.filter((line) => line !== ""));
      }
      if (goal.details?.trim()) {
        // Split by newlines to preserve line breaks
        const lines = goal.details.trim().split("\n");
        // Filter out completely empty lines but keep lines with spaces
        details.push(...lines.filter((line) => line !== ""));
      }
    });

    const experimentParagraphs =
      experiments.length > 0
        ? experiments.map((exp) => createNormalParagraph(exp))
        : [createNormalParagraph("")];

    const skillsParagraphs =
      skills.length > 0
        ? skills.map((skill) => createNormalParagraph(skill))
        : [createNormalParagraph("")];

    const detailsParagraphs =
      details.length > 0
        ? details.map((detail) => createNormalParagraph(detail))
        : [createNormalParagraph("")];

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new DocParagraph({
                children: [
                  new TextRun({
                    text: `${weekNumber}`,
                    ...FONT_STYLES.weekNumber,
                  }),
                ],
              }),
              new DocParagraph({
                children: [
                  new TextRun({
                    text: formatWeekRange(weekNumber, yearForWeek),
                    ...FONT_STYLES.weekDate,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({ children: combinedContentParagraphs }),
          new TableCell({ children: experimentParagraphs }),
          new TableCell({ children: skillsParagraphs }),
          new TableCell({ children: detailsParagraphs }),
        ],
      }),
    );
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  // Load Merlet icon for header
  const iconBuffer = await loadMerletIcon();

  // Create header with Merlet icon in the right corner
  const header = new Header({
    children: [
      new DocParagraph({
        alignment: AlignmentType.RIGHT,
        children:
          iconBuffer.length > 0
            ? [
                new ImageRun({
                  data: iconBuffer,
                  transformation: {
                    width: 60,
                    height: 60,
                  },
                  type: "png",
                }),
              ]
            : [],
      }),
      new DocParagraph({ text: "" }), // Empty line for spacing
    ],
  });

  // Create footer with page numbers
  const footer = new Footer({
    children: [
      new DocParagraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: [
              t.page,
              " ",
              PageNumber.CURRENT,
              " ",
              t.of,
              " ",
              PageNumber.TOTAL_PAGES,
            ],
            ...FONT_STYLES.normal,
          }),
        ],
      }),
    ],
  });

  return new Document({
    sections: [
      {
        headers: {
          default: header,
        },
        footers: {
          default: footer,
        },
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
    async (_, planId: string, language: "nl" | "en" = "nl") => {
      try {
        const plan = await curriculumDB.getPlanById(planId);
        if (!plan) {
          return { success: false, error: "Plan not found" };
        }

        const document = await buildPlanDocument(plan, language);
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
