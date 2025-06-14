import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeProjectContext } from "./project/project-context";
import { exposeConfigContext } from "./config/config-context";
import { exposeScriptContext } from "./script/script-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeProjectContext();
  exposeConfigContext();
  exposeScriptContext();
}
