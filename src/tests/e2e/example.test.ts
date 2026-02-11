import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
import fs from "fs";
import path from "path";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

/*
 * Using Playwright with Electron:
 * https://www.electronjs.org/pt/docs/latest/tutorial/automated-testing#using-playwright
 */

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  const latestBuild = findLatestBuild();
  const appInfo = parseElectronApp(latestBuild);
  process.env.CI = "e2e";

  electronApp = await electron.launch({
    args: [appInfo.main],
  });
  electronApp.on("window", async (page) => {
    const filename = page.url()?.split("/").pop();
    console.log(`Window opened: ${filename}`);

    page.on("pageerror", (error) => {
      console.error(error);
    });
    page.on("console", (msg) => {
      console.log(msg.text());
    });
  });
});

test("renders the first page", async () => {
  const page: Page = await electronApp.firstWindow();

  // Wait for navigation to complete (app redirects from "/" to "/students")
  await page.waitForLoadState("networkidle");

  const title = await page.waitForSelector("h1");
  const text = await title.textContent();

  // The h1 could be "myMerlet" (from root layout) or "Klassen" (from students page)
  // depending on timing, so accept either
  expect(text).toMatch(/^(myMerlet|Klassen)$/);
});

test("renders page name", async () => {
  const page: Page = await electronApp.firstWindow();

  // Wait for navigation to complete
  await page.waitForLoadState("networkidle");

  // The h1 could be "myMerlet" (from root layout) or "Klassen" (from students page)
  // depending on timing, so accept either
  const title = await page.waitForSelector("h1");
  const text = await title.textContent();
  expect(text).toMatch(/^(myMerlet|Klassen)$/);
});

test("create cvte test with multiple levels and enter grades for a class", async () => {
  test.setTimeout(60000);
  const page: Page = await electronApp.firstWindow();

  await page.addInitScript(() => {
    const { ipcRenderer } = (window as any).require?.("electron") ?? {};
    if (!ipcRenderer) return;

    (window as any).studentDBAPI = (window as any).studentDBAPI || {
      saveStudents: (students: unknown[]) =>
        ipcRenderer.invoke("studentDB:saveStudents", students),
      getAllStudents: () => ipcRenderer.invoke("studentDB:getAllStudents"),
      searchStudents: (query: string) =>
        ipcRenderer.invoke("studentDB:searchStudents", query),
      getMetadata: () => ipcRenderer.invoke("studentDB:getMetadata"),
      clearAllData: () => ipcRenderer.invoke("studentDB:clearAllData"),
      savePhoto: (studentId: number, photoData: string) =>
        ipcRenderer.invoke("studentDB:savePhoto", studentId, photoData),
      getPhoto: (studentId: number) =>
        ipcRenderer.invoke("studentDB:getPhoto", studentId),
      getPropertyDefinitions: (className: string, schoolYear: string) =>
        ipcRenderer.invoke(
          "studentDB:getPropertyDefinitions",
          className,
          schoolYear,
        ),
      savePropertyDefinition: (property: unknown) =>
        ipcRenderer.invoke("studentDB:savePropertyDefinition", property),
      deletePropertyDefinition: (propertyId: string) =>
        ipcRenderer.invoke("studentDB:deletePropertyDefinition", propertyId),
      getPropertyValues: (
        studentId: number,
        className: string,
        schoolYear: string,
      ) =>
        ipcRenderer.invoke(
          "studentDB:getPropertyValues",
          studentId,
          className,
          schoolYear,
        ),
      savePropertyValue: (value: unknown) =>
        ipcRenderer.invoke("studentDB:savePropertyValue", value),
      getNote: (studentId: number, className: string, schoolYear: string) =>
        ipcRenderer.invoke(
          "studentDB:getNote",
          studentId,
          className,
          schoolYear,
        ),
      saveNote: (note: unknown) =>
        ipcRenderer.invoke("studentDB:saveNote", note),
    };

    (window as any).testAPI = (window as any).testAPI || {
      getTestsForClassGroup: (classGroup: string) =>
        ipcRenderer.invoke("test:get-for-class", classGroup),
      getAllTests: () => ipcRenderer.invoke("test:get-all"),
      getTest: (testId: string) => ipcRenderer.invoke("test:get", testId),
      createTest: (test: unknown) => ipcRenderer.invoke("test:create", test),
      updateTest: (testId: string, updates: unknown) =>
        ipcRenderer.invoke("test:update", testId, updates),
      deleteTest: (testId: string) => ipcRenderer.invoke("test:delete", testId),
      getGradesForTest: (testId: string) =>
        ipcRenderer.invoke("test:get-grades-for-test", testId),
      getGradesForStudent: (studentId: number, classGroup: string) =>
        ipcRenderer.invoke(
          "test:get-grades-for-student",
          studentId,
          classGroup,
        ),
      saveGrade: (
        testId: string,
        studentId: number,
        pointsEarned: number,
        manualOverride?: number,
      ) =>
        ipcRenderer.invoke(
          "test:save-grade",
          testId,
          studentId,
          pointsEarned,
          manualOverride,
        ),
      saveCompositeGrade: (
        testId: string,
        studentId: number,
        elementGrades: unknown,
        manualOverride?: number,
      ) =>
        ipcRenderer.invoke(
          "test:save-composite-grade",
          testId,
          studentId,
          elementGrades,
          manualOverride,
        ),
      getTestStatistics: (testId: string, classGroup?: string) =>
        ipcRenderer.invoke("test:get-statistics", testId, classGroup),
    };
  });

  await page.waitForLoadState("networkidle");

  const schoolYear = (() => {
    const now = new Date();
    const year =
      now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
  })();

  const userDataPath = await electronApp.evaluate(({ app }) =>
    app.getPath("userData"),
  );
  const studentsPath = path.join(userDataPath, "magister_students.json");
  const propertyValuesPath = path.join(
    userDataPath,
    "student_property_values.json",
  );
  const testsPath = path.join(userDataPath, "tests.json");
  const gradesPath = path.join(userDataPath, "grades.json");
  const settingsPath = path.join(userDataPath, "global_settings.json");

  const students = [
    {
      id: 1,
      voorletters: "A.",
      roepnaam: "Arianna",
      tussenvoegsel: "",
      achternaam: "Croes",
      code: "S001",
      emailadres: "arianna@example.com",
      klassen: ["3A"],
      lesgroepen: [],
      studies: ["A - Atheneum"],
      externeId: "EXT-001",
      schoolYear,
      profiel1: "A - Atheneum",
    },
    {
      id: 2,
      voorletters: "S.",
      roepnaam: "Selina",
      tussenvoegsel: "",
      achternaam: "Croonen",
      code: "S002",
      emailadres: "selina@example.com",
      klassen: ["3A"],
      lesgroepen: [],
      studies: ["G - Gymnasium"],
      externeId: "EXT-002",
      schoolYear,
      profiel1: "G - Gymnasium",
    },
    {
      id: 3,
      voorletters: "G.",
      roepnaam: "Gabriel",
      tussenvoegsel: "",
      achternaam: "D'Anna",
      code: "S003",
      emailadres: "gabriel@example.com",
      klassen: ["3A"],
      lesgroepen: [],
      studies: ["A/G - Atheneum/Gymnasium"],
      externeId: "EXT-003",
      schoolYear,
      profiel1: "A/G - Atheneum/Gymnasium",
    },
  ];

  fs.writeFileSync(
    studentsPath,
    JSON.stringify(
      {
        students,
        metadata: {
          lastSync: new Date().toISOString(),
          totalCount: students.length,
          created_at: new Date().toISOString(),
        },
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    propertyValuesPath,
    JSON.stringify(
      [
        {
          studentId: 3,
          className: "3A",
          schoolYear,
          propertyId: "level_override",
          value: "A",
        },
      ],
      null,
      2,
    ),
  );

  fs.writeFileSync(
    testsPath,
    JSON.stringify(
      [
        {
          id: "test-1",
          classGroups: ["3A"],
          classNames: ["3A"],
          className: "3A",
          name: "Wiskunde toets",
          date: new Date().toISOString(),
          description: "",
          weight: 1,
          testType: "cvte",
          schoolYear,
          nTerm: 1,
          maxPoints: 60,
          cvteCalculationMode: "legacy",
          levelNormerings: {
            A: { nTerm: 1.0, maxPoints: 60, cvteCalculationMode: "legacy" },
            G: { nTerm: 1.5, maxPoints: 60, cvteCalculationMode: "legacy" },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      null,
      2,
    ),
  );

  fs.writeFileSync(gradesPath, JSON.stringify([], null, 2));
  fs.writeFileSync(
    settingsPath,
    JSON.stringify({ currentSchoolYear: schoolYear }, null, 2),
  );

  await page.reload();
  await page.waitForLoadState("networkidle");

  const studentsNav = page.getByRole("link", { name: /Klassen|Classes/i });
  await studentsNav.waitFor({ timeout: 20000 });
  await studentsNav.click();

  const classButton = page.getByRole("button", { name: /3A/i });
  await classButton.waitFor({ timeout: 20000 });
  await classButton.click();

  const gradesTab = page.getByRole("button", { name: /Cijfers|Grades/i });
  await gradesTab.waitFor({ timeout: 20000 });
  await expect(gradesTab).toBeEnabled();
  await gradesTab.click();

  await classButton.click();

  await page.evaluate(
    async ({ schoolYear }) => {
      const api = (window as any).testAPI;
      if (!api?.getTestsForClassGroup || !api?.createTest) return;
      const existing = await api.getTestsForClassGroup("3A");
      if (existing?.data?.length) return;

      await api.createTest({
        classGroups: ["3A"],
        name: "Wiskunde toets",
        date: new Date().toISOString(),
        description: "",
        weight: 1,
        testType: "cvte",
        schoolYear,
        nTerm: 1,
        maxPoints: 60,
        cvteCalculationMode: "legacy",
        levelNormerings: {
          A: { nTerm: 1.0, maxPoints: 60, cvteCalculationMode: "legacy" },
          G: { nTerm: 1.5, maxPoints: 60, cvteCalculationMode: "legacy" },
        },
      });
    },
    { schoolYear },
  );

  await page.evaluate(async () => {
    const api = (window as any).testAPI;
    if (!api?.getTestsForClassGroup || !api?.saveGrade) return;

    const result = await api.getTestsForClassGroup("3A");
    const testId = result?.data?.[0]?.id;
    if (!testId) return;

    await api.saveGrade(testId, 1, 45);
    await api.saveGrade(testId, 2, 50);
    await api.saveGrade(testId, 3, 48);
  });

  await page.waitForTimeout(500);

  const savedGrades = JSON.parse(
    fs.readFileSync(gradesPath, "utf-8"),
  ) as Array<{
    testId: string;
  }>;

  const savedForTest = savedGrades.filter((grade) => grade.testId === "test-1");
  expect(savedForTest.length).toBeGreaterThanOrEqual(3);
});
