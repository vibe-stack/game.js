import fs from "fs/promises";
import path from "path";

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  modified?: Date;
}

export class FileSystemManager {
  private constructor() {} // Prevent instantiation

  static async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf-8");
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async createFile(filePath: string, content: string = ""): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  }

  static async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  static async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  static async deleteDirectory(dirPath: string): Promise<void> {
    await fs.rmdir(dirPath, { recursive: true });
  }

  static async renameItem(oldPath: string, newPath: string): Promise<void> {
    await fs.rename(oldPath, newPath);
  }

  static async listDirectory(dirPath: string): Promise<FileSystemItem[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items: FileSystemItem[] = [];

      for (const entry of entries) {
        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' || 
            entry.name === 'build') {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        items.push({
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          extension: entry.isFile() ? path.extname(entry.name) : undefined,
          size: entry.isFile() ? stats.size : undefined,
          modified: stats.mtime,
        });
      }

      // Sort directories first, then files, both alphabetically
      return items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      throw new Error(`Failed to list directory: ${error}`);
    }
  }

  static async getFileStats(filePath: string): Promise<{ size: number; modified: Date }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error}`);
    }
  }
} 