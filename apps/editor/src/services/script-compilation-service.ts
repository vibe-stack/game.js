import * as esbuild from 'esbuild-wasm';
import { toast } from 'sonner';

interface CompiledScriptModule {
  scriptPath: string;
  compiledPath: string;
  code: string;
  sourceMap?: string;
  lastCompiled: Date;
  dependencies: string[];
  exports: string[];
}

interface ScriptCache {
  modules: Map<string, CompiledScriptModule>;
  importMap: Record<string, string>;
  vendorBundleUrl?: string;
}

export class ScriptCompilationService {
  private static instance: ScriptCompilationService;
  private esbuildInitialized = false;
  private scriptCaches = new Map<string, ScriptCache>(); // projectPath -> cache
  private watchingProjects = new Set<string>();

  private constructor() {}

  static getInstance(): ScriptCompilationService {
    if (!ScriptCompilationService.instance) {
      ScriptCompilationService.instance = new ScriptCompilationService();
    }
    return ScriptCompilationService.instance;
  }

  async initialize() {
    if (!this.esbuildInitialized) {
      try {
        await esbuild.initialize({
          wasmURL: '/node_modules/esbuild-wasm/esbuild.wasm',
          worker: true
        });
        this.esbuildInitialized = true;
      } catch (error) {
        console.error('Failed to initialize esbuild:', error);
        throw error;
      }
    }
  }

  async startWatching(projectPath: string): Promise<void> {
    if (this.watchingProjects.has(projectPath)) {
      return;
    }

    try {
      // Start watching through IPC
      const success = await window.scriptAPI.startWatching(projectPath);
      if (success) {
        this.watchingProjects.add(projectPath);
        
        // Initialize cache for this project
        if (!this.scriptCaches.has(projectPath)) {
          this.scriptCaches.set(projectPath, {
            modules: new Map(),
            importMap: {}
          });
        }

        // Get initial import map
        await this.updateImportMap(projectPath);
        
        // Start polling for updates
        this.pollForUpdates(projectPath);
      }
    } catch (error) {
      console.error('Failed to start watching scripts:', error);
      toast.error('Failed to start script watching');
    }
  }

  async stopWatching(projectPath: string): Promise<void> {
    if (!this.watchingProjects.has(projectPath)) {
      return;
    }

    try {
      await window.scriptAPI.stopWatching(projectPath);
      this.watchingProjects.delete(projectPath);
      this.scriptCaches.delete(projectPath);
    } catch (error) {
      console.error('Failed to stop watching scripts:', error);
    }
  }

  private async pollForUpdates(projectPath: string): Promise<void> {
    if (!this.watchingProjects.has(projectPath)) {
      return;
    }

    try {
      // Update import map
      await this.updateImportMap(projectPath);
      
      // Get compilation status
      const status = await window.scriptAPI.getCompilationStatus(projectPath);
      
      // Check for compiled scripts
      const compiledScripts = await window.scriptAPI.getCompiledScripts(projectPath);
      const cache = this.scriptCaches.get(projectPath);
      
      if (cache) {
        // Update cache with new compiled scripts
        for (const [scriptPath, compiledPath] of Object.entries(compiledScripts)) {
          // Check if we need to load this script
          const existingModule = cache.modules.get(scriptPath);
          if (!existingModule || existingModule.compiledPath !== compiledPath) {
            await this.loadCompiledScript(projectPath, scriptPath, compiledPath);
          }
        }

        // Remove scripts that are no longer compiled
        for (const scriptPath of cache.modules.keys()) {
          if (!compiledScripts[scriptPath]) {
            cache.modules.delete(scriptPath);
          }
        }
      }
    } catch (error) {
      console.error('Error polling for script updates:', error);
    }

    // Continue polling if still watching
    if (this.watchingProjects.has(projectPath)) {
      setTimeout(() => this.pollForUpdates(projectPath), 1000);
    }
  }

  private async updateImportMap(projectPath: string): Promise<void> {
    try {
      const importMapData = await window.scriptAPI.getImportMap(projectPath);
      const cache = this.scriptCaches.get(projectPath);
      
      if (cache && importMapData?.imports) {
        // Store import map for script resolution
        cache.importMap = importMapData.imports;
      }
    } catch (error) {
      console.error('Failed to update import map:', error);
    }
  }

  private async loadCompiledScript(
    projectPath: string, 
    scriptPath: string, 
    compiledPath: string
  ): Promise<void> {
    try {
      const cache = this.scriptCaches.get(projectPath);
      if (!cache) return;

      // Read the compiled script directly from the file system
      const code = await window.scriptAPI.readCompiledScript(projectPath, scriptPath);
      
      // Parse to extract dependencies and exports
      const dependencies = this.extractDependencies(code);
      const exports = this.extractExports(code);

      cache.modules.set(scriptPath, {
        scriptPath,
        compiledPath,
        code,
        lastCompiled: new Date(),
        dependencies,
        exports
      });
    } catch (error) {
      console.error(`Failed to load compiled script ${scriptPath}:`, error);
    }
  }

  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    const importRegex = /import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }
    
    return [...new Set(dependencies)];
  }

  private extractExports(code: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:function|const|let|var|class)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  async loadScriptModule(
    projectPath: string, 
    scriptPath: string
  ): Promise<{ module: any; error?: string }> {
    try {
      const cache = this.scriptCaches.get(projectPath);
      if (!cache) {
        throw new Error('Project not being watched');
      }

      const compiledModule = cache.modules.get(scriptPath);
      if (!compiledModule) {
        // Try to compile on demand
        await window.scriptAPI.compileScript(projectPath, scriptPath);
        await this.pollForUpdates(projectPath); // Force update
        
        const updatedModule = cache.modules.get(scriptPath);
        if (!updatedModule) {
          throw new Error('Script compilation failed');
        }
        
        return { module: updatedModule };
      }
      
      return { module: compiledModule };
    } catch (error) {
      console.error(`Failed to load script module ${scriptPath}:`, error);
      return { 
        module: null, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }



  getScriptCache(projectPath: string): ScriptCache | undefined {
    return this.scriptCaches.get(projectPath);
  }

  getCompiledScript(projectPath: string, scriptPath: string): CompiledScriptModule | undefined {
    return this.scriptCaches.get(projectPath)?.modules.get(scriptPath);
  }

  getAllCompiledScripts(projectPath: string): CompiledScriptModule[] {
    const cache = this.scriptCaches.get(projectPath);
    return cache ? Array.from(cache.modules.values()) : [];
  }

  async recompileScript(projectPath: string, scriptPath: string): Promise<boolean> {
    try {
      const result = await window.scriptAPI.compileScript(projectPath, scriptPath);
      if (result.success) {
        await this.pollForUpdates(projectPath); // Force cache update
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to recompile script:', error);
      return false;
    }
  }

  dispose(): void {
    // Stop watching all projects
    for (const projectPath of this.watchingProjects) {
      this.stopWatching(projectPath);
    }
    
    // Clear all caches
    this.scriptCaches.clear();
    
    // Don't dispose esbuild as it might be used elsewhere
  }
} 