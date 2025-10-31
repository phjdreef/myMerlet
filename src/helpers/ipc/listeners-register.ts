import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addThemeGlobalSettingsListeners } from "./theme/theme-global-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addMagisterEventListeners } from "./magister/magister-listeners";
import { addStudentDBEventListeners } from "./studentdb/studentdb-listeners";
import { registerCurriculumListeners } from "./curriculum/curriculum-listeners";
import { registerTestListeners } from "./test/test-listeners";
import { registerSettingsListeners } from "./settings/settings-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  addThemeGlobalSettingsListeners();
  addMagisterEventListeners();
  addStudentDBEventListeners();
  registerCurriculumListeners();
  registerTestListeners();
  registerSettingsListeners();
}
