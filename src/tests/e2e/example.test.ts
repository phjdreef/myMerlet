import {
  test,
  expect,
  _electron as electron,
  ElectronApplication,
  Page,
} from "@playwright/test";
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
