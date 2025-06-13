import { contextBridge, ipcRenderer } from "electron";
import {
  CONFIG_READ_FILE_CHANNEL,
  CONFIG_WRITE_FILE_CHANNEL,
  CONFIG_INSTALL_PACKAGES_CHANNEL,
  CONFIG_GET_PACKAGE_INFO_CHANNEL
} from "./config-channels";

export function exposeConfigContext() {
  contextBridge.exposeInMainWorld("configAPI", {
    readConfigFile: (filePath: string) => 
      ipcRenderer.invoke(CONFIG_READ_FILE_CHANNEL, filePath),
    writeConfigFile: (filePath: string, content: any) => 
      ipcRenderer.invoke(CONFIG_WRITE_FILE_CHANNEL, filePath, content),
    installPackages: (projectPath: string, packageManager: string, packages?: string[]) => 
      ipcRenderer.invoke(CONFIG_INSTALL_PACKAGES_CHANNEL, projectPath, packageManager, packages),
    getPackageInfo: (projectPath: string) => 
      ipcRenderer.invoke(CONFIG_GET_PACKAGE_INFO_CHANNEL, projectPath),
  });
} 