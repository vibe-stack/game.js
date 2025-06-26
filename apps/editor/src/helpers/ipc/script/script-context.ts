import { contextBridge, ipcRenderer } from "electron";
import {
  SCRIPT_START_WATCHING_CHANNEL,
  SCRIPT_STOP_WATCHING_CHANNEL,
  SCRIPT_COMPILE_CHANNEL,
  SCRIPT_GET_COMPILED_SCRIPTS_CHANNEL,
  SCRIPT_COMPILATION_STATUS_CHANNEL,
  SCRIPT_GET_IMPORT_MAP_CHANNEL,
  SCRIPT_READ_COMPILED_CHANNEL
} from "./script-channels";

export function exposeScriptContext() {
  contextBridge.exposeInMainWorld("scriptAPI", {
    startWatching: (projectPath: string) => 
      ipcRenderer.invoke(SCRIPT_START_WATCHING_CHANNEL, projectPath),
    stopWatching: (projectPath: string) => 
      ipcRenderer.invoke(SCRIPT_STOP_WATCHING_CHANNEL, projectPath),
    compileScript: (projectPath: string, scriptPath: string) => 
      ipcRenderer.invoke(SCRIPT_COMPILE_CHANNEL, projectPath, scriptPath),
    getCompiledScripts: (projectPath: string) => 
      ipcRenderer.invoke(SCRIPT_GET_COMPILED_SCRIPTS_CHANNEL, projectPath),
    getCompilationStatus: (projectPath: string) => 
      ipcRenderer.invoke(SCRIPT_COMPILATION_STATUS_CHANNEL, projectPath),
    getImportMap: (projectPath: string) => 
      ipcRenderer.invoke(SCRIPT_GET_IMPORT_MAP_CHANNEL, projectPath),
    readCompiledScript: (projectPath: string, scriptPath: string) => 
      ipcRenderer.invoke(SCRIPT_READ_COMPILED_CHANNEL, projectPath, scriptPath),
  });
} 