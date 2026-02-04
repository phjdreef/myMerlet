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
  TextRun,
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
  normal: { font: "Calibri", size: 22 } as const, // 11pt
  bold: { font: "Calibri", size: 22, bold: true } as const, // 11pt bold
  title: { font: "Calibri", size: 36, bold: true, color: "1f3864" } as const, // 18pt bold dark blue
  subtitle: {
    font: "Calibri",
    size: 24,
    color: "5b9bd5",
    italics: true,
  } as const, // 12pt blue italic
  metadata: { font: "Calibri", size: 20, color: "7f7f7f" } as const, // 10pt gray
  small: { font: "Calibri", size: 18 } as const, // 9pt
  weekNumber: {
    font: "Calibri",
    size: 24,
    bold: true,
    color: "1f3864",
  } as const, // 12pt bold dark blue
  weekDate: { font: "Calibri", size: 18, color: "7f7f7f" } as const, // 9pt gray
  tableHeader: {
    font: "Calibri",
    size: 22,
    bold: true,
    color: "ffffff",
  } as const, // 11pt bold white
};

function sanitizeFileName(input: string): string {
  const cleaned = input.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.length > 0 ? cleaned : "curriculum-plan";
}

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n") // Convert <br> and <br/> to newlines
    .replace(/<\/p>/gi, "\n") // Convert closing </p> to newline
    .replace(/<[^>]+>/g, "") // Remove all remaining HTML tags
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

// function createBoldParagraph(text: string): DocParagraph {
//   return new DocParagraph({
//     children: [
//       new TextRun({
//         text,
//         ...FONT_STYLES.bold,
//       }),
//     ],
//   });
// }

// function createNormalParagraph(text: string): DocParagraph {
//   return new DocParagraph({
//     children: [
//       new TextRun({
//         text,
//         ...FONT_STYLES.normal,
//       }),
//     ],
//   });
// }

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
  // Determine if this is a class-specific plan
  const isClassSpecific =
    plan.isTemplate === false && plan.classNames.length === 1;

  const headerParagraphs: DocParagraph[] = [
    new DocParagraph({
      children: [
        new TextRun({
          text:
            isClassSpecific && plan.classNames[0]
              ? `Curriculum planner klas ${plan.classNames[0]}`
              : plan.subject?.trim()
                ? `${plan.subject.trim()} – ${t.curriculumOverview}`
                : t.curriculumOverview,
          ...FONT_STYLES.title,
        }),
      ],
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    }),
  ];

  // Subtitle for class-specific plans
  if (isClassSpecific) {
    const subtitleParts: string[] = [];
    if (plan.subject?.trim()) subtitleParts.push(plan.subject.trim());
    if (plan.yearLevel?.trim()) subtitleParts.push(plan.yearLevel.trim());
    if (plan.description?.trim()) subtitleParts.push(plan.description.trim());

    if (subtitleParts.length > 0) {
      headerParagraphs.push(
        new DocParagraph({
          children: [
            new TextRun({
              text: subtitleParts.join(" - "),
              ...FONT_STYLES.subtitle,
            }),
          ],
          spacing: { after: 200 },
        }),
      );
    }
  }

  headerParagraphs.push(
    new DocParagraph({
      children: [
        new TextRun({
          text: `${t.schoolYear}: ${plan.schoolYear || "n/a"}`,
          ...FONT_STYLES.metadata,
        }),
      ],
    }),
  );

  if (plan.yearLevel?.trim()) {
    const yearLevelLabel = language === "nl" ? "Leerjaar" : "Year level";
    headerParagraphs.push(
      new DocParagraph({
        children: [
          new TextRun({
            text: `${yearLevelLabel}: ${plan.yearLevel.trim()}`,
            ...FONT_STYLES.metadata,
          }),
        ],
      }),
    );
  }

  if (!isClassSpecific && plan.classNames.length > 0) {
    headerParagraphs.push(
      new DocParagraph({
        children: [
          new TextRun({
            text: `${t.classes}: ${plan.classNames.join(", ")}`,
            ...FONT_STYLES.metadata,
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
            ...FONT_STYLES.metadata,
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
          ...FONT_STYLES.metadata,
        }),
      ],
    }),
  );

  headerParagraphs.push(
    new DocParagraph({
      children: [
        new TextRun({
          text: `${t.generatedOn} ${formatDateShort(new Date(), language)}`,
          ...FONT_STYLES.metadata,
        }),
      ],
      spacing: { after: 300 },
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

  const topicMap = new Map<string, string>();
  plan.topics.forEach((topic) => {
    topicMap.set(topic.id, topic.name?.trim() || "Topic");
  });

  const contentParagraphs: DocParagraph[] = [...headerParagraphs];

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

    // Week header
    contentParagraphs.push(
      new DocParagraph({
        children: [
          new TextRun({
            text: `WEEK ${weekNumber}  `,
            ...FONT_STYLES.weekNumber,
          }),
          new TextRun({
            text: formatWeekRange(weekNumber, yearForWeek),
            ...FONT_STYLES.weekDate,
          }),
        ],
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: "4472C4",
            space: 1,
            style: "single",
            size: 6,
          },
        },
      }),
    );

    if (goals.length === 0) {
      contentParagraphs.push(
        new DocParagraph({
          children: [
            new TextRun({
              text: t.noGoalsPlanned,
              ...FONT_STYLES.normal,
              italics: true,
              color: "999999",
            }),
          ],
          spacing: { after: 200 },
        }),
      );
    } else {
      goals.forEach((goal, goalIndex) => {
        // Collect all paragraphs for this goal first
        const goalParagraphs: DocParagraph[] = [];

        // Goal title
        const goalTitle = goal.title?.trim() || "Study goal";
        goalParagraphs.push(
          new DocParagraph({
            children: [
              new TextRun({
                text: goalTitle,
                ...FONT_STYLES.bold,
                size: 24, // 12pt
              }),
            ],
            spacing: { before: goalIndex > 0 ? 300 : 100, after: 100 },
            keepNext: true,
            keepLines: true,
          }),
        );

        // Description
        if (goal.description) {
          const description = stripHtml(goal.description);
          if (description) {
            const lines = description.split("\n");
            lines.forEach((line) => {
              goalParagraphs.push(
                new DocParagraph({
                  children: [
                    new TextRun({
                      text: line || " ",
                      ...FONT_STYLES.normal,
                    }),
                  ],
                  keepNext: true,
                  keepLines: true,
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
              const number = paragraph.number ? `§${paragraph.number}` : "";
              const title = paragraph.title?.trim() || "Paragraph";
              const displayText = number ? `${number} ${title}` : title;

              goalParagraphs.push(
                new DocParagraph({
                  children: [
                    new TextRun({
                      text: displayText,
                      ...FONT_STYLES.normal,
                      color: "4472C4",
                      bold: true,
                    }),
                  ],
                  indent: { left: 360 },
                  keepNext: true,
                  keepLines: true,
                }),
              );

              // Add study goals if present
              if (paragraph.studyGoals) {
                const studyGoalsText = stripHtml(paragraph.studyGoals);
                if (studyGoalsText) {
                  const lines = studyGoalsText.split("\n");
                  lines.forEach((line) => {
                    if (line.trim()) {
                      goalParagraphs.push(
                        new DocParagraph({
                          children: [
                            new TextRun({
                              text: line.trim(),
                              ...FONT_STYLES.normal,
                              color: "666666",
                            }),
                          ],
                          indent: { left: 720 },
                          keepNext: true,
                          keepLines: true,
                        }),
                      );
                    }
                  });
                }
              }
            }
          });
        }

        // Topics
        if (goal.topicIds && goal.topicIds.length > 0) {
          goal.topicIds.forEach((topicId) => {
            const topic = plan.topics?.find((t) => t.id === topicId);
            if (topic) {
              goalParagraphs.push(
                new DocParagraph({
                  children: [
                    new TextRun({
                      text: topic.name,
                      ...FONT_STYLES.normal,
                      color: "5b9bd5",
                      bold: true,
                    }),
                  ],
                  indent: { left: 360 },
                  keepNext: true,
                  keepLines: true,
                }),
              );

              // Add topic description if present
              if (topic.description) {
                const descText = stripHtml(topic.description);
                if (descText) {
                  const lines = descText.split("\n");
                  lines.forEach((line) => {
                    if (line.trim()) {
                      goalParagraphs.push(
                        new DocParagraph({
                          children: [
                            new TextRun({
                              text: line.trim(),
                              ...FONT_STYLES.normal,
                              color: "666666",
                              italics: true,
                            }),
                          ],
                          indent: { left: 720 },
                          keepNext: true,
                          keepLines: true,
                        }),
                      );
                    }
                  });
                }
              }
            }
          });
        }

        // Skills
        if (goal.skills?.trim()) {
          const lines = goal.skills.trim().split("\n");
          if (lines.length > 0) {
            goalParagraphs.push(
              new DocParagraph({
                children: [
                  new TextRun({
                    text: "Vaardigheden: ",
                    ...FONT_STYLES.bold,
                    size: 20,
                  }),
                ],
                spacing: { before: 100 },
                keepNext: true,
                keepLines: true,
              }),
            );
            lines.forEach((line) => {
              if (line) {
                goalParagraphs.push(
                  new DocParagraph({
                    children: [
                      new TextRun({
                        text: line,
                        ...FONT_STYLES.normal,
                      }),
                    ],
                    indent: { left: 360 },
                    keepNext: true,
                    keepLines: true,
                  }),
                );
              }
            });
          }
        }

        // Details
        if (goal.details?.trim()) {
          const lines = goal.details.trim().split("\n");
          const filteredLines = lines.filter((line) => line);
          if (filteredLines.length > 0) {
            goalParagraphs.push(
              new DocParagraph({
                children: [
                  new TextRun({
                    text: "Details: ",
                    ...FONT_STYLES.bold,
                    size: 20,
                  }),
                ],
                spacing: { before: 100 },
                keepNext: true,
                keepLines: true,
              }),
            );
            filteredLines.forEach((line, lineIndex) => {
              const isLastLine = lineIndex === filteredLines.length - 1;
              goalParagraphs.push(
                new DocParagraph({
                  children: [
                    new TextRun({
                      text: line,
                      ...FONT_STYLES.normal,
                    }),
                  ],
                  indent: { left: 360 },
                  keepNext: !isLastLine,
                  keepLines: true,
                }),
              );
            });
          }
        }

        // Remove keepNext from last paragraph of goal to allow page break after complete goal
        // Note: We keep the existing paragraph structure, but docx will handle page breaks naturally

        // Add all goal paragraphs to content
        contentParagraphs.push(...goalParagraphs);
      });
    }
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
        children: contentParagraphs,
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
    CURRICULUM_CHANNELS.EXPORT_PLAN_PDF,
    async (
      _,
      planId: string,
      language: "nl" | "en" = "nl",
      className?: string,
    ) => {
      try {
        const plan = await curriculumDB.getPlanById(planId);
        if (!plan) {
          return { success: false, error: "Plan not found" };
        }

        const doc = await buildPlanDocument(plan, language);
        const buffer = await Packer.toBuffer(doc);

        // Build filename: subject-yearLevel-schoolYear-className-description.docx
        const parts: string[] = [];

        if (plan.subject?.trim()) {
          parts.push(plan.subject.trim());
        }

        if (plan.yearLevel?.trim()) {
          parts.push(plan.yearLevel.trim());
        }

        if (plan.schoolYear?.trim()) {
          parts.push(plan.schoolYear.trim());
        }

        // Use provided className or fall back to plan's className
        const effectiveClassName =
          className ||
          (plan.classNames && plan.classNames.length > 0
            ? plan.classNames[0]
            : null);
        if (effectiveClassName) {
          parts.push(effectiveClassName);
        }

        if (plan.description?.trim()) {
          parts.push(plan.description.trim());
        }

        const baseName = parts.length > 0 ? parts.join("-") : "curriculum-plan";
        const defaultName = `${sanitizeFileName(baseName)}.docx`;

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
