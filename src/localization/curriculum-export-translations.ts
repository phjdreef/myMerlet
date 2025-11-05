// Shared translations for curriculum Word export
// This file can be used in both main and renderer processes

export const curriculumExportTranslations = {
  nl: {
    week: "Week",
    goalParagraphSubject: "Doel, Paragraaf en Onderwerp",
    experiment: "Experiment",
    skills: "Vaardigheden",
    details: "Details",
    noGoalsPlanned: "Geen doelen gepland",
    curriculumOverview: "Curriculum Overzicht",
    schoolYear: "Schooljaar",
    classes: "Klassen",
    startYear: "Startjaar",
    generatedOn: "Gegenereerd op",
    weeksCovered: "Bestreken weken",
    wrapsOverNewYear: "(loopt over Nieuwjaar)",
    page: "Pagina",
    of: "van",
  },
  en: {
    week: "Week",
    goalParagraphSubject: "Goal, Paragraph and Subject",
    experiment: "Experiment",
    skills: "Skills",
    details: "Details",
    noGoalsPlanned: "No goals planned",
    curriculumOverview: "Curriculum Overview",
    schoolYear: "School year",
    classes: "Classes",
    startYear: "Start year",
    generatedOn: "Generated on",
    weeksCovered: "Weeks covered",
    wrapsOverNewYear: "(wraps over New Year)",
    page: "Page",
    of: "of",
  },
} as const;

export type CurriculumExportLanguage =
  keyof typeof curriculumExportTranslations;
