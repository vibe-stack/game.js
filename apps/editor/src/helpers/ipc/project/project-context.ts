import { contextBridge, ipcRenderer } from "electron";
import type { GameProject, AssetReference, SceneData } from "@/types/project";
import { 
  PROJECT_SAVE_SCRIPT_FILE_CHANNEL, 
  PROJECT_OPEN_SCRIPT_IN_EDITOR_CHANNEL 
} from "./project-channels";

export function exposeProjectContext() {
  
  contextBridge.exposeInMainWorld("projectAPI", {
    // Project Management
    loadProjects: () => ipcRenderer.invoke("project:load-projects"),
    createProject: (projectName: string, projectPath?: string, template?: string, description?: string, author?: string) => 
      ipcRenderer.invoke("project:create-project", projectName, projectPath, template, description, author),
    openProject: (projectPath: string) => 
      ipcRenderer.invoke("project:open-project", projectPath),
    saveProject: (project: GameProject) => 
      ipcRenderer.invoke("project:save-project", project),
    deleteProject: (projectPath: string) => 
      ipcRenderer.invoke("project:delete-project", projectPath),
    openProjectFolder: (projectPath: string) => 
      ipcRenderer.invoke("project:open-folder", projectPath),
    selectProjectDirectory: () => 
      ipcRenderer.invoke("project:select-directory"),
    
    // Scene Management
    listScenes: (projectPath: string) => 
      ipcRenderer.invoke("project:list-scenes", projectPath),
    loadScene: (projectPath: string, sceneName: string) => 
      ipcRenderer.invoke("project:load-scene", projectPath, sceneName),
    saveScene: (projectPath: string, sceneName: string, sceneData: SceneData) => 
      ipcRenderer.invoke("project:save-scene", projectPath, sceneName, sceneData),
    createScene: (projectPath: string, sceneName: string, sceneData?: SceneData) => 
      ipcRenderer.invoke("project:create-scene", projectPath, sceneName, sceneData),
    deleteScene: (projectPath: string, sceneName: string) => 
      ipcRenderer.invoke("project:delete-scene", projectPath, sceneName),
    switchScene: (projectPath: string, sceneName: string) => 
      ipcRenderer.invoke("project:switch-scene", projectPath, sceneName),
    getActiveScene: (projectPath: string) => 
      ipcRenderer.invoke("project:get-active-scene", projectPath),
    
    // Asset Management
    selectAssetFiles: () => 
      ipcRenderer.invoke("project:select-asset-files"),
    importAssetFromData: (projectPath: string, fileName: string, fileData: ArrayBuffer) => 
      ipcRenderer.invoke("project:import-asset-from-data", projectPath, fileName, Buffer.from(fileData)),
    importAsset: (projectPath: string, assetPath: string) => 
      ipcRenderer.invoke("project:import-asset", projectPath, assetPath),
    deleteAsset: (projectPath: string, assetId: string) => 
      ipcRenderer.invoke("project:delete-asset", projectPath, assetId),
    getAssets: (projectPath: string) => 
      ipcRenderer.invoke("project:get-assets", projectPath),
    getAssetDataUrl: (projectPath: string, assetPath: string) => 
      ipcRenderer.invoke("project:get-asset-data-url", projectPath, assetPath),
    getAssetUrl: (projectPath: string, assetPath: string) => 
      ipcRenderer.invoke("project:get-asset-url", projectPath, assetPath),
    getAssetServerPort: (projectPath: string) => 
      ipcRenderer.invoke("project:get-asset-server-port", projectPath),
    
    // File System Operations
    readFile: (filePath: string) => 
      ipcRenderer.invoke("project:read-file", filePath),
    writeFile: (filePath: string, content: string) => 
      ipcRenderer.invoke("project:write-file", filePath, content),
    fileExists: (filePath: string) => 
      ipcRenderer.invoke("project:file-exists", filePath),
    listDirectory: (dirPath: string) => 
      ipcRenderer.invoke("project:list-directory", dirPath),
    getFileStats: (filePath: string) => 
      ipcRenderer.invoke("project:get-file-stats", filePath),
    
    createFile: (filePath: string, content?: string) => 
      ipcRenderer.invoke("project:create-file", filePath, content || ""),
    createDirectory: (dirPath: string) => 
      ipcRenderer.invoke("project:create-directory", dirPath),
    deleteFile: (filePath: string) => 
      ipcRenderer.invoke("project:delete-file", filePath),
    deleteDirectory: (dirPath: string) => 
      ipcRenderer.invoke("project:delete-directory", dirPath),
    renameItem: (oldPath: string, newPath: string) => 
      ipcRenderer.invoke("project:rename-item", oldPath, newPath),
    
    // Script Management
    saveScriptFile: (projectPath: string, scriptPath: string, content: string) =>
      ipcRenderer.invoke(PROJECT_SAVE_SCRIPT_FILE_CHANNEL, projectPath, scriptPath, content),
    openScriptInEditor: (projectPath: string, scriptPath: string) =>
      ipcRenderer.invoke(PROJECT_OPEN_SCRIPT_IN_EDITOR_CHANNEL, projectPath, scriptPath),
    
    // Legacy - keeping for backward compatibility but may be removed later
    installPackages: (projectName: string) => {
        console.warn("Legacy API 'installPackages' is deprecated.");
        return Promise.resolve();
    },
    startDevServer: (projectName: string) => {
        console.warn("Legacy API 'startDevServer' is deprecated.");
        return Promise.resolve({ port: 0, url: '' });
    },
    stopDevServer: (projectName: string) => {
        console.warn("Legacy API 'stopDevServer' is deprecated.");
        return Promise.resolve();
    },
    isDevServerRunning: (projectName: string) => {
        console.warn("Legacy API 'isDevServerRunning' is deprecated.");
        return Promise.resolve(false);
    },
    getServerInfo: (projectName: string) => {
        console.warn("Legacy API 'getServerInfo' is deprecated.");
        return Promise.resolve(undefined);
    },
    connectToEditor: (projectName: string) => {
        console.warn("Legacy API 'connectToEditor' is deprecated.");
        return Promise.resolve();
    },
    sendPropertyUpdate: (projectName: string, property: string, value: unknown, temporary?: boolean) => {
        console.warn("Legacy API 'sendPropertyUpdate' is deprecated.");
        return Promise.resolve();
    },
    getSceneInfo: (projectName: string) => {
        console.warn("Legacy API 'getSceneInfo' is deprecated.");
        return Promise.resolve(null);
    }
  });

}