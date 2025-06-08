import { ipcMain, dialog, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class ProjectService {
  private projectsDirectory: string;

  constructor() {
    this.projectsDirectory = path.join(os.homedir(), 'GameJS-Projects');
    this.ensureProjectsDirectory();
  }

  private async ensureProjectsDirectory() {
    try {
      await fs.access(this.projectsDirectory);
    } catch {
      await fs.mkdir(this.projectsDirectory, { recursive: true });
    }
  }

  async loadProjects(): Promise<GameProject[]> {
    try {
      await this.ensureProjectsDirectory();
      const entries = await fs.readdir(this.projectsDirectory, { withFileTypes: true });
      const projects: GameProject[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(this.projectsDirectory, entry.name);
          const configPath = path.join(projectPath, 'gamejs.config.json');
          
          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const project = JSON.parse(configContent) as GameProject;
            
            const stats = await fs.stat(projectPath);
            project.lastModified = stats.mtime;
            project.path = projectPath;
            
            projects.push(project);
          } catch {
            // Skip invalid projects
          }
        }
      }

      return projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }

  async createProject(projectName: string, customPath?: string): Promise<GameProject> {
    const projectPath = customPath 
      ? path.join(customPath, projectName)
      : path.join(this.projectsDirectory, projectName);

    // Check if project already exists
    try {
      await fs.access(projectPath);
      throw new Error(`Project "${projectName}" already exists`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Create project directory structure
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'scenes'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'assets'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'scripts'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });

    const now = new Date();
    
    // Create default editor config
    const editorConfig: EditorConfig = {
      appTitle: projectName,
      shortcuts: {
        'ctrl+s': 'save',
        'ctrl+n': 'new-scene',
        'delete': 'delete-object',
        'f': 'focus-object',
        'w': 'move-tool',
        'e': 'rotate-tool',
        'r': 'scale-tool'
      },
      theme: 'system',
      autoSave: true,
      autoSaveInterval: 30,
      gridSize: 1,
      snapToGrid: false,
      showGrid: true,
      showGizmos: true,
      cameraSpeed: 5,
      viewportBackground: '#2a2a2a'
    };

    // Create project configuration
    const project: GameProject = {
      name: projectName,
      path: projectPath,
      lastModified: now,
      scenes: ['main-scene'],
      currentScene: 'main-scene',
      editorConfig,
      packageJson: this.createPackageJson(projectName),
      metadata: {
        created: now,
        version: '1.0.0',
        description: `A GameJS project: ${projectName}`,
        author: os.userInfo().username
      }
    };

    // Create default scene
    const defaultScene = this.createDefaultScene();
    
    // Write files
    await this.saveProjectConfig(projectPath, project);
    await this.saveScene(projectPath, defaultScene);
    await this.savePackageJson(projectPath, project.packageJson);

    return project;
  }

  async selectProjectDirectory(): Promise<string | undefined> {
    const result = await dialog.showOpenDialog({
      title: 'Select Project Directory',
      properties: ['openDirectory'],
      defaultPath: this.projectsDirectory
    });

    return result.canceled ? undefined : result.filePaths[0];
  }

  async openProject(projectPath: string): Promise<GameProject> {
    const configPath = path.join(projectPath, 'gamejs.config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const project = JSON.parse(configContent) as GameProject;
    
    const stats = await fs.stat(projectPath);
    project.lastModified = stats.mtime;
    project.path = projectPath;
    
    return project;
  }

  async saveProject(project: GameProject): Promise<void> {
    await this.saveProjectConfig(project.path, project);
  }

  async openProjectFolder(projectPath: string): Promise<void> {
    await shell.openPath(projectPath);
  }

  private async saveProjectConfig(projectPath: string, project: GameProject): Promise<void> {
    const configPath = path.join(projectPath, 'gamejs.config.json');
    const configData = JSON.stringify(project, null, 2);
    await fs.writeFile(configPath, configData, 'utf-8');
  }

  private async savePackageJson(projectPath: string, packageJsonData: unknown): Promise<void> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonContent = JSON.stringify(packageJsonData, null, 2);
    await fs.writeFile(packageJsonPath, packageJsonContent, 'utf-8');
  }

  private createPackageJson(projectName: string) {
    return {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: `GameJS project: ${projectName}`,
      main: 'src/index.js',
      type: 'module',
      scripts: {
        build: 'gamejs build',
        dev: 'gamejs dev',
        preview: 'gamejs preview'
      },
      dependencies: {
        three: '^0.177.0'
      },
      devDependencies: {},
      private: true
    };
  }

  private createDefaultScene(): GameScene {
    const now = new Date();
    
    return {
      id: 'main-scene',
      name: 'Main Scene',
      objects: [
        {
          id: 'main-camera',
          name: 'Main Camera',
          transform: {
            position: { x: 0, y: 5, z: 10 },
            rotation: { x: -0.2, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          components: [
            {
              id: 'camera-component',
              type: 'PerspectiveCamera',
              enabled: true,
              properties: {
                fov: 75,
                near: 0.1,
                far: 1000,
                isMain: true
              }
            }
          ],
          children: [],
          visible: true,
          tags: ['camera'],
          layer: 0
        },
        {
          id: 'directional-light',
          name: 'Directional Light',
          transform: {
            position: { x: 5, y: 10, z: 5 },
            rotation: { x: -1, y: 0.5, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          components: [
            {
              id: 'light-component',
              type: 'DirectionalLight',
              enabled: true,
              properties: {
                color: '#ffffff',
                intensity: 1,
                castShadow: true,
                shadowMapSize: 1024,
                shadowCameraNear: 0.5,
                shadowCameraFar: 50,
                shadowCameraLeft: -10,
                shadowCameraRight: 10,
                shadowCameraTop: 10,
                shadowCameraBottom: -10
              }
            }
          ],
          children: [],
          visible: true,
          tags: ['light'],
          layer: 0
        }
      ],
      editorConfig: {
        showHelperGrid: true,
        gridSize: 1,
        backgroundColor: '#2a2a2a',
        renderType: 'solid',
        showLights: true,
        showCameras: true,
        enableFog: false,
        fogColor: '#ffffff',
        fogNear: 1,
        fogFar: 100
      },
      runtimeConfig: {
        backgroundColor: '#87CEEB',
        environment: 'none',
        shadowsEnabled: true,
        shadowType: 'pcf',
        antialias: true,
        physicallyCorrectLights: true,
        toneMapping: 'aces',
        exposure: 1
      },
      assets: [],
      activeCamera: 'main-camera',
      lightingSetup: {},
      metadata: {
        created: now,
        modified: now,
        version: '1.0.0'
      }
    };
  }

  async loadScene(projectPath: string, sceneName: string): Promise<GameScene> {
    const scenePath = path.join(projectPath, 'scenes', `${sceneName}.json`);
    const sceneContent = await fs.readFile(scenePath, 'utf-8');
    return JSON.parse(sceneContent) as GameScene;
  }

  async saveScene(projectPath: string, scene: GameScene): Promise<void> {
    const scenePath = path.join(projectPath, 'scenes', `${scene.id}.json`);
    scene.metadata.modified = new Date();
    const sceneData = JSON.stringify(scene, null, 2);
    await fs.writeFile(scenePath, sceneData, 'utf-8');
  }

  registerIpcHandlers() {
    ipcMain.handle('project:load-projects', () => this.loadProjects());
    ipcMain.handle('project:create-project', (_, projectName: string, projectPath?: string) => 
      this.createProject(projectName, projectPath));
    ipcMain.handle('project:select-directory', () => this.selectProjectDirectory());
    ipcMain.handle('project:open-project', (_, projectPath: string) => this.openProject(projectPath));
    ipcMain.handle('project:save-project', (_, project: GameProject) => this.saveProject(project));
    ipcMain.handle('project:open-folder', (_, projectPath: string) => this.openProjectFolder(projectPath));
    ipcMain.handle('project:load-scene', (_, projectPath: string, sceneName: string) => 
      this.loadScene(projectPath, sceneName));
    ipcMain.handle('project:save-scene', (_, projectPath: string, scene: GameScene) => 
      this.saveScene(projectPath, scene));
  }
} 