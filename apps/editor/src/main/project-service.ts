import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { shell } from 'electron';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);

export interface GameProject {
  name: string;
  path: string;
  lastModified: Date;
  isRunning?: boolean;
  devServerInfo?: DevServerInfo;
}

export interface DevServerInfo {
  port?: number;
  url?: string;
  pid?: number;
  external?: boolean; // Whether it was started outside our app
}

interface RunningProcess {
  pid: number;
  command: string;
  cwd: string;
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
    
    // Initialize by syncing with existing processes
    this.initialize().catch(console.error);
  }

  async initialize(): Promise<void> {
    await this.ensureProjectsDir();
    await this.syncServerStates();
  }

  async ensureProjectsDir(): Promise<void> {
    try {
      await fs.promises.access(this.projectsDir);
    } catch {
      await fs.promises.mkdir(this.projectsDir, { recursive: true });
    }
  }

  // Check if a port is in use
  private async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(false));
        server.close();
      });
      
      server.on('error', () => resolve(true));
    });
  }

  // Find processes that might be dev servers for our projects
  private async findDevServerProcesses(): Promise<RunningProcess[]> {
    try {
      let command: string;
      let args: string[];
      
      if (process.platform === 'win32') {
        command = 'wmic';
        args = ['process', 'get', 'ProcessId,CommandLine', '/format:csv'];
      } else {
        command = 'ps';
        args = ['-eo', 'pid,command'];
      }
      
      const { stdout } = await execAsync(`${command} ${args.join(' ')}`);
      const processes: RunningProcess[] = [];
      
      const lines = stdout.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        let pid: number;
        let commandLine: string;
        
        if (process.platform === 'win32') {
          const parts = line.split(',');
          if (parts.length < 2) continue;
          commandLine = parts[1]?.trim() || '';
          pid = parseInt(parts[2]?.trim() || '0');
        } else {
          const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
          if (!match) continue;
          pid = parseInt(match[1]);
          commandLine = match[2];
        }
        
        if (isNaN(pid) || pid === 0) continue;
        
        // Look for dev server processes (pnpm dev, npm dev, vite, etc.)
        if (commandLine.includes('pnpm') && commandLine.includes('dev') ||
            commandLine.includes('npm') && commandLine.includes('dev') ||
            commandLine.includes('vite') ||
            commandLine.includes('webpack-dev-server')) {
          
          // Try to determine the working directory
          let cwd = '';
          try {
            if (process.platform === 'win32') {
              const { stdout: cwdOut } = await execAsync(`wmic process where "ProcessId=${pid}" get ExecutablePath /format:list`);
              cwd = cwdOut.match(/ExecutablePath=(.+)/)?.[1] || '';
            } else {
              const { stdout: cwdOut } = await execAsync(`lsof -p ${pid} | grep cwd`);
              cwd = cwdOut.split(' ').pop()?.trim() || '';
            }
          } catch {
            // Ignore errors getting cwd
          }
          
          processes.push({ pid, command: commandLine, cwd });
        }
      }
      
      return processes;
    } catch (error) {
      console.warn('Failed to find dev server processes:', error);
      return [];
    }
  }

  // Detect dev servers running for specific project
  private async detectProjectDevServer(projectName: string, projectPath: string): Promise<DevServerInfo | undefined> {
    // First check common dev server ports
    const commonPorts = [3000, 3001, 5173, 8080, 4000, 5000];
    
    for (const port of commonPorts) {
      if (await this.isPortInUse(port)) {
        // Check if this port serves content that looks like our project
        try {
          const response = await fetch(`http://localhost:${port}`);
          if (response.ok) {
            // Try to find the process using this port
            const processes = await this.findDevServerProcesses();
            const matchingProcess = processes.find(p => 
              p.cwd.includes(projectPath) || p.command.includes(projectPath)
            );
            
            return {
              port,
              url: `http://localhost:${port}`,
              pid: matchingProcess?.pid,
              external: !this.runningServers.has(projectName)
            };
          }
        } catch {
          // Port is in use but not serving HTTP, might still be our dev server starting up
          const processes = await this.findDevServerProcesses();
          const matchingProcess = processes.find(p => 
            p.cwd.includes(projectPath) || p.command.includes(projectPath)
          );
          
          if (matchingProcess) {
            return {
              port,
              url: `http://localhost:${port}`,
              pid: matchingProcess.pid,
              external: !this.runningServers.has(projectName)
            };
          }
        }
      }
    }
    
    return undefined;
  }

  // Sync internal state with actual running processes
  private async syncServerStates(): Promise<void> {
    const projects = await this.loadProjects();
    
    for (const project of projects) {
      const serverInfo = await this.detectProjectDevServer(project.name, project.path);
      
      if (serverInfo) {
        this.serverInfo.set(project.name, serverInfo);
      } else {
        this.serverInfo.delete(project.name);
        // Clean up any tracked processes that are no longer running
        if (this.runningServers.has(project.name)) {
          const child = this.runningServers.get(project.name);
          if (child && child.killed) {
            this.runningServers.delete(project.name);
          }
        }
      }
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
            
            // Check if dev server is running for this project
            const devServerInfo = await this.detectProjectDevServer(entry.name, projectPath);
            
            projects.push({
              name: entry.name,
              path: projectPath,
              lastModified: stats.mtime,
              isRunning: !!devServerInfo,
              devServerInfo,
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
    // First check if a dev server is already running
    const existingServer = await this.detectProjectDevServer(projectName, path.join(this.projectsDir, projectName));
    if (existingServer) {
      throw new Error(`Dev server for ${projectName} is already running on port ${existingServer.port}`);
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

      // Helper function to verify server is accessible
      const verifyServerAccessible = async (url: string, maxAttempts = 10): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const response = await fetch(url, { 
              method: 'HEAD',
              signal: AbortSignal.timeout(1000) // 1 second timeout per attempt
            });
            if (response.ok || response.status < 500) {
              return true;
            }
          } catch {
            // Server not ready yet, wait and retry
            console.log(`[${projectName}] Server not ready (attempt ${i + 1}), retrying...`);
          }
          
          // Wait 500ms before next attempt
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        return false;
      };

      child.stdout?.on('data', async (data) => {
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
          
          console.log(`[${projectName}] Detected server URL: ${url}, verifying accessibility...`);
          
          // Verify the server is actually accessible before resolving
          const isAccessible = await verifyServerAccessible(url);
          
          if (isAccessible) {
            const serverInfo = { port, url, pid: child.pid, external: false };
            this.serverInfo.set(projectName, serverInfo);
            hasResolved = true;
            console.log(`[${projectName}] Server verified and accessible at ${url}`);
            resolve(serverInfo);
          } else {
            console.warn(`[${projectName}] Server at ${url} is not accessible after verification attempts`);
          }
        }
        
        // Fallback for other dev server messages
        if (!hasResolved && (output.includes('ready') || output.includes('server running'))) {
          const url = 'http://localhost:3000';
          
          console.log(`[${projectName}] Fallback server detection, verifying ${url}...`);
          
          const isAccessible = await verifyServerAccessible(url);
          
          if (isAccessible) {
            const serverInfo = { port: 3000, url, pid: child.pid, external: false };
            this.serverInfo.set(projectName, serverInfo);
            hasResolved = true;
            console.log(`[${projectName}] Fallback server verified and accessible at ${url}`);
            resolve(serverInfo);
          } else {
            console.warn(`[${projectName}] Fallback server at ${url} is not accessible after verification attempts`);
          }
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
          reject(new Error('Dev server failed to start within 15 seconds. The server may be starting but not accessible yet. Check console logs for details.'));
        }
      }, 15000); // Increased timeout to 15 seconds to account for verification
    });
  }

  async stopDevServer(projectName: string): Promise<void> {
    const serverInfo = await this.detectProjectDevServer(projectName, path.join(this.projectsDir, projectName));
    
    if (!serverInfo) {
      throw new Error(`No dev server running for ${projectName}`);
    }

    // If we have a child process, use it
    const child = this.runningServers.get(projectName);
    if (child) {
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
    // If it's an external process, kill it by PID
    else if (serverInfo.pid) {
      try {
        process.kill(serverInfo.pid, 'SIGTERM');
        
        // Wait a bit then force kill if needed
        setTimeout(() => {
          try {
            process.kill(serverInfo.pid!, 0); // Check if still running
            process.kill(serverInfo.pid!, 'SIGKILL'); // Force kill
          } catch {
            // Process already dead
          }
        }, 5000);
        
        this.serverInfo.delete(projectName);
      } catch (error) {
        throw new Error(`Failed to stop external dev server: ${error}`);
      }
    } else {
      throw new Error(`Cannot stop dev server for ${projectName}: no process information available`);
    }
  }

  async isDevServerRunning(projectName: string): Promise<boolean> {
    const serverInfo = await this.detectProjectDevServer(projectName, path.join(this.projectsDir, projectName));
    return !!serverInfo;
  }

  async getServerInfo(projectName: string): Promise<DevServerInfo | undefined> {
    // First check if we have cached info
    const cachedInfo = this.serverInfo.get(projectName);
    
    if (cachedInfo) {
      return cachedInfo;
    }
    
    // If not cached, try to detect running dev server
    const projectPath = path.join(this.projectsDir, projectName);
    const detectedInfo = await this.detectProjectDevServer(projectName, projectPath);
    
    if (detectedInfo) {
      // Cache the detected info
      this.serverInfo.set(projectName, detectedInfo);
      return detectedInfo;
    }
    
    return undefined;
  }

  async openProjectFolder(projectPath: string): Promise<void> {
    await shell.openPath(projectPath);
  }

  async getSceneInfo(projectName: string): Promise<{ routes: Array<{ path: string; filePath: string; name: string }> }> {
    const projectPath = path.join(this.projectsDir, projectName);
    
    try {
      // Check if project exists
      await fs.promises.access(projectPath);
      console.log(`Scanning for scenes in project: ${projectName} at path: ${projectPath}`);
      
      // Look for scene files in the project
      const routes = await this.findSceneFiles(projectPath);
      console.log(`Found ${routes.length} scene routes:`, routes);
      
      return { routes };
    } catch (error) {
      console.error(`Failed to get scene info for ${projectName}:`, error);
      return { routes: [] };
    }
  }

  private async findSceneFiles(projectPath: string): Promise<Array<{ path: string; filePath: string; name: string }>> {
    const routes: Array<{ path: string; filePath: string; name: string }> = [];
    const srcPath = path.join(projectPath, 'src');
    
    try {
      await fs.promises.access(srcPath);
      await this.scanForScenesRecursive(srcPath, srcPath, routes);
    } catch {
      // If no src directory, try to find scenes in root
      await this.scanForScenesRecursive(projectPath, projectPath, routes);
    }
    
    return routes;
  }

  private async scanForScenesRecursive(currentPath: string, basePath: string, routes: Array<{ path: string; filePath: string; name: string }>): Promise<void> {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          // Recursively scan subdirectories
          await this.scanForScenesRecursive(fullPath, basePath, routes);
        } else if (entry.isFile() && entry.name === 'scene.ts') {
          // Found a scene file
          const relativePath = path.relative(basePath, fullPath);
          const routePath = this.convertFilePathToRoute(relativePath);
          const sceneName = this.generateSceneName(routePath);
          
          // Ensure filePath always starts with src/ for consistency
          let normalizedFilePath = relativePath;
          if (!normalizedFilePath.startsWith('src/') && !normalizedFilePath.startsWith('src\\')) {
            normalizedFilePath = path.join('src', relativePath).replace(/\\/g, '/');
          } else {
            normalizedFilePath = normalizedFilePath.replace(/\\/g, '/');
          }
          
          routes.push({
            path: routePath,
            filePath: normalizedFilePath,
            name: sceneName
          });
        }
      }
    } catch (error) {
      // Ignore errors for individual directories
      console.warn(`Failed to scan directory ${currentPath}:`, error);
    }
  }

  private convertFilePathToRoute(filePath: string): string {
    // Convert file path to route
    // e.g., "src/app/scene.ts" -> "/"
    // e.g., "app/scene.ts" -> "/"
    // e.g., "src/app/level1/scene.ts" -> "/level1"
    // e.g., "app/level1/scene.ts" -> "/level1"
    
    const dir = path.dirname(filePath);
    const parts = dir.split(path.sep).filter(part => part && part !== 'app' && part !== 'src');
    
    if (parts.length === 0) {
      return '/';
    }
    
    return '/' + parts.join('/');
  }

  private generateSceneName(routePath: string): string {
    if (routePath === '/') {
      return 'Main Scene';
    }
    
    const parts = routePath.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    
    // Convert kebab-case or camelCase to Title Case
    return lastPart
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async connectToEditor(projectName: string): Promise<void> {
    console.log(`Connecting editor to project: ${projectName}`);
    // The Vite plugin already handles WebSocket communication on port 3001
    // No need to start another WebSocket server here
  }

  async sendPropertyUpdate(projectName: string, property: string, value: unknown, temporary = false): Promise<void> {
    console.log(`Property update request for ${projectName}:`, { property, value, temporary });
    
    // Check if dev server is running
    if (!(await this.isDevServerRunning(projectName))) {
      throw new Error(`Dev server is not running for project: ${projectName}`);
    }
    
    // The Vite plugin handles property updates via its WebSocket server
    // The editor connects directly to the Vite plugin's WebSocket at port 3001
    console.log(`Property update will be handled by Vite plugin WebSocket`);
  }
}

export const projectService = new ProjectService(); 