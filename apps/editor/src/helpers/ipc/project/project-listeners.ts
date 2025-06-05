import { ipcMain } from "electron";
import { PROJECT_CHANNELS } from "./project-channels";
import { projectService } from "../../../main/project-service";

export function addProjectEventListeners() {
  ipcMain.handle(PROJECT_CHANNELS.LOAD_PROJECTS, async () => {
    try {
      return await projectService.loadProjects();
    } catch (error) {
      console.error('Failed to load projects:', error);
      throw error;
    }
  });

  ipcMain.handle(PROJECT_CHANNELS.CREATE_PROJECT, async (_, projectName: string) => {
    try {
      return await projectService.createProject(projectName);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  });

  ipcMain.handle(PROJECT_CHANNELS.INSTALL_PACKAGES, async (_, projectName: string) => {
    try {
      return await projectService.installPackages(projectName);
    } catch (error) {
      console.error('Failed to install packages:', error);
      throw error;
    }
  });

  ipcMain.handle(PROJECT_CHANNELS.START_DEV_SERVER, async (_, projectName: string) => {
    try {
      return await projectService.startDevServer(projectName);
    } catch (error) {
      console.error('Failed to start dev server:', error);
      throw error;
    }
  });

  ipcMain.handle(PROJECT_CHANNELS.STOP_DEV_SERVER, async (_, projectName: string) => {
    try {
      return await projectService.stopDevServer(projectName);
    } catch (error) {
      console.error('Failed to stop dev server:', error);
      throw error;
    }
  });

  ipcMain.handle(PROJECT_CHANNELS.OPEN_PROJECT_FOLDER, async (_, projectPath: string) => {
    try {
      return await projectService.openProjectFolder(projectPath);
    } catch (error) {
      console.error('Failed to open project folder:', error);
      throw error;
    }
  });

  ipcMain.handle(PROJECT_CHANNELS.IS_DEV_SERVER_RUNNING, async (_, projectName: string) => {
    try {
      return projectService.isDevServerRunning(projectName);
    } catch (error) {
      console.error('Failed to check dev server status:', error);
      throw error;
    }
  });

  ipcMain.handle(PROJECT_CHANNELS.GET_SERVER_INFO, async (_, projectName: string) => {
    try {
      return projectService.getServerInfo(projectName);
    } catch (error) {
      console.error('Failed to get server info:', error);
      throw error;
    }
  });
} 