import React, { useEffect, useRef, createContext, useContext } from "react";
import useEditorStore from "@/stores/editor-store";

interface ScriptManager {
  startWatching: () => Promise<void>;
  stopWatching: () => Promise<void>;
  getCompiledScript: (scriptPath: string) => Promise<string | null>;
  executeScript: (scriptPath: string, method: string, context: ScriptExecutionContext) => Promise<any>;
  refreshScript: (scriptPath: string) => Promise<boolean>;
  onScriptsChanged: (callback: () => void) => () => void; // Returns unsubscribe function
  isWatching: boolean;
}

interface ScriptExecutionContext {
  entity: GameObject;
  deltaTime: number;
  totalTime: number;
  scene: GameScene;
  // Transform update API for scripts
  updateTransform: (transform: Partial<Transform>) => void;
  // Physics control methods
  applyForce: (force: Vector3, point?: Vector3) => void;
  applyImpulse: (impulse: Vector3, point?: Vector3) => void;
  setVelocity: (velocity: Vector3) => void;
  setAngularVelocity: (angularVelocity: Vector3) => void;
  getVelocity: () => Vector3 | null;
  getAngularVelocity: () => Vector3 | null;
  // Add game engine APIs here later
}

interface ScriptManagerContextType {
  scriptManager: ScriptManager | null;
}

const ScriptManagerContext = createContext<ScriptManagerContextType>({
  scriptManager: null,
});

export const useScriptManager = () => {
  const context = useContext(ScriptManagerContext);
  if (!context.scriptManager) {
    throw new Error("useScriptManager must be used within a ScriptManagerProvider");
  }
  return context.scriptManager;
};

interface ScriptManagerProviderProps {
  children: React.ReactNode;
}

export function ScriptManagerProvider({ children }: ScriptManagerProviderProps) {
  const { currentProject } = useEditorStore();
  const isWatchingRef = useRef(false);
  const compiledScriptsRef = useRef<Map<string, string>>(new Map());
  const scriptModulesRef = useRef<Map<string, any>>(new Map());
  const blobUrlsRef = useRef<Map<string, string>>(new Map());
  const scriptsChangedCallbacksRef = useRef<Set<() => void>>(new Set());
  const lastCompilationTimesRef = useRef<Map<string, Date>>(new Map());

  const cleanupBlobUrls = () => {
    blobUrlsRef.current.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    blobUrlsRef.current.clear();
  };

  const notifyScriptsChanged = () => {
    scriptsChangedCallbacksRef.current.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in scripts changed callback:', error);
      }
    });
  };

  const setupImportMap = async () => {
    if (!currentProject) return;

    try {
      // Get import map from backend
      const importMap = await window.scriptAPI.getImportMap(currentProject.path);
      if (!importMap) {
        console.log('No import map available');
        return;
      }

      // Start asset server to serve vendor files
      // We need to make a dummy asset request to ensure the server is running
      try {
        await window.projectAPI.getAssets(currentProject.path);
      } catch (error) {
        console.warn('Failed to start asset server:', error);
      }

      // Get the asset server port directly
      const assetServerPort = await window.projectAPI.getAssetServerPort(currentProject.path);
      const assetServerUrl = `http://localhost:${assetServerPort}`;

      // Update import map URLs to use asset server
      const updatedImportMap = {
        imports: {} as Record<string, string>
      };

      for (const [moduleName, relativePath] of Object.entries(importMap.imports)) {
        // Convert relative paths to absolute asset server URLs
        if (typeof relativePath === 'string' && relativePath.startsWith('/.gamejs/')) {
          updatedImportMap.imports[moduleName] = `${assetServerUrl}${relativePath}`;
        } else if (typeof relativePath === 'string') {
          updatedImportMap.imports[moduleName] = relativePath;
        }
      }

      // Remove existing import map if present
      const existingImportMap = document.querySelector('script[type="importmap"]');
      if (existingImportMap) {
        existingImportMap.remove();
      }

      // Create import map script with inline content (now allowed by CSP)
      const importMapScript = document.createElement('script');
      importMapScript.type = 'importmap';
      importMapScript.textContent = JSON.stringify(updatedImportMap, null, 2);
      
      // Insert at the beginning of head to ensure it loads before any modules
      document.head.insertBefore(importMapScript, document.head.firstChild);

      console.log('Import map setup complete:', updatedImportMap);
    } catch (error) {
      console.error('Failed to setup import map:', error);
    }
  };

  const loadCompiledScripts = async () => {
    if (!currentProject) return;
    try {
      const compiled = await window.scriptAPI.getCompiledScripts(currentProject.path);
      
      const newScripts = new Map(Object.entries(compiled));
      const previousScripts = compiledScriptsRef.current;
      const previousCompilationTimes = lastCompilationTimesRef.current;
      let hasChanges = false;
      
      // Check for new or recompiled scripts
      for (const [scriptPath, compiledPath] of newScripts) {
        const previousCompiledPath = previousScripts.get(scriptPath);
        const isNewScript = !previousCompiledPath;
        
        if (isNewScript) {
          console.log(`New script detected: ${scriptPath}`);
          hasChanges = true;
        } else {
          // For existing scripts, check if they've been recompiled by comparing timestamps
          // We need to get individual script compilation times, but for now we can use file modification time
          try {
            const stat = await window.projectAPI.getFileStats(compiledPath);
            const compiledFileTime = new Date(stat.modified);
            const previousTime = previousCompilationTimes.get(scriptPath);
            
            if (!previousTime || compiledFileTime > previousTime) {
              console.log(`Script recompiled, clearing cache: ${scriptPath}`);
              scriptModulesRef.current.delete(scriptPath);
              hasChanges = true;
              
              // Clean up old blob URL
              const oldBlobUrl = blobUrlsRef.current.get(scriptPath);
              if (oldBlobUrl) {
                URL.revokeObjectURL(oldBlobUrl);
                blobUrlsRef.current.delete(scriptPath);
              }
              
              // Update the compilation time
              lastCompilationTimesRef.current.set(scriptPath, compiledFileTime);
            }
          } catch (error) {
            console.warn(`Failed to check compilation time for ${scriptPath}:`, error);
            // If we can't check the time, assume it changed to be safe
            scriptModulesRef.current.delete(scriptPath);
            hasChanges = true;
          }
        }
      }
      
      // Check for removed scripts
      for (const [scriptPath] of previousScripts) {
        if (!newScripts.has(scriptPath)) {
          console.log(`Script removed: ${scriptPath}`);
          scriptModulesRef.current.delete(scriptPath);
          lastCompilationTimesRef.current.delete(scriptPath);
          
          // Clean up blob URL
          const oldBlobUrl = blobUrlsRef.current.get(scriptPath);
          if (oldBlobUrl) {
            URL.revokeObjectURL(oldBlobUrl);
            blobUrlsRef.current.delete(scriptPath);
          }
          
          hasChanges = true;
        }
      }
      
      // Initialize compilation times for new scripts
      for (const [scriptPath, compiledPath] of newScripts) {
        if (!lastCompilationTimesRef.current.has(scriptPath)) {
          try {
            const stat = await window.projectAPI.getFileStats(compiledPath);
            lastCompilationTimesRef.current.set(scriptPath, new Date(stat.modified));
          } catch (error) {
            console.warn(`Failed to get initial compilation time for ${scriptPath}:`, error);
            lastCompilationTimesRef.current.set(scriptPath, new Date());
          }
        }
      }
      
      compiledScriptsRef.current = newScripts;
      
      // Notify UI components about script changes
      if (hasChanges) {
        notifyScriptsChanged();
      }
    } catch (error) {
      console.error("Failed to load compiled scripts:", error);
    }
  };

  const refreshScript = async (scriptPath: string): Promise<boolean> => {
    if (!currentProject) return false;
    
    try {
      // Force recompilation of specific script
      const result = await window.scriptAPI.compileScript(currentProject.path, scriptPath);
      if (result.success) {
        console.log(`Script manually recompiled: ${scriptPath}`);
        
        // Clear module cache for this script
        scriptModulesRef.current.delete(scriptPath);
        
        // Clean up old blob URL
        const oldBlobUrl = blobUrlsRef.current.get(scriptPath);
        if (oldBlobUrl) {
          URL.revokeObjectURL(oldBlobUrl);
          blobUrlsRef.current.delete(scriptPath);
        }
        
        // Reload compiled scripts to get latest version
        await loadCompiledScripts();
        
        return true;
      } else {
        console.error(`Script compilation failed: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error("Failed to refresh script:", error);
      return false;
    }
  };

  const scriptManager: ScriptManager = {
    startWatching: async () => {
      if (!currentProject || isWatchingRef.current) return;
      try {
        const success = await window.scriptAPI.startWatching(currentProject.path);
        if (success) {
          isWatchingRef.current = true;
          console.log(`Started watching scripts for project: ${currentProject.name}`);
          
          // Setup import map FIRST, before loading any scripts
          await setupImportMap();
          
          // Then load initial compiled scripts
          await loadCompiledScripts();
        }
      } catch (error) {
        console.error("Failed to start script watching:", error);
      }
    },

    stopWatching: async () => {
      if (!currentProject || !isWatchingRef.current) return;
      try {
        await window.scriptAPI.stopWatching(currentProject.path);
        isWatchingRef.current = false;
        compiledScriptsRef.current.clear();
        scriptModulesRef.current.clear();
        lastCompilationTimesRef.current.clear();
        cleanupBlobUrls();
        console.log(`Stopped watching scripts for project: ${currentProject.name}`);
      } catch (error) {
        console.error("Failed to stop script watching:", error);
      }
    },

    getCompiledScript: async (scriptPath: string) => {
      const compiledPath = compiledScriptsRef.current.get(scriptPath);
      if (!compiledPath) return null;
      try {
        const content = await window.projectAPI.readFile(compiledPath);
        return content;
      } catch (error) {
        console.error(`Failed to read compiled script ${scriptPath}:`, error);
        return null;
      }
    },

    executeScript: async (scriptPath: string, method: string, context: ScriptExecutionContext) => {
      try {
        let scriptModule = scriptModulesRef.current.get(scriptPath);
        
        if (!scriptModule) {
          const scriptContent = await scriptManager.getCompiledScript(scriptPath);
          if (!scriptContent) {
            console.warn(`Could not load content for script: ${scriptPath}`);
            return;
          }

          const blob = new Blob([scriptContent], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);

          const existingBlobUrl = blobUrlsRef.current.get(scriptPath);
          if (existingBlobUrl) {
            URL.revokeObjectURL(existingBlobUrl);
          }
          blobUrlsRef.current.set(scriptPath, blobUrl);

          // The /* @vite-ignore */ is crucial here
          scriptModule = await import(/* @vite-ignore */ blobUrl);
          scriptModulesRef.current.set(scriptPath, scriptModule);
        }

        if (scriptModule && typeof scriptModule[method] === 'function') {
          return await scriptModule[method](context);
        } else if (method === 'init' && scriptModule.default && typeof scriptModule.default === 'function') {
          // Fallback: if no specific method found and this is init, try default export
          return await scriptModule.default(context);
        } else {
          console.warn(`Method '${method}' not found in script ${scriptPath}`);
        }
      } catch (error) {
        console.error(`Failed to execute script ${scriptPath}.${method}:`, error);
        throw error;
      }
    },

    refreshScript: refreshScript,

    onScriptsChanged: (callback: () => void) => {
      scriptsChangedCallbacksRef.current.add(callback);
      return () => {
        scriptsChangedCallbacksRef.current.delete(callback);
      };
    },

    get isWatching() {
      return isWatchingRef.current;
    }
  };

  // Start watching when project loads
  useEffect(() => {
    if (currentProject) {
      scriptManager.startWatching();
      
      // Set up polling to detect script changes and invalidate cache
      const interval = setInterval(async () => {
        if (scriptManager.isWatching) {
          await loadCompiledScripts(); // This will automatically invalidate changed scripts
        }
      }, 2000); // Check every 2 seconds
      
      return () => {
        clearInterval(interval);
        if (currentProject) {
          scriptManager.stopWatching();
        }
      };
    }

    return () => {
      if (currentProject) {
        scriptManager.stopWatching();
      }
    };
  }, [currentProject?.path]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupBlobUrls();
    };
  }, []);

  return (
    <ScriptManagerContext.Provider value={{ scriptManager }}>
      {children}
    </ScriptManagerContext.Provider>
  );
} 