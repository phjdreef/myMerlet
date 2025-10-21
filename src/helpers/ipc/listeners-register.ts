import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addMagisterEventListeners } from "./magister/magister-listeners";
import { addStudentDBEventListeners } from "./studentdb/studentdb-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  addMagisterEventListeners();
  addStudentDBEventListeners();
}
