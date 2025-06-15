import { contextBridge, ipcRenderer } from "electron";

export function exposeProjectContext() {
  contextBridge.exposeInMainWorld("projectAPI", {
    // Project Management
    loadProjects: () => ipcRenderer.invoke("project:load-projects"),
    createProject: (projectName: string, projectPath?: string) => 
      ipcRenderer.invoke("project:create-project", projectName, projectPath),
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
    loadScene: (projectPath: string, sceneName: string) => 
      ipcRenderer.invoke("project:load-scene", projectPath, sceneName),
    saveScene: (projectPath: string, scene: GameScene) => 
      ipcRenderer.invoke("project:save-scene", projectPath, scene),
    createScene: (projectPath: string, sceneName: string) => 
      ipcRenderer.invoke("project:create-scene", projectPath, sceneName),
    deleteScene: (projectPath: string, sceneName: string) => 
      ipcRenderer.invoke("project:delete-scene", projectPath, sceneName),
    duplicateScene: (projectPath: string, sceneName: string, newName: string) => 
      ipcRenderer.invoke("project:duplicate-scene", projectPath, sceneName, newName),
    listScenes: (projectPath: string) => 
      ipcRenderer.invoke("project:list-scenes", projectPath),
    
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
    
    // New File System Operations
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
    
    // Legacy - keeping for backward compatibility
    installPackages: (projectName: string) => 
      ipcRenderer.invoke("project:install-packages", projectName),
    startDevServer: (projectName: string) => 
      ipcRenderer.invoke("project:start-dev-server", projectName),
    stopDevServer: (projectName: string) => 
      ipcRenderer.invoke("project:stop-dev-server", projectName),
    isDevServerRunning: (projectName: string) => 
      ipcRenderer.invoke("project:is-dev-server-running", projectName),
    getServerInfo: (projectName: string) => 
      ipcRenderer.invoke("project:get-server-info", projectName),
    connectToEditor: (projectName: string) => 
      ipcRenderer.invoke("project:connect-to-editor", projectName),
    sendPropertyUpdate: (projectName: string, property: string, value: unknown, temporary?: boolean) => 
      ipcRenderer.invoke("project:send-property-update", projectName, property, value, temporary),
    getSceneInfo: (projectName: string) => 
      ipcRenderer.invoke("project:get-scene-info", projectName)
  });
} 