import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import "./magister/magister-context";
import "./studentdb/studentdb-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
}
