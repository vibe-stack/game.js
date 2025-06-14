import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addConfigEventListeners } from "./config/config-listeners";
import { addScriptEventListeners } from "./script/script-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  addConfigEventListeners();
  addScriptEventListeners();
}
