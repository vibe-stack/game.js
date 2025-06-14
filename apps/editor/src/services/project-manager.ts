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
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, "scenes"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "assets"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "scripts"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "src"), { recursive: true });

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
        description: `A GameJS project: ${projectName}`,
        author: os.userInfo().username,
      },
    };

    // Write files
    await this.saveProjectConfig(projectPath, project);
    await this.savePackageJson(projectPath, project.packageJson);
    await this.saveTsConfig(projectPath);

    return project;
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