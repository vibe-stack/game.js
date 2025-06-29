import { ScriptManager, ScriptConfig, ScriptParameter } from '@/models/script-manager';
import { toast } from 'sonner';

interface LoadedScript {
  path: string;
  config: ScriptConfig;
  isFileScript: boolean; // true if loaded from file system, false if example/built-in
}

export class ScriptLoaderService {
  private static instance: ScriptLoaderService;
  private loadedScripts = new Map<string, LoadedScript>(); // scriptId -> LoadedScript
  private projectScriptFiles = new Map<string, Set<string>>(); // projectPath -> script file paths
  private currentScriptManager: ScriptManager | null = null;
  private currentProjectPath: string | null = null;
  
  private constructor() {}

  static getInstance(): ScriptLoaderService {
    if (!ScriptLoaderService.instance) {
      ScriptLoaderService.instance = new ScriptLoaderService();
    }
    return ScriptLoaderService.instance;
  }

  async initialize(): Promise<void> {
    // No longer need to initialize esbuild-wasm
    // Main process handles all compilation
  }

  async startWatchingProject(projectPath: string): Promise<void> {
    // Use IPC directly to start watching
    await window.scriptAPI.startWatching(projectPath);
    
    // Initialize project script files set
    if (!this.projectScriptFiles.has(projectPath)) {
      this.projectScriptFiles.set(projectPath, new Set());
    }
    
    // Start polling for script file changes
    this.pollForScriptFiles(projectPath);
  }

  async stopWatchingProject(projectPath: string): Promise<void> {
    // Use IPC directly to stop watching
    await window.scriptAPI.stopWatching(projectPath);
    
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
    try {
      // Get compiled scripts directly from main process via IPC
      const compiledScripts = await window.scriptAPI.getCompiledScripts(projectPath);
      const projectScripts = this.projectScriptFiles.get(projectPath) || new Set();
      
      // Track current script paths
      const currentScriptPaths = new Set(Object.keys(compiledScripts));
      
      // Add new scripts
      for (const scriptPath of currentScriptPaths) {
        if (!projectScripts.has(scriptPath)) {
          projectScripts.add(scriptPath);
          await this.loadScriptFromFile(projectPath, scriptPath);
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
    } catch (error) {
      console.error('Error polling for script files:', error);
    }
  }

  private async loadScriptFromFile(projectPath: string, scriptPath: string): Promise<void> {
    try {
      const scriptId = this.getScriptIdFromPath(projectPath, scriptPath);
      const scriptName = this.getScriptNameFromPath(scriptPath);

      // Check if this script is already loaded
      const existingScript = this.loadedScripts.get(scriptId);
      
      // Get the compiled script code directly from main process via IPC
      const compiledCode = await window.scriptAPI.readCompiledScript(projectPath, scriptPath);
      
      if (existingScript && existingScript.config.code === compiledCode) {
        console.log(`Script ${scriptId} already loaded with same content, skipping reload`);
        return;
      }
      
      // Extract parameters from the script code if available
      const parameters = this.extractParametersFromCode(compiledCode);
      
      // Create script config
      const config: ScriptConfig = {
        id: scriptId,
        name: scriptName,
        code: compiledCode,
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

  private extractParametersFromCode(code: string): ScriptParameter[] | undefined {
    try {
      // Look for parameter exports in the compiled code
      // This is a simple regex-based approach - could be enhanced
      const paramExportMatch = code.match(/export\s+(?:const|let|var)\s+parameters\s*=\s*(\[[\s\S]*?\]);/);
      if (paramExportMatch) {
        // Safely evaluate the parameters array
        const parametersCode = paramExportMatch[1];
        const parameters = new Function(`return ${parametersCode}`)();
        if (Array.isArray(parameters)) {
          return parameters.filter((param: any) => 
            param.name && 
            param.type && 
            ['number', 'string', 'boolean', 'vector3', 'select'].includes(param.type)
          );
        }
      }
    } catch (error) {
      console.error('Failed to extract parameters from compiled code:', error);
    }
    
    return undefined;
  }

  async loadScriptsIntoManager(scriptManager: ScriptManager, projectPath: string): Promise<void> {
    // Store references for automatic loading
    this.currentScriptManager = scriptManager;
    this.currentProjectPath = projectPath;
    
    try {
      // Get compiled scripts directly from main process via IPC
      const compiledScripts = await window.scriptAPI.getCompiledScripts(projectPath);
      
      for (const scriptPath of Object.keys(compiledScripts)) {
        const scriptId = this.getScriptIdFromPath(projectPath, scriptPath);
        const loadedScript = this.loadedScripts.get(scriptId);
        
        if (loadedScript) {
          // Check if script is already in manager
          if (!scriptManager.getScript(scriptId)) {
            try {
              scriptManager.compileScript(loadedScript.config);
            } catch (error) {
              console.error(`Failed to compile script ${scriptId}:`, error);
              toast.error(`Failed to compile script: ${loadedScript.config.name}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load scripts into manager:', error);
    }
  }

  getLoadedScripts(projectPath: string): LoadedScript[] {
    const projectScripts = this.projectScriptFiles.get(projectPath);
    if (!projectScripts) return [];
    
    return Array.from(projectScripts)
      .map(scriptPath => {
        const scriptId = this.getScriptIdFromPath(projectPath, scriptPath);
        return this.loadedScripts.get(scriptId);
      })
      .filter((script): script is LoadedScript => script !== undefined);
  }

  getScriptIdFromPath(projectPath: string, scriptPath: string): string {
    // Create a unique ID for the script based on project and script path
    const relativePath = scriptPath.replace(/\\/g, '/');
    return `${projectPath.split(/[\\/]/).pop()}_${relativePath.replace(/\//g, '_').replace(/\.ts$/, '')}`;
  }

  getScriptNameFromPath(scriptPath: string): string {
    // Extract human-readable name from script path
    const fileName = scriptPath.split(/[\\/]/).pop() || scriptPath;
    return fileName.replace(/\.ts$/, '').replace(/[-_]/g, ' ');
  }

  async reloadScript(projectPath: string, scriptPath: string): Promise<boolean> {
    try {
      // Request recompilation from main process
      const result = await window.scriptAPI.compileScript(projectPath, scriptPath);
      if (result.success) {
        // Reload the script
        await this.loadScriptFromFile(projectPath, scriptPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to reload script:', error);
      return false;
    }
  }

  dispose(): void {
    // Stop watching all projects
    for (const projectPath of this.projectScriptFiles.keys()) {
      this.stopWatchingProject(projectPath);
    }
    
    // Clear all caches
    this.loadedScripts.clear();
    this.projectScriptFiles.clear();
    this.currentScriptManager = null;
    this.currentProjectPath = null;
  }
} 