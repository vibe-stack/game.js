import { ScriptManager, ScriptConfig, ScriptParameter } from '@/models/script-manager';
import { ScriptCompilationService } from './script-compilation-service';
import { toast } from 'sonner';

interface LoadedScript {
  path: string;
  config: ScriptConfig;
  isFileScript: boolean; // true if loaded from file system, false if example/built-in
}

export class ScriptLoaderService {
  private static instance: ScriptLoaderService;
  private compilationService: ScriptCompilationService;
  private loadedScripts = new Map<string, LoadedScript>(); // scriptId -> LoadedScript
  private projectScriptFiles = new Map<string, Set<string>>(); // projectPath -> script file paths
  private currentScriptManager: ScriptManager | null = null;
  private currentProjectPath: string | null = null;
  
  private constructor() {
    this.compilationService = ScriptCompilationService.getInstance();
  }

  static getInstance(): ScriptLoaderService {
    if (!ScriptLoaderService.instance) {
      ScriptLoaderService.instance = new ScriptLoaderService();
    }
    return ScriptLoaderService.instance;
  }

  async initialize(): Promise<void> {
    await this.compilationService.initialize();
  }

  async startWatchingProject(projectPath: string): Promise<void> {
    await this.compilationService.startWatching(projectPath);
    
    // Initialize project script files set
    if (!this.projectScriptFiles.has(projectPath)) {
      this.projectScriptFiles.set(projectPath, new Set());
    }
    
    // Start polling for script file changes
    this.pollForScriptFiles(projectPath);
  }

  async stopWatchingProject(projectPath: string): Promise<void> {
    await this.compilationService.stopWatching(projectPath);
    
    // Clean up loaded scripts for this project
    const projectScripts = this.projectScriptFiles.get(projectPath);
    if (projectScripts) {
      for (const scriptPath of projectScripts) {
        const scriptId = this.getScriptIdFromPath(projectPath, scriptPath);
        this.loadedScripts.delete(scriptId);
      }
      this.projectScriptFiles.delete(projectPath);
    }
  }

  private async pollForScriptFiles(projectPath: string): Promise<void> {
    const compiledScripts = this.compilationService.getAllCompiledScripts(projectPath);
    const projectScripts = this.projectScriptFiles.get(projectPath) || new Set();
    
    // Track current script paths
    const currentScriptPaths = new Set(compiledScripts.map(s => s.scriptPath));
    
    // Add new scripts
    for (const compiledScript of compiledScripts) {
      if (!projectScripts.has(compiledScript.scriptPath)) {
        projectScripts.add(compiledScript.scriptPath);
        await this.loadScriptFromFile(projectPath, compiledScript.scriptPath);
      }
    }
    
    // Remove deleted scripts
    for (const scriptPath of projectScripts) {
      if (!currentScriptPaths.has(scriptPath)) {
        projectScripts.delete(scriptPath);
        const scriptId = this.getScriptIdFromPath(projectPath, scriptPath);
        this.loadedScripts.delete(scriptId);
      }
    }
    
    // Continue polling if still watching this project
    if (this.projectScriptFiles.has(projectPath)) {
      setTimeout(() => this.pollForScriptFiles(projectPath), 1000);
    }
  }

  private async loadScriptFromFile(projectPath: string, scriptPath: string): Promise<void> {
    try {
      const scriptId = this.getScriptIdFromPath(projectPath, scriptPath);
      const scriptName = this.getScriptNameFromPath(scriptPath);

      // Check if this script is already loaded and hasn't changed
      const existingScript = this.loadedScripts.get(scriptId);
      const compiledModule = this.compilationService.getCompiledScript(projectPath, scriptPath);
      
      if (existingScript && compiledModule && 
          existingScript.config.code === compiledModule.code) {
        console.log(`Script ${scriptId} already loaded with same content, skipping reload`);
        return;
      }
      
      // Load the compiled module to extract metadata
      const { module, error } = await this.compilationService.loadScriptModule(projectPath, scriptPath);
      
      if (error || !module) {
        console.error(`Failed to load script module ${scriptPath}:`, error);
        return;
      }
      
      // Extract parameters from the module if available
      const parameters = this.extractParameters(module);
      
      // Get the compiled script code for the script manager
      const compiledScript = this.compilationService.getCompiledScript(projectPath, scriptPath);
      if (!compiledScript) {
        console.error(`No compiled script found for ${scriptPath}`);
        return;
      }
      
      // Create script config
      const config: ScriptConfig = {
        id: scriptId,
        name: scriptName,
        code: compiledScript.code,
        enabled: true,
        priority: 0,
        parameters
      };
      
      this.loadedScripts.set(scriptId, {
        path: scriptPath,
        config,
        isFileScript: true
      });
      
      // Automatically load into script manager if available
      if (this.currentScriptManager && this.currentProjectPath === projectPath) {
        if (!this.currentScriptManager.getScript(scriptId)) {
          try {
            // Don't transform here - let the script manager handle the transformation
            this.currentScriptManager.compileScript(config);
            console.log(`Automatically loaded script: ${scriptName}`);
          } catch (error) {
            console.error(`Failed to auto-load script ${scriptId}:`, error);
          }
        }
      }
      
    } catch (error) {
      console.error(`Failed to load script from file ${scriptPath}:`, error);
    }
  }

  private extractParameters(module: any): ScriptParameter[] | undefined {
    // If the module exports a parameters array, use it
    if (module.parameters && Array.isArray(module.parameters)) {
      return module.parameters.filter((param: any) => 
        param.name && 
        param.type && 
        ['number', 'string', 'boolean', 'vector3', 'select'].includes(param.type)
      );
    }
    
    // If the module exports a getParameters function, call it
    if (typeof module.getParameters === 'function') {
      try {
        const params = module.getParameters();
        if (Array.isArray(params)) {
          return params;
        }
      } catch (error) {
        console.error('Failed to get parameters from script:', error);
      }
    }
    
    return undefined;
  }

  async loadScriptsIntoManager(scriptManager: ScriptManager, projectPath: string): Promise<void> {
    // Store references for automatic loading
    this.currentScriptManager = scriptManager;
    this.currentProjectPath = projectPath;
    
    const compiledScripts = this.compilationService.getAllCompiledScripts(projectPath);
    
    for (const compiledScript of compiledScripts) {
      const scriptId = this.getScriptIdFromPath(projectPath, compiledScript.scriptPath);
      const loadedScript = this.loadedScripts.get(scriptId);
      
      if (loadedScript) {
        // Check if script is already in manager
        if (!scriptManager.getScript(scriptId)) {
          try {
            // Don't transform here - let the script manager handle the transformation
            scriptManager.compileScript(loadedScript.config);
          } catch (error) {
            console.error(`Failed to compile script ${scriptId}:`, error);
            toast.error(`Failed to load script: ${loadedScript.path}`);
          }
        }
      }
    }
  }



  getLoadedScripts(projectPath: string): LoadedScript[] {
    const scripts: LoadedScript[] = [];
    const projectScripts = this.projectScriptFiles.get(projectPath);
    
    if (projectScripts) {
      for (const scriptPath of projectScripts) {
        const scriptId = this.getScriptIdFromPath(projectPath, scriptPath);
        const loadedScript = this.loadedScripts.get(scriptId);
        if (loadedScript) {
          scripts.push(loadedScript);
        }
      }
    }
    
    return scripts;
  }

  getScriptIdFromPath(projectPath: string, scriptPath: string): string {
    // Create a unique ID from the script path
    // Remove .ts extension and replace path separators
    return `file:${scriptPath.replace(/\.ts$/, '').replace(/[\/\\]/g, '_')}`;
  }

  getScriptNameFromPath(scriptPath: string): string {
    // Extract a readable name from the path
    const parts = scriptPath.split(/[\/\\]/);
    const fileName = parts[parts.length - 1];
    const nameWithoutExt = fileName.replace(/\.(ts|js)$/, '');
    
    // Convert snake_case or kebab-case to Title Case
    return nameWithoutExt
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async reloadScript(projectPath: string, scriptPath: string): Promise<boolean> {
    const success = await this.compilationService.recompileScript(projectPath, scriptPath);
    if (success) {
      await this.loadScriptFromFile(projectPath, scriptPath);
    }
    return success;
  }

  dispose(): void {
    this.compilationService.dispose();
    this.loadedScripts.clear();
    this.projectScriptFiles.clear();
  }
} 