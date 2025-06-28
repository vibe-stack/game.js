import { shaderManager, TSLShaderConfig, ShaderType } from '@/models';
import { GameProject } from '@/types/project';
import path from 'path';
import { toast } from 'sonner';

export class ShaderService {
  private projectPath: string | null = null;
  private loadedShaders = new Map<string, string>(); // shaderId -> filePath

  async loadProjectShaders(project: GameProject) {
    this.projectPath = project.path;
    
    try {
      // Load shaders from project's shaders directory
      const shadersPath = path.join(project.path, 'shaders');
      const shaderItems = await window.projectAPI.listDirectory(shadersPath);
      
      for (const item of shaderItems) {
        if (item.type === 'file' && item.name.endsWith('.shader.json')) {
          await this.loadShaderFile(item.path);
        }
      }
      
      // Load example shaders if no shaders found
      if (shaderManager.getAllShaders().length === 0) {
        await this.loadExampleShaders();
      }
    } catch (error) {
      console.error('Failed to load project shaders:', error);
      // Load example shaders as fallback
      await this.loadExampleShaders();
    }
  }

  private async loadShaderFile(filePath: string) {
    try {
      const content = await window.projectAPI.readFile(filePath);
      const shaderData = JSON.parse(content);
      
      const shader = shaderManager.deserializeShader(shaderData);
      this.loadedShaders.set(shader.id, filePath);
    } catch (error) {
      console.error(`Failed to load shader from ${filePath}:`, error);
    }
  }

  private async loadExampleShaders() {
    const { loadExampleShaders } = await import('@/models');
    const examples = loadExampleShaders();
    
    for (const example of examples) {
      shaderManager.registerShader(example);
    }
  }

  async saveShader(shaderId: string): Promise<boolean> {
    if (!this.projectPath) {
      toast.error('No project loaded');
      return false;
    }

    const shader = shaderManager.getShader(shaderId);
    if (!shader) {
      toast.error('Shader not found');
      return false;
    }

    try {
      const shadersPath = path.join(this.projectPath, 'shaders');
      
      // Ensure shaders directory exists
      const pathExists = await window.projectAPI.fileExists(shadersPath);
      if (!pathExists) {
        await window.projectAPI.createDirectory(shadersPath);
      }
      
      const fileName = `${shader.name.toLowerCase().replace(/\s+/g, '-')}.shader.json`;
      const filePath = path.join(shadersPath, fileName);
      
      const shaderData = shader.serialize();
      await window.projectAPI.writeFile(filePath, JSON.stringify(shaderData, null, 2));
      
      this.loadedShaders.set(shaderId, filePath);
      toast.success(`Shader "${shader.name}" saved`);
      return true;
    } catch (error) {
      console.error('Failed to save shader:', error);
      toast.error('Failed to save shader');
      return false;
    }
  }

  async createShader(config: TSLShaderConfig): Promise<string> {
    const shader = shaderManager.registerShader(config);
    await this.saveShader(shader.id);
    return shader.id;
  }

  async deleteShader(shaderId: string): Promise<boolean> {
    const filePath = this.loadedShaders.get(shaderId);
    
    if (filePath) {
      try {
        await window.projectAPI.deleteFile(filePath);
        this.loadedShaders.delete(shaderId);
      } catch (error) {
        console.error('Failed to delete shader file:', error);
      }
    }
    
    shaderManager.removeShader(shaderId);
    toast.success('Shader deleted');
    return true;
  }

  getShaderById(shaderId: string) {
    return shaderManager.getShader(shaderId);
  }

  getAllShaders() {
    return shaderManager.getAllShaders();
  }

  getShadersByType(type: ShaderType) {
    return shaderManager.getShadersByType(type);
  }

  async compileShader(shaderId: string) {
    return shaderManager.compileShader(shaderId);
  }

  dispose() {
    this.loadedShaders.clear();
    this.projectPath = null;
  }
}

// Singleton instance
export const shaderService = new ShaderService(); 