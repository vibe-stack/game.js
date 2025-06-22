import { ipcMain } from "electron";
import { ProjectManager } from "./project-manager";
import { AssetManager } from "./asset-manager";
import { FileSystemManager } from "./file-system-manager";
import type { GameProject, AssetReference, SceneData } from "../types/project";
import * as path from "path";

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

  // Scene Management
  static async listScenes(projectPath: string): Promise<string[]> {
    const scenesDir = path.join(projectPath, "scenes");
    
    try {
      // Check if scenes directory exists
      if (!(await FileSystemManager.fileExists(scenesDir))) {
        // Create scenes directory if it doesn't exist
        await FileSystemManager.createDirectory(scenesDir);
        return [];
      }
      
      const items = await FileSystemManager.listDirectory(scenesDir);
      const sceneFiles = items
        .filter(item => item.type === 'file' && item.name.endsWith('.scene.json'))
        .map(item => item.name.replace('.scene.json', ''));
      
      return sceneFiles;
    } catch (error) {
      console.error('Failed to list scenes:', error);
      return [];
    }
  }

  static async loadScene(projectPath: string, sceneName: string): Promise<SceneData> {
    const scenePath = path.join(projectPath, "scenes", `${sceneName}.scene.json`);
    
    try {
      const sceneContent = await FileSystemManager.readFile(scenePath);
      return JSON.parse(sceneContent);
    } catch (error) {
      console.error(`Failed to load scene ${sceneName}:`, error);
      throw new Error(`Failed to load scene: ${sceneName}`);
    }
  }

  static async saveScene(projectPath: string, sceneName: string, sceneData: SceneData): Promise<void> {
    const scenesDir = path.join(projectPath, "scenes");
    const scenePath = path.join(scenesDir, `${sceneName}.json`);
    
    try {
      // Ensure scenes directory exists
      if (!(await FileSystemManager.fileExists(scenesDir))) {
        await FileSystemManager.createDirectory(scenesDir);
      }
      
      // Update scene metadata
      const updatedSceneData = {
        ...sceneData,
        metadata: {
          ...sceneData.metadata,
          modified: Date.now()
        }
      };
      
      await FileSystemManager.writeFile(scenePath, JSON.stringify(updatedSceneData, null, 2));
    } catch (error) {
      console.error(`Failed to save scene ${sceneName}:`, error);
      throw new Error(`Failed to save scene: ${sceneName}`);
    }
  }

  static async createScene(projectPath: string, sceneName: string, sceneData?: SceneData): Promise<void> {
    const scenesDir = path.join(projectPath, "scenes");
    const scenePath = path.join(scenesDir, `${sceneName}.scene.json`);
    
    try {
      // Ensure scenes directory exists
      if (!(await FileSystemManager.fileExists(scenesDir))) {
        await FileSystemManager.createDirectory(scenesDir);
      }
      
      // Check if scene already exists
      if (await FileSystemManager.fileExists(scenePath)) {
        throw new Error(`Scene ${sceneName} already exists`);
      }
      
      // Use provided scene data or create default
      const finalSceneData = sceneData || {
        id: sceneName,
        name: sceneName,
        entities: [],
        world: {
          gravity: { x: 0, y: -9.81, z: 0 },
          physics: { enabled: true, timeStep: 1/60, maxSubSteps: 10 },
          rendering: {
            backgroundColor: "#87CEEB",
            environment: "",
            fog: { enabled: false, color: "#ffffff", near: 10, far: 100 },
            shadows: { enabled: true, type: "pcfsoft" as const },
            antialias: true,
            pixelRatio: 1,
          },
        },
        activeCamera: undefined,
        assets: [],
        editor: { showGrid: true, gridSize: 1, showHelpers: true, showWireframe: false, debugPhysics: false },
        metadata: { created: Date.now(), modified: Date.now(), version: "1.0.0" },
      };
      
      await FileSystemManager.writeFile(scenePath, JSON.stringify(finalSceneData, null, 2));
    } catch (error) {
      console.error(`Failed to create scene ${sceneName}:`, error);
      throw error;
    }
  }

  static async deleteScene(projectPath: string, sceneName: string): Promise<void> {
    const scenePath = path.join(projectPath, "scenes", `${sceneName}.scene.json`);
    
    try {
      if (await FileSystemManager.fileExists(scenePath)) {
        await FileSystemManager.deleteFile(scenePath);
      } else {
        throw new Error(`Scene ${sceneName} does not exist`);
      }
    } catch (error) {
      console.error(`Failed to delete scene ${sceneName}:`, error);
      throw error;
    }
  }

  static async switchScene(projectPath: string, sceneName: string): Promise<void> {
    const projectConfigPath = path.join(projectPath, "game.config.json");
    
    try {
      // Load project configuration
      let projectConfig: any = {};
      if (await FileSystemManager.fileExists(projectConfigPath)) {
        const configContent = await FileSystemManager.readFile(projectConfigPath);
        projectConfig = JSON.parse(configContent);
      }
      
      // Update current scene
      projectConfig.activeScene = sceneName;
      
      // Save project configuration
      await FileSystemManager.writeFile(projectConfigPath, JSON.stringify(projectConfig, null, 2));
    } catch (error) {
      console.error(`Failed to switch to scene ${sceneName}:`, error);
      throw error;
    }
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
    
    // Scene Management
    ipcMain.handle("project:list-scenes", (_, ...args: [string]) => ProjectService.listScenes(...args));
    ipcMain.handle("project:load-scene", (_, ...args: [string, string]) => ProjectService.loadScene(...args));
    ipcMain.handle("project:save-scene", (_, ...args: [string, string, SceneData]) => ProjectService.saveScene(...args));
    ipcMain.handle("project:create-scene", (_, ...args: [string, string, SceneData?]) => ProjectService.createScene(...args));
    ipcMain.handle("project:delete-scene", (_, ...args: [string, string]) => ProjectService.deleteScene(...args));
    ipcMain.handle("project:switch-scene", (_, ...args: [string, string]) => ProjectService.switchScene(...args));
    
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