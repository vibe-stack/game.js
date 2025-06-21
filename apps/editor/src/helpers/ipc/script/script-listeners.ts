import { ipcMain } from "electron";
import { 
  SCRIPT_START_WATCHING_CHANNEL,
  SCRIPT_STOP_WATCHING_CHANNEL,
  SCRIPT_COMPILE_CHANNEL,
  SCRIPT_GET_COMPILED_SCRIPTS_CHANNEL,
  SCRIPT_COMPILATION_STATUS_CHANNEL,
  SCRIPT_GET_IMPORT_MAP_CHANNEL
} from "./script-channels";
import * as fs from "fs";
import * as path from "path";
import fg from "fast-glob";
import { build, BuildOptions } from "esbuild";

interface ScriptWatcher {
  projectPath: string;
  timer: NodeJS.Timeout | null;
  compiledScripts: Map<string, string>; // scriptPath -> compiled output path
  lastCompilation: Map<string, Date>;
  lastSeen: Map<string, number>; // file -> mtime timestamp
  vendorBundle?: string; // path to shared vendor bundle
  vendorBundleTime?: Date;
}

class ScriptCompilationManager {
  public watchers = new Map<string, ScriptWatcher>();
  private readonly POLL_INTERVAL = 1000; // 1 second polling

  async startWatching(projectPath: string): Promise<boolean> {
    try {
      // Stop existing watcher if present
      if (this.watchers.has(projectPath)) {
        await this.stopWatching(projectPath);
      }

      const scriptsDir = path.join(projectPath, "scripts");
      
      // Check if scripts directory exists
      if (!fs.existsSync(scriptsDir)) {
        // Create scripts directory if it doesn't exist
        await fs.promises.mkdir(scriptsDir, { recursive: true });
      }

      // Create compiled scripts output directory
      const compiledDir = path.join(projectPath, ".gamejs", "scripts", "compiled-scripts");
      await fs.promises.mkdir(compiledDir, { recursive: true });

      // Initialize watcher
      const scriptWatcher: ScriptWatcher = {
        projectPath,
        timer: null,
        compiledScripts: new Map(),
        lastCompilation: new Map(),
        lastSeen: new Map()
      };

      this.watchers.set(projectPath, scriptWatcher);

      // Create vendor bundle first
      await this.createVendorBundle(projectPath);

      // Do initial scan
      await this.scanForChanges(projectPath);

      // Start polling
      scriptWatcher.timer = setInterval(() => {
        this.scanForChanges(projectPath).catch(error => {
          console.error(`Script scanning error for ${projectPath}:`, error);
        });
      }, this.POLL_INTERVAL);

      return true;
    } catch (error) {
      console.error(`Failed to start script watching for ${projectPath}:`, error);
      return false;
    }
  }

  async stopWatching(projectPath: string): Promise<boolean> {
    try {
      const scriptWatcher = this.watchers.get(projectPath);
      if (scriptWatcher) {
        if (scriptWatcher.timer) {
          clearInterval(scriptWatcher.timer);
          scriptWatcher.timer = null;
        }
        this.watchers.delete(projectPath);
      }
      return true;
    } catch (error) {
      console.error(`Failed to stop script watching for ${projectPath}:`, error);
      return false;
    }
  }

  private async createVendorBundle(projectPath: string): Promise<void> {
    try {
      const scriptWatcher = this.watchers.get(projectPath);
      if (!scriptWatcher) return;

      const packageJsonPath = path.join(projectPath, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        console.log(`No package.json found for ${projectPath}, skipping vendor setup`);
        return;
      }

      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, "utf-8"));
      const allDependencies = [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {})
      ];
      
      // Filter out @types/* packages - they're just TypeScript types, not runtime code
      const dependencies = allDependencies.filter(dep => !dep.startsWith('@types/'));
      
      if (dependencies.length === 0) {
        console.log(`No runtime dependencies found for ${projectPath}, skipping vendor setup`);
        return;
      }

      const vendorDir = path.join(projectPath, ".gamejs", "scripts", "vendor");
      await fs.promises.mkdir(vendorDir, { recursive: true });
      
      const vendorBundlePath = path.join(vendorDir, "vendor.js");
      const importMapPath = path.join(vendorDir, "importmap.json");
      
      // Check if vendor bundle needs updating
      let needsUpdate = true;
      if (fs.existsSync(vendorBundlePath)) {
        const bundleStat = await fs.promises.stat(vendorBundlePath);
        const packageStat = await fs.promises.stat(packageJsonPath);
        needsUpdate = packageStat.mtime > bundleStat.mtime;
      }

      if (!needsUpdate && scriptWatcher.vendorBundle) {
        return;
      }

      // Create vendor bundle - bundle all dependencies into one file
      const tempVendorEntry = path.join(vendorDir, "vendor-entry.js");
      const vendorExports = dependencies.map(dep => 
        `export * as ${dep.replace(/[^a-zA-Z0-9_$]/g, '_')} from '${dep}';`
      ).join('\n');
      
      await fs.promises.writeFile(tempVendorEntry, vendorExports);

      // Build vendor bundle
      const buildOptions: BuildOptions = {
        entryPoints: [tempVendorEntry],
        outfile: vendorBundlePath,
        format: "esm",
        target: "es2020",
        bundle: true,
        platform: "browser",
        minify: false,
        treeShaking: true,
        resolveExtensions: [".ts", ".js"],
        define: {
          "process.env.NODE_ENV": '"development"'
        },
        sourcemap: true
      };

      await build(buildOptions);
      await fs.promises.unlink(tempVendorEntry);

      // Create import map with correct format
      const importMap = {
        imports: {} as Record<string, string>
      };

      // We need to use the asset server to serve vendor files
      // The asset server will be started when assets are loaded
      // For now, we'll use a predictable URL structure that the asset server provides
      
      // Map each dependency to the vendor bundle - but we need a different approach
      // Import maps can't directly map to named exports in a bundle
      // We need to create individual proxy modules for each dependency
      dependencies.forEach(dep => {
        const proxyFileName = `${dep.replace(/[^a-zA-Z0-9_-]/g, '_')}.js`;
        // Use absolute path from project root that will be served by asset server
        importMap.imports[dep] = `/.gamejs/scripts/vendor/${proxyFileName}`;
      });

      // Create proxy modules for each dependency
      for (const dep of dependencies) {
        const safeName = dep.replace(/[^a-zA-Z0-9_$]/g, '_');
        const proxyPath = path.join(vendorDir, `${dep.replace(/[^a-zA-Z0-9_-]/g, '_')}.js`);
        const relativePath = path.relative(path.dirname(proxyPath), vendorBundlePath).replace(/\\/g, '/');
        // Ensure relative path starts with './' for proper ES module resolution
        const importPath = relativePath.startsWith('./') || relativePath.startsWith('../') ? relativePath : `./${relativePath}`;
        const proxyContent = `
// Proxy module for ${dep}
import { ${safeName} } from '${importPath}';
export * from '${importPath}';
export default ${safeName};
        `.trim();
        
        await fs.promises.writeFile(proxyPath, proxyContent);
      }

      await fs.promises.writeFile(importMapPath, JSON.stringify(importMap, null, 2));

      // Also create a copy in the compiled scripts directory for easier access
      const compiledScriptsDir = path.join(projectPath, ".gamejs", "scripts", "compiled-scripts");
      const publicImportMapPath = path.join(compiledScriptsDir, "importmap.json");
      await fs.promises.writeFile(publicImportMapPath, JSON.stringify(importMap, null, 2));

      scriptWatcher.vendorBundle = vendorBundlePath;
      scriptWatcher.vendorBundleTime = new Date();

      console.log(`Created vendor bundle for ${projectPath} with import map for: ${dependencies.join(', ')}`);
    } catch (error) {
      console.error(`Failed to create vendor bundle for ${projectPath}:`, error);
    }
  }

  private async scanForChanges(projectPath: string): Promise<void> {
    const scriptWatcher = this.watchers.get(projectPath);
    if (!scriptWatcher) return;

    try {
      // Check if vendor bundle needs updating first
      await this.createVendorBundle(projectPath);

      const scriptsDir = path.join(projectPath, "scripts");
      
      // Find all TypeScript files
      const files = await fg("**/*.ts", {
        cwd: scriptsDir,
        absolute: false,
        dot: false,
        onlyFiles: true
      });

      const currentFiles = new Set(files);
      const previousFiles = new Set(scriptWatcher.lastSeen.keys());

      // Check for new or modified files
      for (const file of files) {
        const fullPath = path.join(scriptsDir, file);
        
        try {
          const stat = await fs.promises.stat(fullPath);
          const mtime = stat.mtimeMs;
          const lastMtime = scriptWatcher.lastSeen.get(file);

          if (!lastMtime || mtime > lastMtime) {
            scriptWatcher.lastSeen.set(file, mtime);
            await this.compileScript(projectPath, file);
          }
        } catch (error) {
          console.error(`Failed to stat file ${file}:`, error);
        }
      }

      // Check for removed files
      for (const file of previousFiles) {
        if (!currentFiles.has(file)) {
          scriptWatcher.lastSeen.delete(file);
          await this.removeCompiledScript(projectPath, file);
        }
      }
    } catch (error) {
      console.error(`Failed to scan for changes in ${projectPath}:`, error);
    }
  }

  private async compileScript(projectPath: string, relativePath: string): Promise<void> {
    try {
      const scriptWatcher = this.watchers.get(projectPath);
      if (!scriptWatcher) return;

      const inputPath = path.join(projectPath, "scripts", relativePath);
      const outputDir = path.join(projectPath, ".gamejs", "scripts", "compiled-scripts");
      const outputPath = path.join(outputDir, relativePath.replace(/\.ts$/, ".js"));
      
      // Ensure output directory exists
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

      // Check if we need to compile (based on file modification time)
      const inputStat = await fs.promises.stat(inputPath);
      const lastCompiled = scriptWatcher.lastCompilation.get(relativePath);
      
      if (lastCompiled && inputStat.mtime <= lastCompiled) {
        return; // Skip compilation if file hasn't changed
      }

      // Get list of npm dependencies to mark as external
      const packageJsonPath = path.join(projectPath, "package.json");
      let externalDependencies: string[] = [];
      
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, "utf-8"));
          externalDependencies = [
            ...Object.keys(packageJson.dependencies || {}),
            ...Object.keys(packageJson.devDependencies || {})
          ];
        } catch (error) {
          console.warn(`Failed to read package.json for externals: ${error}`);
        }
      }

      // Build configuration with external dependencies
      const buildOptions: BuildOptions = {
        entryPoints: [inputPath],
        outfile: outputPath,
        format: "esm",
        target: "es2020",
        bundle: true,
        platform: "neutral",
        // Mark npm packages as external instead of bundling them
        external: externalDependencies,
        loader: { ".ts": "ts" },
        sourcemap: true,
        minify: false,
        treeShaking: true,
        resolveExtensions: [".ts", ".js"],
        tsconfig: path.join(projectPath, "tsconfig.json"),
        define: {
          "process.env.NODE_ENV": '"development"'
        },
        // Add banner to provide common game APIs and import map for externals
        banner: {
          js: this.generateScriptBanner()
        },
        // Handle unresolved externals gracefully
        plugins: [
          {
            name: 'external-fallback',
            setup(build) {
              build.onResolve({ filter: /.*/ }, (args) => {
                // If it's in our external list but can't be resolved, 
                // let esbuild handle it as external
                if (externalDependencies.includes(args.path)) {
                  return { path: args.path, external: true };
                }
                return null;
              });
            },
          },
        ]
      };

      await build(buildOptions);

      // Update compilation tracking
      scriptWatcher.compiledScripts.set(relativePath, outputPath);
      scriptWatcher.lastCompilation.set(relativePath, new Date());

    } catch (error) {
      console.error(`Failed to compile script ${relativePath}:`, error);
    }
  }

  private generateScriptBanner(): string {
    // Import map needs to be handled by the execution environment, not injected here
    return `
// Game Engine APIs - Available in all scripts
const GameEngine = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};
    `.trim();
  }

  private async removeCompiledScript(projectPath: string, relativePath: string): Promise<void> {
    try {
      const scriptWatcher = this.watchers.get(projectPath);
      if (!scriptWatcher) return;

      const outputPath = scriptWatcher.compiledScripts.get(relativePath);
      if (outputPath && fs.existsSync(outputPath)) {
        await fs.promises.unlink(outputPath);
        
        // Also remove source map if exists
        const sourceMapPath = outputPath + ".map";
        if (fs.existsSync(sourceMapPath)) {
          await fs.promises.unlink(sourceMapPath);
        }
      }

      scriptWatcher.compiledScripts.delete(relativePath);
      scriptWatcher.lastCompilation.delete(relativePath);

      console.log(`Removed compiled script: ${relativePath}`);
    } catch (error) {
      console.error(`Failed to remove compiled script ${relativePath}:`, error);
    }
  }

  async compileSpecificScript(projectPath: string, scriptPath: string): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      await this.compileScript(projectPath, scriptPath);
      const scriptWatcher = this.watchers.get(projectPath);
      const outputPath = scriptWatcher?.compiledScripts.get(scriptPath);
      
      return {
        success: true,
        outputPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getCompiledScripts(projectPath: string): Record<string, string> {
    const scriptWatcher = this.watchers.get(projectPath);
    if (!scriptWatcher) return {};
    
    return Object.fromEntries(scriptWatcher.compiledScripts);
  }

  getCompilationStatus(projectPath: string): { 
    isWatching: boolean; 
    compiledCount: number; 
    lastCompilation?: Date;
    vendorBundle?: string;
  } {
    const scriptWatcher = this.watchers.get(projectPath);
    if (!scriptWatcher) {
      return { isWatching: false, compiledCount: 0 };
    }

    const lastCompilationTimes = Array.from(scriptWatcher.lastCompilation.values());
    const lastCompilation = lastCompilationTimes.length > 0 
      ? new Date(Math.max(...lastCompilationTimes.map(d => d.getTime()))) 
      : undefined;

    return {
      isWatching: true,
      compiledCount: scriptWatcher.compiledScripts.size,
      lastCompilation,
      vendorBundle: scriptWatcher.vendorBundle
    };
  }

  async getImportMap(projectPath: string): Promise<Record<string, any> | null> {
    const scriptWatcher = this.watchers.get(projectPath);
    if (!scriptWatcher?.vendorBundle) return null;

    const vendorDir = path.dirname(scriptWatcher.vendorBundle);
    const importMapPath = path.join(vendorDir, "importmap.json");
    
    try {
      if (fs.existsSync(importMapPath)) {
        const importMapContent = await fs.promises.readFile(importMapPath, 'utf-8');
        return JSON.parse(importMapContent);
      }
    } catch (error) {
      console.error(`Failed to read import map for ${projectPath}:`, error);
    }
    
    return null;
  }
}

const scriptManager = new ScriptCompilationManager();

export function addScriptEventListeners() {
  ipcMain.handle(SCRIPT_START_WATCHING_CHANNEL, async (_, projectPath: string) => {
    return await scriptManager.startWatching(projectPath);
  });

  ipcMain.handle(SCRIPT_STOP_WATCHING_CHANNEL, async (_, projectPath: string) => {
    return await scriptManager.stopWatching(projectPath);
  });

  ipcMain.handle(SCRIPT_COMPILE_CHANNEL, async (_, projectPath: string, scriptPath: string) => {
    return await scriptManager.compileSpecificScript(projectPath, scriptPath);
  });

  ipcMain.handle(SCRIPT_GET_COMPILED_SCRIPTS_CHANNEL, async (_, projectPath: string) => {
    return scriptManager.getCompiledScripts(projectPath);
  });

  ipcMain.handle(SCRIPT_COMPILATION_STATUS_CHANNEL, async (_, projectPath: string) => {
    return scriptManager.getCompilationStatus(projectPath);
  });

  ipcMain.handle(SCRIPT_GET_IMPORT_MAP_CHANNEL, async (_, projectPath: string) => {
    return await scriptManager.getImportMap(projectPath);
  });
}

// Clean up watchers on app exit
process.on('exit', () => {
  for (const [projectPath] of scriptManager.watchers) {
    scriptManager.stopWatching(projectPath);
  }
}); 