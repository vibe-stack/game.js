import { dialog, shell } from "electron";
import fs from "fs/promises";
import path from "path";
import os from "os";

export class ProjectManager {
  private projectsDirectory: string;

  constructor() {
    this.projectsDirectory = path.join(os.homedir(), "GameJS-Projects");
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
      const entries = await fs.readdir(this.projectsDirectory, {
        withFileTypes: true,
      });
      const projects: GameProject[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(this.projectsDirectory, entry.name);
          const configPath = path.join(projectPath, "gamejs.config.json");

          try {
            const configContent = await fs.readFile(configPath, "utf-8");
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

      return projects.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
      );
    } catch (error) {
      console.error("Failed to load projects:", error);
      return [];
    }
  }

  async createProject(
    projectName: string,
    customPath?: string,
    template: string = "empty",
    description?: string,
    author?: string,
  ): Promise<GameProject> {
    const projectPath = customPath
      ? path.join(customPath, projectName)
      : path.join(this.projectsDirectory, projectName);

    // Check if project already exists
    try {
      await fs.access(projectPath);
      throw new Error(`Project "${projectName}" already exists`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    // Create project directory structure
    await this.createProjectStructure(projectPath);

    const now = new Date();

    // Create default editor config
    const editorConfig: EditorConfig = {
      appTitle: projectName,
      shortcuts: {
        "ctrl+s": "save",
        "ctrl+n": "new-scene",
        delete: "delete-object",
        f: "focus-object",
        w: "move-tool",
        e: "rotate-tool",
        r: "scale-tool",
      },
      theme: "system",
      autoSave: true,
      autoSaveInterval: 30,
      gridSize: 1,
      snapToGrid: false,
      showGrid: true,
      showGizmos: true,
      cameraSpeed: 5,
      viewportBackground: "#2a2a2a",
    };

    // Create project configuration
    const project: GameProject = {
      name: projectName,
      path: projectPath,
      lastModified: now,
      scenes: ["main-scene"],
      currentScene: "main-scene",
      editorConfig,
      packageJson: this.createPackageJson(projectName),
      metadata: {
        created: now,
        version: "1.0.0",
        description: description || `A GameJS project: ${projectName}`,
        author: author || os.userInfo().username,
      },
    };

    // Write files
    await this.saveProjectConfig(projectPath, project);
    await this.savePackageJson(projectPath, project.packageJson);
    await this.saveTsConfig(projectPath);
    await this.createGitIgnore(projectPath);

    // Create default scene based on template
    await this.createDefaultScene(projectPath, template);

    return project;
  }

  private async createProjectStructure(projectPath: string): Promise<void> {
    // Create main directories
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, "scenes"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "assets"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "assets", "textures"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "assets", "models"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "assets", "audio"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "assets", "materials"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "scripts"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "src"), { recursive: true });
  }

  private async createDefaultScene(projectPath: string, template: string): Promise<void> {
    const sceneData = this.generateSceneTemplate(template);
    const scenePath = path.join(projectPath, "scenes", "main-scene.json");
    await fs.writeFile(scenePath, JSON.stringify(sceneData, null, 2), "utf-8");
  }

  private generateSceneTemplate(template: string): any {
    const now = new Date();
    
    const baseScene = {
      id: `scene_${Date.now()}`,
      name: "Main Scene",
      entities: [] as any[],
      
      // World configuration matching GameWorld
      world: {
        gravity: { x: 0, y: -9.81, z: 0 },
        physics: {
          enabled: true,
          timeStep: 1/60,
          maxSubSteps: 10,
        },
        rendering: {
          backgroundColor: "#87CEEB",
          environment: "",
          fog: {
            enabled: false,
            color: "#ffffff",
            near: 10,
            far: 100,
          },
          shadows: {
            enabled: true,
            type: "pcfsoft" as const,
          },
          antialias: true,
          pixelRatio: 1,
        },
      },
      
      // Active references
      activeCamera: "default-camera",
      activeLighting: "default-lighting",
      
      // Assets used in this scene
      assets: [],
      
      // Editor-specific data
      editor: {
        showGrid: true,
        gridSize: 1,
        showHelpers: true,
        showWireframe: false,
        debugPhysics: false,
      },
      
      metadata: {
        created: now,
        modified: now,
        version: "1.0.0",
      },
    };

    // Add default entities (camera + lighting)
    baseScene.entities = [...this.createDefaultEntities()];

    // Add template-specific entities
    switch (template) {
      case "basic":
        baseScene.entities.push(...this.createBasicTemplateEntities());
        break;
      case "platformer":
        baseScene.entities.push(...this.createPlatformerTemplateEntities());
        break;
      case "fps":
        baseScene.entities.push(...this.createFPSTemplateEntities());
        break;
      default: // empty
        break;
    }

    return baseScene;
  }

  private createDefaultEntities(): any[] {
    const now = Date.now();
    
    return [
      {
        id: "default-camera",
        name: "Main Camera",
        type: "camera",
        transform: {
          position: { x: 0, y: 5, z: 10 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        physics: {
          enabled: false,
        },
        material: null,
        tags: ["camera"],
        layer: 0,
        visible: true,
        castShadow: false,
        receiveShadow: false,
        children: [],
        properties: {
          type: "perspective",
          fov: 75,
          aspect: 16/9,
          near: 0.1,
          far: 1000,
          isActive: true,
        },
        metadata: {
          created: now,
          updated: now,
        },
      },
      {
        id: "ambient-light",
        name: "Ambient Light",
        type: "light",
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        physics: {
          enabled: false,
        },
        material: null,
        tags: ["light", "ambient"],
        layer: 0,
        visible: true,
        castShadow: false,
        receiveShadow: false,
        children: [],
        properties: {
          type: "ambient",
          color: "#404040",
          intensity: 0.4,
        },
        metadata: {
          created: now,
          updated: now,
        },
      },
      {
        id: "directional-light",
        name: "Directional Light",
        type: "light",
        transform: {
          position: { x: 10, y: 10, z: 10 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        physics: {
          enabled: false,
        },
        material: null,
        tags: ["light", "directional"],
        layer: 0,
        visible: true,
        castShadow: false,
        receiveShadow: false,
        children: [],
        properties: {
          type: "directional",
          color: "#ffffff",
          intensity: 0.8,
          castShadow: true,
        },
        metadata: {
          created: now,
          updated: now,
        },
      },
    ];
  }

  private createBasicTemplateEntities(): any[] {
    const now = Date.now();
    
    return [
      // Ground - Box entity with static physics
      {
        id: "ground",
        name: "Ground",
        type: "box",
        transform: {
          position: { x: 0, y: -2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 20, y: 1, z: 20 },
        },
        physics: {
          enabled: true,
          type: "static",
          mass: 0,
          restitution: 0.2,
          friction: 0.8,
        },
        material: {
          type: "standard",
          properties: {
            type: "standard",
            color: "#8FBC8F",
            opacity: 1,
            transparent: false,
            roughness: 0.8,
            metalness: 0.1,
          },
        },
        tags: ["ground", "platform"],
        layer: 0,
        visible: true,
        castShadow: false,
        receiveShadow: true,
        children: [],
        properties: {
          width: 20,
          height: 1,
          depth: 20,
          widthSegments: 1,
          heightSegments: 1,
          depthSegments: 1,
        },
        metadata: {
          created: now,
          updated: now,
        },
      },
      // Cube - Box entity with dynamic physics
      {
        id: "cube",
        name: "Cube",
        type: "box",
        transform: {
          position: { x: 0, y: 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        physics: {
          enabled: true,
          type: "dynamic",
          mass: 1,
          restitution: 0.3,
          friction: 0.7,
          linearDamping: 0.1,
          angularDamping: 0.1,
        },
        material: {
          type: "standard",
          properties: {
            type: "standard",
            color: "#FF6B6B",
            opacity: 1,
            transparent: false,
            roughness: 0.5,
            metalness: 0.0,
          },
        },
        tags: ["interactive", "dynamic"],
        layer: 0,
        visible: true,
        castShadow: true,
        receiveShadow: true,
        children: [],
        properties: {
          width: 1,
          height: 1,
          depth: 1,
          widthSegments: 1,
          heightSegments: 1,
          depthSegments: 1,
        },
        metadata: {
          created: now,
          updated: now,
        },
      },
    ];
  }

  private createPlatformerTemplateEntities(): any[] {
    const now = Date.now();
    
    return [
      // Ground
      {
        id: "ground",
        name: "Ground",
        type: "box",
        transform: {
          position: { x: 0, y: -2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 30, y: 1, z: 10 },
        },
        physics: {
          enabled: true,
          type: "static",
          mass: 0,
          restitution: 0.0,
          friction: 0.8,
        },
        material: {
          type: "standard",
          properties: {
            type: "standard",
            color: "#8B4513",
            opacity: 1,
            transparent: false,
            roughness: 0.9,
            metalness: 0.0,
          },
        },
        tags: ["ground", "platform"],
        layer: 0,
        visible: true,
        castShadow: false,
        receiveShadow: true,
        children: [],
        properties: {
          width: 30,
          height: 1,
          depth: 10,
        },
        metadata: {
          created: now,
          updated: now,
        },
      },
      // Platform 1
      {
        id: "platform1",
        name: "Platform 1",
        type: "box",
        transform: {
          position: { x: 5, y: 1, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 4, y: 0.5, z: 2 },
        },
        physics: {
          enabled: true,
          type: "static",
          mass: 0,
          restitution: 0.0,
          friction: 0.8,
        },
        material: {
          type: "standard",
          properties: {
            type: "standard",
            color: "#228B22",
            opacity: 1,
            transparent: false,
            roughness: 0.7,
            metalness: 0.0,
          },
        },
        tags: ["platform"],
        layer: 0,
        visible: true,
        castShadow: true,
        receiveShadow: true,
        children: [],
        properties: {
          width: 4,
          height: 0.5,
          depth: 2,
        },
        metadata: {
          created: now,
          updated: now,
        },
      },
    ];
  }

  private createFPSTemplateEntities(): any[] {
    const now = Date.now();
    
    return [
      // Large ground for FPS
      {
        id: "ground",
        name: "Ground",
        type: "box",
        transform: {
          position: { x: 0, y: -2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 50, y: 1, z: 50 },
        },
        physics: {
          enabled: true,
          type: "static",
          mass: 0,
          restitution: 0.0,
          friction: 0.8,
        },
        material: {
          type: "standard",
          properties: {
            type: "standard",
            color: "#556B2F",
            opacity: 1,
            transparent: false,
            roughness: 0.8,
            metalness: 0.1,
          },
        },
        tags: ["ground", "terrain"],
        layer: 0,
        visible: true,
        castShadow: false,
        receiveShadow: true,
        children: [],
        properties: {
          width: 50,
          height: 1,
          depth: 50,
        },
        metadata: {
          created: now,
          updated: now,
        },
      },
    ];
  }





  private async createGitIgnore(projectPath: string): Promise<void> {
    const gitIgnoreContent = `# Dependencies
node_modules/
pnpm-lock.yaml
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Editor files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime files
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Temporary files
tmp/
temp/
`;

    const gitIgnorePath = path.join(projectPath, ".gitignore");
    await fs.writeFile(gitIgnorePath, gitIgnoreContent, "utf-8");
  }

  async selectProjectDirectory(): Promise<string | undefined> {
    const result = await dialog.showOpenDialog({
      title: "Select Project Directory",
      properties: ["openDirectory"],
      defaultPath: this.projectsDirectory,
    });

    return result.canceled ? undefined : result.filePaths[0];
  }

  async openProject(projectPath: string): Promise<GameProject> {
    const configPath = path.join(projectPath, "gamejs.config.json");
    const configContent = await fs.readFile(configPath, "utf-8");
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

  async deleteProject(projectPath: string): Promise<void> {
    try {
      // Remove the entire project directory
      await fs.rm(projectPath, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to delete project:", error);
      throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async saveProjectConfig(
    projectPath: string,
    project: GameProject,
  ): Promise<void> {
    const configPath = path.join(projectPath, "gamejs.config.json");
    const configData = JSON.stringify(project, null, 2);
    await fs.writeFile(configPath, configData, "utf-8");
  }

  private async savePackageJson(
    projectPath: string,
    packageJsonData: unknown,
  ): Promise<void> {
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJsonContent = JSON.stringify(packageJsonData, null, 2);
    await fs.writeFile(packageJsonPath, packageJsonContent, "utf-8");
  }

  private async saveTsConfig(projectPath: string): Promise<void> {
    const tsConfigPath = path.join(projectPath, "tsconfig.json");
    const tsConfig = this.createTsConfig();
    const tsConfigContent = JSON.stringify(tsConfig, null, 2);
    await fs.writeFile(tsConfigPath, tsConfigContent, "utf-8");
  }

  private createTsConfig() {
    return {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "preserve",
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true,
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        allowJs: true,
        esModuleInterop: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"]
        }
      },
      include: [
        "src/**/*",
        "scripts/**/*"
      ],
      exclude: [
        "node_modules",
        "dist",
        ".gamejs"
      ]
    };
  }

  private createPackageJson(projectName: string) {
    return {
      name: projectName.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      description: `GameJS project: ${projectName}`,
      main: "src/index.js",
      type: "module",
      scripts: {
        build: "gamejs build",
        dev: "gamejs dev",
        preview: "gamejs preview",
      },
      dependencies: {
        three: "^0.177.0",
      },
      devDependencies: {},
      private: true,
    };
  }
} 