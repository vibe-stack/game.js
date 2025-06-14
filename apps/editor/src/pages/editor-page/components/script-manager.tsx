import React, { useEffect, useRef, createContext, useContext } from "react";
import useEditorStore from "@/stores/editor-store";

interface ScriptManager {
  startWatching: () => Promise<void>;
  stopWatching: () => Promise<void>;
  getCompiledScript: (scriptPath: string) => Promise<string | null>;
  executeScript: (scriptPath: string, method: string, context: ScriptExecutionContext) => Promise<any>;
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

  const cleanupBlobUrls = () => {
    blobUrlsRef.current.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    blobUrlsRef.current.clear();
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
      compiledScriptsRef.current = new Map(Object.entries(compiled));
    } catch (error) {
      console.error("Failed to load compiled scripts:", error);
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

    get isWatching() {
      return isWatchingRef.current;
    }
  };

  // Start watching when project loads
  useEffect(() => {
    if (currentProject) {
      scriptManager.startWatching();
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