import { ipcMain } from "electron";
import { ProjectManager } from "./project-manager";
import { SceneManager } from "./scene-manager";
import { AssetManager } from "./asset-manager";
import { FileSystemManager } from "./file-system-manager";

export class ProjectService {
  private projectManager: ProjectManager;
  private sceneManager: SceneManager;
  private assetManager: AssetManager;
  private fileSystemManager: FileSystemManager;

  constructor() {
    this.projectManager = new ProjectManager();
    this.sceneManager = new SceneManager(this.projectManager);
    this.assetManager = new AssetManager();
    this.fileSystemManager = new FileSystemManager();
  }

  // Project Management - delegate to ProjectManager
  async loadProjects(): Promise<GameProject[]> {
    return this.projectManager.loadProjects();
  }

  async createProject(
    projectName: string,
    customPath?: string,
  ): Promise<GameProject> {
    const project = await this.projectManager.createProject(projectName, customPath);
    
    // Create default scene using SceneManager
    const defaultScene = this.sceneManager.createDefaultScene();
    await this.sceneManager.saveScene(project.path, defaultScene);
    
    return project;
  }

  async selectProjectDirectory(): Promise<string | undefined> {
    return this.projectManager.selectProjectDirectory();
  }

  async openProject(projectPath: string): Promise<GameProject> {
    return this.projectManager.openProject(projectPath);
  }

  async saveProject(project: GameProject): Promise<void> {
    return this.projectManager.saveProject(project);
  }

  async openProjectFolder(projectPath: string): Promise<void> {
    return this.projectManager.openProjectFolder(projectPath);
  }

  // Scene Management - delegate to SceneManager
  async loadScene(projectPath: string, sceneName: string): Promise<GameScene> {
    return this.sceneManager.loadScene(projectPath, sceneName);
  }

  async saveScene(projectPath: string, scene: GameScene): Promise<void> {
    return this.sceneManager.saveScene(projectPath, scene);
  }

  async createScene(
    projectPath: string,
    sceneName: string,
  ): Promise<GameScene> {
    return this.sceneManager.createScene(projectPath, sceneName);
  }

  async listScenes(projectPath: string): Promise<string[]> {
    return this.sceneManager.listScenes(projectPath);
  }

  // Asset Management - delegate to AssetManager
  async selectAssetFiles(): Promise<string[]> {
    return this.assetManager.selectAssetFiles();
  }

  async importAssetFromData(
    projectPath: string,
    fileName: string,
    fileData: Buffer,
  ): Promise<AssetReference> {
    return this.assetManager.importAssetFromData(projectPath, fileName, fileData);
  }

  async importAsset(
    projectPath: string,
    assetPath: string,
  ): Promise<AssetReference> {
    return this.assetManager.importAsset(projectPath, assetPath);
  }

  async deleteAsset(projectPath: string, assetId: string): Promise<void> {
    return this.assetManager.deleteAsset(projectPath, assetId);
  }

  async getAssets(projectPath: string): Promise<AssetReference[]> {
    return this.assetManager.getAssets(projectPath);
  }

  async getAssetDataUrl(
    projectPath: string,
    assetPath: string,
  ): Promise<string | null> {
    return this.assetManager.getAssetDataUrl(projectPath, assetPath);
  }

  async getAssetUrl(
    projectPath: string,
    assetPath: string,
  ): Promise<string | null> {
    return this.assetManager.getAssetUrl(projectPath, assetPath);
  }

  async getAssetServerPort(projectPath: string): Promise<number> {
    return this.assetManager.getAssetServerPort(projectPath);
  }

  // File System Operations - delegate to FileSystemManager
  async readFile(filePath: string): Promise<string> {
    return this.fileSystemManager.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    return this.fileSystemManager.writeFile(filePath, content);
  }

  async fileExists(filePath: string): Promise<boolean> {
    return this.fileSystemManager.fileExists(filePath);
  }

  async listDirectory(dirPath: string): Promise<import('./file-system-manager').FileSystemItem[]> {
    return this.fileSystemManager.listDirectory(dirPath);
  }

  async getFileStats(filePath: string): Promise<{ size: number; modified: Date }> {
    return this.fileSystemManager.getFileStats(filePath);
  }

  async createFile(filePath: string, content: string = ""): Promise<void> {
    return this.fileSystemManager.createFile(filePath, content);
  }

  async createDirectory(dirPath: string): Promise<void> {
    return this.fileSystemManager.createDirectory(dirPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.fileSystemManager.deleteFile(filePath);
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    return this.fileSystemManager.deleteDirectory(dirPath);
  }

  async renameItem(oldPath: string, newPath: string): Promise<void> {
    return this.fileSystemManager.renameItem(oldPath, newPath);
  }

  // IPC Registration - unchanged
  registerIpcHandlers() {
    ipcMain.handle("project:load-projects", () => this.loadProjects());
    ipcMain.handle(
      "project:create-project",
      (_, projectName: string, projectPath?: string) =>
        this.createProject(projectName, projectPath),
    );
    ipcMain.handle("project:select-directory", () =>
      this.selectProjectDirectory(),
    );
    ipcMain.handle("project:open-project", (_, projectPath: string) =>
      this.openProject(projectPath),
    );
    ipcMain.handle("project:save-project", (_, project: GameProject) =>
      this.saveProject(project),
    );
    ipcMain.handle("project:open-folder", (_, projectPath: string) =>
      this.openProjectFolder(projectPath),
    );
    ipcMain.handle(
      "project:load-scene",
      (_, projectPath: string, sceneName: string) =>
        this.loadScene(projectPath, sceneName),
    );
    ipcMain.handle(
      "project:save-scene",
      (_, projectPath: string, scene: GameScene) =>
        this.saveScene(projectPath, scene),
    );
    ipcMain.handle(
      "project:create-scene",
      (_, projectPath: string, sceneName: string) =>
        this.createScene(projectPath, sceneName),
    );
    ipcMain.handle("project:list-scenes", (_, projectPath: string) =>
      this.listScenes(projectPath),
    );

    // Asset Management
    ipcMain.handle("project:select-asset-files", () => this.selectAssetFiles());
    ipcMain.handle(
      "project:import-asset-from-data",
      (_, projectPath: string, fileName: string, fileData: Buffer) =>
        this.importAssetFromData(projectPath, fileName, fileData),
    );
    ipcMain.handle(
      "project:import-asset",
      (_, projectPath: string, assetPath: string) =>
        this.importAsset(projectPath, assetPath),
    );
    ipcMain.handle(
      "project:delete-asset",
      (_, projectPath: string, assetId: string) =>
        this.deleteAsset(projectPath, assetId),
    );
    ipcMain.handle("project:get-assets", (_, projectPath: string) =>
      this.getAssets(projectPath),
    );
    ipcMain.handle(
      "project:get-asset-data-url",
      (_, projectPath: string, assetPath: string) =>
        this.getAssetDataUrl(projectPath, assetPath),
    );
    ipcMain.handle(
      "project:get-asset-url",
      (_, projectPath: string, assetPath: string) =>
        this.getAssetUrl(projectPath, assetPath),
    );
    ipcMain.handle("project:get-asset-server-port", (_, projectPath: string) =>
      this.getAssetServerPort(projectPath),
    );

    // File System Operations
    ipcMain.handle("project:read-file", (_, filePath: string) =>
      this.readFile(filePath),
    );
    ipcMain.handle(
      "project:write-file",
      (_, filePath: string, content: string) =>
        this.writeFile(filePath, content),
    );
    ipcMain.handle("project:file-exists", (_, filePath: string) =>
      this.fileExists(filePath),
    );
    ipcMain.handle("project:list-directory", (_, dirPath: string) =>
      this.listDirectory(dirPath),
    );
    ipcMain.handle("project:get-file-stats", (_, filePath: string) =>
      this.getFileStats(filePath),
    );
    ipcMain.handle("project:create-file", (_, filePath: string, content: string) =>
      this.createFile(filePath, content),
    );
    ipcMain.handle("project:create-directory", (_, dirPath: string) =>
      this.createDirectory(dirPath),
    );
    ipcMain.handle("project:delete-file", (_, filePath: string) =>
      this.deleteFile(filePath),
    );
    ipcMain.handle("project:delete-directory", (_, dirPath: string) =>
      this.deleteDirectory(dirPath),
    );
    ipcMain.handle("project:rename-item", (_, oldPath: string, newPath: string) =>
      this.renameItem(oldPath, newPath),
    );
  }
}
