import { ipcMain } from "electron";
import { ProjectManager } from "./project-manager";
import { AssetManager } from "./asset-manager";
import { FileSystemManager } from "./file-system-manager";
import type { GameProject, AssetReference } from "../types/project";

export class ProjectService {
  private constructor() {} // Prevent instantiation

  // Project Management
  static async loadProjects(): Promise<GameProject[]> {
    return ProjectManager.loadProjects();
  }

  static async createProject(projectName: string, customPath?: string, template: string = "empty", description?: string, author?: string): Promise<GameProject> {
    return ProjectManager.createProject(projectName, customPath, template, description, author);
  }

  static async selectProjectDirectory(): Promise<string | undefined> {
    return ProjectManager.selectProjectDirectory();
  }

  static async openProject(projectPath: string): Promise<GameProject> {
    return ProjectManager.openProject(projectPath);
  }

  static async saveProject(project: GameProject): Promise<void> {
    return ProjectManager.saveProject(project);
  }

  static async openProjectFolder(projectPath: string): Promise<void> {
    return ProjectManager.openProjectFolder(projectPath);
  }

  static async deleteProject(projectPath: string): Promise<void> {
    return ProjectManager.deleteProject(projectPath);
  }

  // Asset Management
  static async selectAssetFiles(): Promise<string[]> {
    return AssetManager.selectAssetFiles();
  }

  static async importAssetFromData(projectPath: string, fileName: string, fileData: Buffer): Promise<AssetReference> {
    return AssetManager.importAssetFromData(projectPath, fileName, fileData);
  }

  static async importAsset(projectPath: string, assetPath: string): Promise<AssetReference> {
    return AssetManager.importAsset(projectPath, assetPath);
  }

  static async deleteAsset(projectPath: string, assetId: string): Promise<void> {
    return AssetManager.deleteAsset(projectPath, assetId);
  }

  static async getAssets(projectPath: string): Promise<AssetReference[]> {
    return AssetManager.getAssets(projectPath);
  }

  static async getAssetDataUrl(projectPath: string, assetPath: string): Promise<string | null> {
    return AssetManager.getAssetDataUrl(projectPath, assetPath);
  }

  static async getAssetUrl(projectPath: string, assetPath: string): Promise<string | null> {
    return AssetManager.getAssetUrl(projectPath, assetPath);
  }

  static async getAssetServerPort(projectPath: string): Promise<number> {
    return AssetManager.getAssetServerPort(projectPath);
  }

  // File System Operations
  static async readFile(filePath: string): Promise<string> { return FileSystemManager.readFile(filePath); }
  static async writeFile(filePath: string, content: string): Promise<void> { return FileSystemManager.writeFile(filePath, content); }
  static async fileExists(filePath: string): Promise<boolean> { return FileSystemManager.fileExists(filePath); }
  static async listDirectory(dirPath: string): Promise<import('./file-system-manager').FileSystemItem[]> { return FileSystemManager.listDirectory(dirPath); }
  static async getFileStats(filePath: string): Promise<{ size: number; modified: Date }> { return FileSystemManager.getFileStats(filePath); }
  static async createFile(filePath: string, content: string = ""): Promise<void> { return FileSystemManager.createFile(filePath, content); }
  static async createDirectory(dirPath: string): Promise<void> { return FileSystemManager.createDirectory(dirPath); }
  static async deleteFile(filePath: string): Promise<void> { return FileSystemManager.deleteFile(filePath); }
  static async deleteDirectory(dirPath: string): Promise<void> { return FileSystemManager.deleteDirectory(dirPath); }
  static async renameItem(oldPath: string, newPath: string): Promise<void> { return FileSystemManager.renameItem(oldPath, newPath); }

  static registerIpcHandlers() {
    console.log("Registering project IPC handlers...");
    
    // Project
    ipcMain.handle("project:load-projects", () => ProjectService.loadProjects());
    ipcMain.handle("project:create-project", (_, ...args: [string, string?, string?, string?, string?]) => ProjectService.createProject(...args));
    ipcMain.handle("project:select-directory", () => ProjectService.selectProjectDirectory());
    ipcMain.handle("project:open-project", (_, ...args: [string]) => ProjectService.openProject(...args));
    ipcMain.handle("project:save-project", (_, ...args: [GameProject]) => ProjectService.saveProject(...args));
    ipcMain.handle("project:open-folder", (_, ...args: [string]) => ProjectService.openProjectFolder(...args));
    ipcMain.handle("project:delete-project", (_, ...args: [string]) => ProjectService.deleteProject(...args));
    // Assets
    ipcMain.handle("project:select-asset-files", () => ProjectService.selectAssetFiles());
    ipcMain.handle("project:import-asset-from-data", (_, ...args: [string, string, Buffer]) => ProjectService.importAssetFromData(...args));
    ipcMain.handle("project:import-asset", (_, ...args: [string, string]) => ProjectService.importAsset(...args));
    ipcMain.handle("project:delete-asset", (_, ...args: [string, string]) => ProjectService.deleteAsset(...args));
    ipcMain.handle("project:get-assets", (_, ...args: [string]) => ProjectService.getAssets(...args));
    ipcMain.handle("project:get-asset-data-url", (_, ...args: [string, string]) => ProjectService.getAssetDataUrl(...args));
    ipcMain.handle("project:get-asset-url", (_, ...args: [string, string]) => ProjectService.getAssetUrl(...args));
    ipcMain.handle("project:get-asset-server-port", (_, ...args: [string]) => ProjectService.getAssetServerPort(...args));
    // Filesystem
    ipcMain.handle("project:read-file", (_, ...args: [string]) => ProjectService.readFile(...args));
    ipcMain.handle("project:write-file", (_, ...args: [string, string]) => ProjectService.writeFile(...args));
    ipcMain.handle("project:file-exists", (_, ...args: [string]) => ProjectService.fileExists(...args));
    ipcMain.handle("project:list-directory", (_, ...args: [string]) => ProjectService.listDirectory(...args));
    ipcMain.handle("project:get-file-stats", (_, ...args: [string]) => ProjectService.getFileStats(...args));
    ipcMain.handle("project:create-file", (_, ...args: [string, string]) => ProjectService.createFile(...args));
    ipcMain.handle("project:create-directory", (_, ...args: [string]) => ProjectService.createDirectory(...args));
    ipcMain.handle("project:delete-file", (_, ...args: [string]) => ProjectService.deleteFile(...args));
    ipcMain.handle("project:delete-directory", (_, ...args: [string]) => ProjectService.deleteDirectory(...args));
    ipcMain.handle("project:rename-item", (_, ...args: [string, string]) => ProjectService.renameItem(...args));
    
    console.log("Project IPC handlers registered successfully");
  }
}