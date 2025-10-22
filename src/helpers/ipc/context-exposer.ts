import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import "./magister/magister-context";
import "./studentdb/studentdb-context";
import "./curriculum/curriculum-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
}
