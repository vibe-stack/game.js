import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { shell } from 'electron';

export interface GameProject {
  name: string;
  path: string;
  lastModified: Date;
  isRunning?: boolean;
}

export interface DevServerInfo {
  port?: number;
  url?: string;
}

class ProjectService {
  private runningServers: Map<string, ChildProcess> = new Map();
  private serverInfo: Map<string, DevServerInfo> = new Map();
  private projectsDir: string;

  constructor() {
    // In production, use app data directory
    // In development, use a projects folder in the workspace
    const isProduction = process.env.NODE_ENV === 'production';
    this.projectsDir = isProduction 
      ? path.join(process.env.HOME || '', 'Documents', 'GameJS Projects')
      : path.join(process.cwd(), '..', '..', 'projects');
  }

  async ensureProjectsDir(): Promise<void> {
    try {
      await fs.promises.access(this.projectsDir);
    } catch {
      await fs.promises.mkdir(this.projectsDir, { recursive: true });
    }
  }

  async loadProjects(): Promise<GameProject[]> {
    await this.ensureProjectsDir();
    
    try {
      const entries = await fs.promises.readdir(this.projectsDir, { withFileTypes: true });
      const projects: GameProject[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(this.projectsDir, entry.name);
          const packageJsonPath = path.join(projectPath, 'package.json');
          
          try {
            const stats = await fs.promises.stat(packageJsonPath);
            projects.push({
              name: entry.name,
              path: projectPath,
              lastModified: stats.mtime,
              isRunning: this.runningServers.has(entry.name),
            });
          } catch {
            // Skip if no package.json (not a valid project)
          }
        }
      }

      return projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }

  async createProject(projectName: string): Promise<GameProject> {
    await this.ensureProjectsDir();
    
    const projectPath = path.join(this.projectsDir, projectName);
    
    // Check if project already exists
    try {
      await fs.promises.access(projectPath);
      throw new Error(`Project ${projectName} already exists`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      const isProduction = process.env.NODE_ENV === 'production';
      
      let cliCommand: string;
      let args: string[];
      
      if (isProduction) {
        // In production, use the bundled CLI
        cliCommand = 'node';
        args = [path.join(process.resourcesPath, 'cli', 'index.js'), 'create', projectName];
      } else {
        // In development, use node directly with the built CLI
        // Navigate from the gameon workspace root to the CLI package
        const workspaceRoot = process.cwd().includes('apps/editor') 
          ? path.join(process.cwd(), '..', '..')
          : process.cwd();
        const cliPath = path.join(workspaceRoot, 'packages', 'cli', 'dist', 'index.js');
        
        // Debug logging
        console.log('CLI Path resolved to:', cliPath);
        console.log('CLI Path exists:', fs.existsSync(cliPath));
        
        cliCommand = 'node';
        args = [cliPath, 'create', projectName];
      }

      console.log('Spawning CLI command:', cliCommand, args);

      const child = spawn(cliCommand, args, {
        cwd: this.projectsDir,
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', async (code) => {
        if (code === 0) {
          // After successful project creation, run pnpm install
          try {
            await this.installPackages(projectName);
            resolve({
              name: projectName,
              path: projectPath,
              lastModified: new Date(),
            });
          } catch {
            // Project was created but install failed
            resolve({
              name: projectName,
              path: projectPath,
              lastModified: new Date(),
            });
          }
        } else {
          reject(new Error(`Project creation failed: ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn CLI: ${error.message}`));
      });
    });
  }

  async installPackages(projectName: string): Promise<void> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    return new Promise((resolve, reject) => {
      const child = spawn('pnpm', ['install'], {
        cwd: projectPath,
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[${projectName}] pnpm install: ${output}`);
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[${projectName}] pnpm install error: ${output}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`[${projectName}] pnpm install completed successfully`);
          resolve();
        } else {
          reject(new Error(`Package installation failed: ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to run pnpm install: ${error.message}`));
      });
    });
  }

  async startDevServer(projectName: string): Promise<DevServerInfo> {
    if (this.runningServers.has(projectName)) {
      throw new Error(`Dev server for ${projectName} is already running`);
    }

    const projectPath = path.join(this.projectsDir, projectName);
    
    return new Promise((resolve, reject) => {
      const child = spawn('pnpm', ['dev'], {
        cwd: projectPath,
        stdio: 'pipe',
      });

      let hasResolved = false;
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[${projectName}] ${output}`);
        
        // Parse Vite output for port and URL
        const localMatch = output.match(/Local:\s*https?:\/\/localhost:(\d+)/);
        const networkMatch = output.match(/Network:\s*https?:\/\/[^:]+:(\d+)/);
        const portMatch = localMatch || networkMatch;
        
        if (portMatch && !hasResolved) {
          const port = parseInt(portMatch[1]);
          const url = `http://localhost:${port}`;
          const serverInfo = { port, url };
          
          this.serverInfo.set(projectName, serverInfo);
          hasResolved = true;
          resolve(serverInfo);
        }
        
        // Fallback for other dev server messages
        if (!hasResolved && (output.includes('ready') || output.includes('server running'))) {
          const serverInfo = { port: 3000, url: 'http://localhost:3000' };
          this.serverInfo.set(projectName, serverInfo);
          hasResolved = true;
          resolve(serverInfo);
        }
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[${projectName}] ${output}`);
        
        // Check for specific errors that indicate missing dependencies
        if (output.includes('ENOENT') || output.includes('Cannot find module')) {
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error('Dependencies not installed. Please install packages first.'));
          }
        }
      });

      child.on('close', (code) => {
        console.log(`Dev server for ${projectName} exited with code ${code}`);
        this.runningServers.delete(projectName);
        this.serverInfo.delete(projectName);
        
        if (!hasResolved) {
          hasResolved = true;
          if (code !== 0) {
            reject(new Error(`Dev server failed to start (exit code: ${code}). ${stderr || stdout}`));
          }
        }
      });

      child.on('error', (error) => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Failed to start dev server: ${error.message}`));
        }
        this.runningServers.delete(projectName);
        this.serverInfo.delete(projectName);
      });

      this.runningServers.set(projectName, child);
      
      // Longer timeout with better error message
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error('Dev server failed to start within 10 seconds. Check if dependencies are installed.'));
        }
      }, 10000);
    });
  }

  async stopDevServer(projectName: string): Promise<void> {
    const child = this.runningServers.get(projectName);
    if (!child) {
      throw new Error(`No dev server running for ${projectName}`);
    }

    return new Promise((resolve) => {
      child.kill('SIGTERM');
      
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
        this.runningServers.delete(projectName);
        this.serverInfo.delete(projectName);
        resolve();
      }, 5000);
    });
  }

  isDevServerRunning(projectName: string): boolean {
    return this.runningServers.has(projectName);
  }

  getServerInfo(projectName: string): DevServerInfo | undefined {
    return this.serverInfo.get(projectName);
  }

  async openProjectFolder(projectPath: string): Promise<void> {
    await shell.openPath(projectPath);
  }
}

export const projectService = new ProjectService(); 