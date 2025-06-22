import { dialog, shell } from "electron";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { GameProject, SceneData } from "../types/project";

export class ProjectManager {
  private static projectsDirectory: string = path.join(os.homedir(), "GameJS-Projects");

  private constructor() { } // Prevent instantiation

  private static async ensureProjectsDirectory() {
    try {
      await fs.access(ProjectManager.projectsDirectory);
    } catch {
      await fs.mkdir(ProjectManager.projectsDirectory, { recursive: true });
    }
  }

  static async loadProjects(): Promise<GameProject[]> {
    try {
      await ProjectManager.ensureProjectsDirectory();
      const entries = await fs.readdir(ProjectManager.projectsDirectory, { withFileTypes: true });
      const projects: GameProject[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(ProjectManager.projectsDirectory, entry.name);
          const configPath = path.join(projectPath, "gamejs.config.json");
          try {
            const configContent = await fs.readFile(configPath, "utf-8");
            const project = JSON.parse(configContent) as GameProject;
            const stats = await fs.stat(projectPath);
            project.lastModified = stats.mtime;
            project.path = projectPath;
            projects.push(project);
          } catch { /* Skip invalid projects */ }
        }
      }
      return projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (error) {
      console.error("Failed to load projects:", error);
      return [];
    }
  }

  static async createProject(projectName: string, customPath?: string, template: string = "empty", description?: string, author?: string): Promise<GameProject> {
    const projectPath = customPath ? path.join(customPath, projectName) : path.join(ProjectManager.projectsDirectory, projectName);

    try {
      await fs.access(projectPath);
      throw new Error(`Project "${projectName}" already exists at this location.`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    await ProjectManager.createProjectStructure(projectPath);
    const now = new Date();

    const project: GameProject = {
      name: projectName,
      path: projectPath,
      lastModified: now,
      scenes: ["main-scene.scene"],
      currentScene: "main-scene.scene",
      packageJson: ProjectManager.createPackageJson(projectName),
      metadata: {
        created: now,
        version: "1.0.0",
        description: description || `A GameJS project: ${projectName}`,
        author: author || os.userInfo().username,
      },
    };

    await ProjectManager.saveProjectConfig(projectPath, project);
    await ProjectManager.savePackageJson(projectPath, project.packageJson);
    await ProjectManager.saveTsConfig(projectPath);
    await ProjectManager.createGitIgnore(projectPath);
    await ProjectManager.createDefaultScene(projectPath, template);

    return project;
  }

  private static async createProjectStructure(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, "scenes"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "assets"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "scripts"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "src"), { recursive: true });
  }

  private static async createDefaultScene(projectPath: string, template: string): Promise<void> {
    const sceneData = ProjectManager.generateSceneTemplate(template);
    const scenePath = path.join(projectPath, "scenes", "main-scene.scene.json");
    await fs.writeFile(scenePath, JSON.stringify(sceneData, null, 2), "utf-8");
  }

  private static generateSceneTemplate(template: string): SceneData {
    const now = new Date();
    const baseScene: SceneData = {
      id: `scene_${Date.now()}`,
      name: "Main Scene",
      entities: [],
      world: {
        gravity: { x: 0, y: -9.81, z: 0 },
        physics: { enabled: true, timeStep: 1 / 60, maxSubSteps: 10 },
        rendering: {
          backgroundColor: "#87CEEB",
          environment: "",
          fog: { enabled: false, color: "#ffffff", near: 10, far: 100 },
          shadows: { enabled: true, type: "pcfsoft" },
          antialias: true,
          pixelRatio: 1,
        },
      },
      activeCamera: "main-camera",
      assets: [],
      editor: { showGrid: true, gridSize: 1, showHelpers: true, showWireframe: false, debugPhysics: false },
      metadata: { created: now, modified: now, version: "1.0.0" },
    };

    const defaultEntities: any[] = [
      {
        id: "main-camera",
        name: "Main Camera",
        type: "camera",
        transform: {
          position: { x: 5, y: 5, z: 10 },
          rotation: { x: -0.4, y: 0.3, z: 0.1 },
          scale: { x: 1, y: 1, z: 1 }
        },
        properties: { type: "perspective", fov: 75, near: 0.1, far: 1000, isActive: true }
      },
      {
        id: "ambient-light",
        name: "Ambient Light",
        type: "light",
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        properties: { type: "ambient", color: "#404040", intensity: 0.8 }
      },
      {
        id: "directional-light",
        name: "Sun",
        type: "light",
        transform: {
          position: { x: 10, y: 15, z: 5 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        properties: { type: "directional", color: "#ffffff", intensity: 1.5, castShadow: true }
      }
    ];

    // Add default entities to all templates
    baseScene.entities.push(...defaultEntities);

    // Add template-specific entities
    if (template === "basic") {
      const groundEntity = {
        id: "ground",
        name: "Ground",
        type: "box",
        transform: {
          position: { x: 0, y: -0.5, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 20, y: 1, z: 20 }
        },
        physics: { enabled: true, type: 'static' },
        tags: [],
        layer: 0,
        visible: true,
        castShadow: true,
        receiveShadow: true,
        children: [],
        metadata: { created: Date.now(), updated: Date.now() }
      };

      const cubeEntity = {
        id: "cube",
        name: "Cube",
        type: "box",
        transform: {
          position: { x: 0, y: 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        physics: { enabled: true, type: 'dynamic', mass: 1 },
        tags: [],
        layer: 0,
        visible: true,
        castShadow: true,
        receiveShadow: true,
        children: [],
        metadata: { created: Date.now(), updated: Date.now() }
      };

      baseScene.entities.push(groundEntity, cubeEntity);
    }

    // Convert entities to the full SceneEntity format
    baseScene.entities = baseScene.entities.map(e => ({
      ...e,
      tags: e.tags || [],
      layer: e.layer || 0,
      visible: e.visible !== undefined ? e.visible : true,
      castShadow: e.castShadow !== undefined ? e.castShadow : true,
      receiveShadow: e.receiveShadow !== undefined ? e.receiveShadow : true,
      children: e.children || [],
      metadata: e.metadata || { created: Date.now(), updated: Date.now() }
    }));

    return baseScene;
  }

  static async openProject(projectPath: string): Promise<GameProject> {
    const configPath = path.join(projectPath, "gamejs.config.json");
    try {
      const configContent = await fs.readFile(configPath, "utf-8");
      const project = JSON.parse(configContent) as GameProject;
      const stats = await fs.stat(projectPath);
      project.lastModified = stats.mtime;
      project.path = projectPath;
      return project;
    } catch (error) {
      throw new Error(`Failed to open project: ${error}`);
    }
  }

  static async saveProject(project: GameProject): Promise<void> {
    await ProjectManager.saveProjectConfig(project.path, project);
  }

  static async openProjectFolder(projectPath: string): Promise<void> {
    await shell.openPath(projectPath);
  }

  static async deleteProject(projectPath: string): Promise<void> {
    await fs.rmdir(projectPath, { recursive: true });
  }

  static async selectProjectDirectory(): Promise<string | undefined> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Project Directory'
    });

    return result.canceled ? undefined : result.filePaths[0];
  }

  private static async saveProjectConfig(projectPath: string, project: GameProject): Promise<void> {
    const configPath = path.join(projectPath, "gamejs.config.json");
    const configData = JSON.stringify(project, null, 2);
    await fs.writeFile(configPath, configData, "utf-8");
  }

  private static createPackageJson(projectName: string) {
    return {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: "1.0.0",
      description: `A GameJS project: ${projectName}`,
      main: "src/index.ts",
      scripts: {
        "dev": "gamejs dev",
        "build": "gamejs build",
        "start": "gamejs start"
      },
      dependencies: {
        "@gamejs/core": "latest"
      },
      devDependencies: {
        "typescript": "^5.0.0",
        "@types/node": "^20.0.0"
      }
    };
  }

  private static async savePackageJson(projectPath: string, packageJsonData: unknown): Promise<void> {
    const packagePath = path.join(projectPath, "package.json");
    const packageData = JSON.stringify(packageJsonData, null, 2);
    await fs.writeFile(packagePath, packageData, "utf-8");
  }

  private static createTsConfig() {
    return {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "node",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: "./dist",
        rootDir: "./src"
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"]
    };
  }

  private static async saveTsConfig(projectPath: string): Promise<void> {
    const tsconfigPath = path.join(projectPath, "tsconfig.json");
    const tsconfigData = JSON.stringify(ProjectManager.createTsConfig(), null, 2);
    await fs.writeFile(tsconfigPath, tsconfigData, "utf-8");
  }

  private static async createGitIgnore(projectPath: string): Promise<void> {
    const gitignorePath = path.join(projectPath, ".gitignore");
    const gitignoreContent = `
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
coverage/
.nyc_output/
`.trim();
    await fs.writeFile(gitignorePath, gitignoreContent, "utf-8");
  }
}