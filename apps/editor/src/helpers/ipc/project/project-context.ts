import { ipcRenderer, contextBridge } from "electron";
import { PROJECT_CHANNELS } from "./project-channels";

export function exposeProjectContext() {
  const projectAPI = {
    loadProjects: () => ipcRenderer.invoke(PROJECT_CHANNELS.LOAD_PROJECTS),
    createProject: (projectName: string) => 
      ipcRenderer.invoke(PROJECT_CHANNELS.CREATE_PROJECT, projectName),
    installPackages: (projectName: string) => 
      ipcRenderer.invoke(PROJECT_CHANNELS.INSTALL_PACKAGES, projectName),
    startDevServer: (projectName: string) => 
      ipcRenderer.invoke(PROJECT_CHANNELS.START_DEV_SERVER, projectName),
    stopDevServer: (projectName: string) => 
      ipcRenderer.invoke(PROJECT_CHANNELS.STOP_DEV_SERVER, projectName),
    openProjectFolder: (projectPath: string) => 
      ipcRenderer.invoke(PROJECT_CHANNELS.OPEN_PROJECT_FOLDER, projectPath),
    isDevServerRunning: (projectName: string) => 
      ipcRenderer.invoke(PROJECT_CHANNELS.IS_DEV_SERVER_RUNNING, projectName),
    getServerInfo: (projectName: string) => 
      ipcRenderer.invoke(PROJECT_CHANNELS.GET_SERVER_INFO, projectName),
  };

  contextBridge.exposeInMainWorld('projectAPI', projectAPI);
} 