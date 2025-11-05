import { exposeThemeContext } from "./theme/theme-context";
import { exposeThemeGlobalSettings } from "./theme/theme-global-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeTestAPI } from "./test/test-context";
import { exposeSettingsAPI } from "./settings/settings-context";
import { exposeExamnetAPI } from "./examnet/examnet-context";
import "./magister/magister-context";
import "./studentdb/studentdb-context";
import "./curriculum/curriculum-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeThemeGlobalSettings();
  exposeTestAPI();
  exposeSettingsAPI();
  exposeExamnetAPI();
}
