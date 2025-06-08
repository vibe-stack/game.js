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
    importAsset: (projectPath: string, assetPath: string) => 
      ipcRenderer.invoke("project:import-asset", projectPath, assetPath),
    deleteAsset: (projectPath: string, assetId: string) => 
      ipcRenderer.invoke("project:delete-asset", projectPath, assetId),
    getAssets: (projectPath: string) => 
      ipcRenderer.invoke("project:get-assets", projectPath),
    
    // File System Operations
    readFile: (filePath: string) => 
      ipcRenderer.invoke("project:read-file", filePath),
    writeFile: (filePath: string, content: string) => 
      ipcRenderer.invoke("project:write-file", filePath, content),
    fileExists: (filePath: string) => 
      ipcRenderer.invoke("project:file-exists", filePath),
    
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