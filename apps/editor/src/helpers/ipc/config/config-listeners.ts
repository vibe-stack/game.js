import { ipcMain } from "electron";
import { 
  CONFIG_READ_FILE_CHANNEL, 
  CONFIG_WRITE_FILE_CHANNEL, 
  CONFIG_INSTALL_PACKAGES_CHANNEL,
  CONFIG_GET_PACKAGE_INFO_CHANNEL
} from "./config-channels";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

export function addConfigEventListeners() {
  // Read config file
  ipcMain.handle(CONFIG_READ_FILE_CHANNEL, async (_, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read config file: ${error}`);
    }
  });

  // Write config file
  ipcMain.handle(CONFIG_WRITE_FILE_CHANNEL, async (_, filePath: string, content: any) => {
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write config file: ${error}`);
    }
  });

  // Install packages
  ipcMain.handle(CONFIG_INSTALL_PACKAGES_CHANNEL, async (_, projectPath: string, packageManager: string, packages?: string[]) => {
    return new Promise((resolve, reject) => {
      let command: string;
      let args: string[];

      switch (packageManager) {
        case 'pnpm':
          command = 'pnpm';
          args = packages ? ['add', ...packages] : ['install'];
          break;
        case 'yarn':
          command = 'yarn';
          args = packages ? ['add', ...packages] : ['install'];
          break;
        case 'bun':
          command = 'bun';
          args = packages ? ['add', ...packages] : ['install'];
          break;
        case 'npm':
        default:
          command = 'npm';
          args = packages ? ['install', ...packages] : ['install'];
          break;
      }

      const process = spawn(command, args, {
        cwd: projectPath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject(new Error(`Package installation failed: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start package manager: ${error.message}`));
      });
    });
  });

  // Get package manager and npm info
  ipcMain.handle(CONFIG_GET_PACKAGE_INFO_CHANNEL, async (_, projectPath: string) => {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonExists = await fs.promises.access(packageJsonPath).then(() => true).catch(() => false);
      
      if (!packageJsonExists) {
        throw new Error('package.json not found in project');
      }

      // Check which lock files exist to determine likely package manager
      const pnpmLock = await fs.promises.access(path.join(projectPath, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
      const yarnLock = await fs.promises.access(path.join(projectPath, 'yarn.lock')).then(() => true).catch(() => false);
      const bunLock = await fs.promises.access(path.join(projectPath, 'bun.lockb')).then(() => true).catch(() => false);
      
      let suggestedPackageManager = 'npm';
      if (pnpmLock) suggestedPackageManager = 'pnpm';
      else if (yarnLock) suggestedPackageManager = 'yarn';
      else if (bunLock) suggestedPackageManager = 'bun';

      return {
        hasPackageJson: true,
        suggestedPackageManager
      };
    } catch {
      return {
        hasPackageJson: false,
        suggestedPackageManager: 'npm'
      };
    }
  });
} 