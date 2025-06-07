import { create } from 'zustand';
import { SceneRoute, SceneObject, ObjectCreateOptions } from '../types';

interface SceneStore {
  routes: SceneRoute[];
  currentRoute: string | null;
  currentFilePath: string | null;
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  isLoadingRoutes: boolean;
  
  setRoutes: (routes: SceneRoute[]) => void;
  setCurrentRoute: (route: string | null, filePath?: string | null) => void;
  setSceneObjects: (objects: SceneObject[]) => void;
  setSelectedObjectId: (id: string | null) => void;
  setIsLoadingRoutes: (loading: boolean) => void;
  loadSceneRoutes: (projectName: string) => Promise<void>;
  loadSceneObjects: (scenePath: string) => Promise<void>;
  addObject: (scenePath: string, objectOptions: ObjectCreateOptions) => Promise<void>;
  updateObject: (objectId: string, updates: Partial<SceneObject>) => void;
  removeObject: (objectId: string) => void;
  duplicateObject: (objectId: string) => void;
  setupEditorConnection: (projectName: string) => void;
  requestSceneState: () => Promise<void>;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  routes: [],
  currentRoute: null,
  currentFilePath: null,
  sceneObjects: [],
  selectedObjectId: null,
  isLoadingRoutes: false,

  setRoutes: (routes) => set({ routes }),
  setCurrentRoute: (route, filePath = null) => set({ currentRoute: route, currentFilePath: filePath }),
  setSceneObjects: (objects) => set({ sceneObjects: objects }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setIsLoadingRoutes: (loading) => set({ isLoadingRoutes: loading }),

  loadSceneRoutes: async (projectName: string) => {
    set({ isLoadingRoutes: true });
    try {
      const sceneInfo = await window.projectAPI.getSceneInfo(projectName);
      
      if (sceneInfo && typeof sceneInfo === 'object' && 'routes' in sceneInfo) {
        const routes = sceneInfo.routes as SceneRoute[];
        set({ routes, isLoadingRoutes: false });
      } else {
        console.warn('No scene routes found for project:', projectName);
        set({ routes: [], isLoadingRoutes: false });
      }
    } catch (error) {
      console.error("Failed to load scene routes:", error);
      set({ routes: [], isLoadingRoutes: false });
    }
  },

  loadSceneObjects: async (scenePath: string) => {
    try {
      const { useDevServerStore } = await import('./dev-server-store');
      const serverInfo = useDevServerStore.getState().serverInfo;
      
      if (!serverInfo?.url) {
        console.warn('Dev server not running, cannot load scene objects');
        set({ sceneObjects: [] });
        return;
      }

      // Get project name from URL search params
      const projectName = new URLSearchParams(window.location.search).get('project') || 'current-project';

      // Ensure WebSocket connection is established first
      const { useEditorConnectionStore } = await import('./editor-connection-store');
      const editorConnection = useEditorConnectionStore.getState();
      
      try {
        if (!editorConnection.isConnected) {
          console.log('WebSocket not connected, establishing connection...');
          editorConnection.connect(projectName);
          
          // Wait a bit for connection to establish
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // First priority: Request live scene state from running game
        if (editorConnection.isConnected) {
          console.log('Requesting live scene state from running game...');
          await get().requestSceneState();
          
          // Give the game a moment to respond
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if we got scene objects from the live game
          const currentObjects = get().sceneObjects;
          if (currentObjects.length > 0) {
            console.log('Successfully loaded scene objects from running game:', currentObjects);
            return;
          }
        }
      } catch (wsError) {
        console.warn('WebSocket connection failed, falling back to file loading:', wsError);
      }

      // Fallback: Try to fetch .editor.json from dev server
      // The scenePath is relative to src directory, so we need to prepend src/
      const editorJsonUrl = `${serverInfo.url}/src/${scenePath.replace(/\.(ts|js)$/, '.editor.json')}`;
      
      try {
        console.log('Fetching editor data from:', editorJsonUrl);
        const response = await fetch(editorJsonUrl);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const editorData = await response.json();
            console.log('Loaded editor data from dev server:', editorData);
            
            // Convert registered objects from editor data to scene objects
            const objects: SceneObject[] = [];
            
            if (editorData.objects) {
              Object.entries(editorData.objects).forEach(([key, obj]: [string, unknown]) => {
                const objectData = obj as Record<string, unknown>;
                objects.push({
                  id: key,
                  name: (objectData.name as string) || key,
                  type: (objectData.type as string) || 'Object3D',
                  visible: objectData.visible !== false,
                  position: (objectData.position as [number, number, number]) || [0, 0, 0],
                  rotation: (objectData.rotation as [number, number, number]) || [0, 0, 0],
                  scale: (objectData.scale as [number, number, number]) || [1, 1, 1],
                  material: (objectData.material as { color?: number; opacity?: number; transparent?: boolean }) || undefined
                });
              });
            }
            
            set({ sceneObjects: objects });
            console.log('Successfully loaded scene objects from .editor.json:', objects);
            return;
          } else {
            console.warn('Server returned non-JSON content type:', contentType);
          }
        } else {
          console.log('Editor JSON file not found (HTTP ' + response.status + '), this is normal for new scenes');
        }
      } catch (fetchError) {
        console.log('Could not fetch .editor.json from dev server:', fetchError);
      }

      // If all else fails, set empty array and log debugging info
      console.log('No scene objects found. Debugging info:');
      console.log('- Server URL:', serverInfo.url);
      console.log('- Scene Path:', scenePath);
      console.log('- Project Name:', projectName);
      console.log('- WebSocket Connected:', editorConnection.isConnected);
      console.log('- Connection Status:', editorConnection.connectionStatus);
      
      set({ sceneObjects: [] });
    } catch (error) {
      console.error("Failed to load scene objects:", error);
      set({ sceneObjects: [] });
    }
  },

  requestSceneState: async () => {
    try {
      const { useEditorConnectionStore } = await import('./editor-connection-store');
      const editorConnection = useEditorConnectionStore.getState();
      
      if (editorConnection.isConnected && editorConnection.ws) {
        // Request current scene state from the running game
        const requestMessage = {
          type: 'request-scene-state',
          timestamp: Date.now()
        };
        
        editorConnection.ws.send(JSON.stringify(requestMessage));
        console.log('Sent scene state request to running game:', requestMessage);
        
        // Also try via Vite WebSocket if available
        if (typeof window !== 'undefined' && (window as Window & { __vite_ws?: WebSocket }).__vite_ws) {
          const viteMessage = {
            type: 'custom',
            event: 'request-scene-state',
            data: { timestamp: Date.now() }
          };
          
          (window as Window & { __vite_ws?: WebSocket }).__vite_ws!.send(JSON.stringify(viteMessage));
          console.log('Sent scene state request via Vite WebSocket:', viteMessage);
        }
      } else {
        console.warn('Cannot request scene state: WebSocket not connected');
      }
    } catch (error) {
      console.error('Failed to request scene state:', error);
    }
  },

  addObject: async (scenePath: string, objectOptions: ObjectCreateOptions) => {
    const { sceneObjects } = get();
    
    const newObject: SceneObject = {
      id: Date.now().toString(),
      name: `${objectOptions.geometry.type.replace('Geometry', '')} ${sceneObjects.length + 1}`,
      type: objectOptions.type,
      visible: true,
      position: objectOptions.position || [0, 0, 0],
      rotation: objectOptions.rotation || [0, 0, 0],
      scale: objectOptions.scale || [1, 1, 1],
      material: {
        color: objectOptions.material.color || 0xffffff,
        opacity: objectOptions.material.opacity || 1,
        transparent: objectOptions.material.transparent || false
      }
    };

    set({ sceneObjects: [...sceneObjects, newObject] });
    
    // Send the update through WebSocket to the running game
    const { useEditorConnectionStore } = await import('./editor-connection-store');
    const editorConnection = useEditorConnectionStore.getState();
    
    if (editorConnection.isConnected) {
      editorConnection.sendPropertyUpdate(
        scenePath,
        `objects.${newObject.id}`,
        {
          name: newObject.name,
          type: newObject.type,
          visible: newObject.visible,
          position: newObject.position,
          rotation: newObject.rotation,
          scale: newObject.scale,
          material: newObject.material
        },
        false
      );
    }
  },

  updateObject: (objectId: string, updates: Partial<SceneObject>) => {
    const { sceneObjects, currentFilePath } = get();
    const updatedObjects = sceneObjects.map(obj => 
      obj.id === objectId ? { ...obj, ...updates } : obj
    );
    set({ sceneObjects: updatedObjects });

    // Send property updates through WebSocket to the running game
    if (currentFilePath) {
      import('./editor-connection-store').then(({ useEditorConnectionStore }) => {
        const editorConnection = useEditorConnectionStore.getState();
        
        if (editorConnection.isConnected) {
          Object.entries(updates).forEach(([key, value]) => {
            editorConnection.sendPropertyUpdate(
              currentFilePath,
              `objects.${objectId}.${key}`,
              value,
              false
            );
          });
        }
      });
    }
  },

  removeObject: (objectId: string) => {
    const { sceneObjects, currentFilePath } = get();
    const filteredObjects = sceneObjects.filter(obj => obj.id !== objectId);
    set({ sceneObjects: filteredObjects });

    // Send remove update through WebSocket to the running game
    if (currentFilePath) {
      import('./editor-connection-store').then(({ useEditorConnectionStore }) => {
        const editorConnection = useEditorConnectionStore.getState();
        
        if (editorConnection.isConnected) {
          editorConnection.sendPropertyUpdate(
            currentFilePath,
            `objects.${objectId}`,
            null, // null means delete
            false
          );
        }
      });
    }
  },

  duplicateObject: (objectId: string) => {
    const { sceneObjects, currentFilePath } = get();
    const originalObject = sceneObjects.find(obj => obj.id === objectId);
    
    if (originalObject) {
      const duplicatedObject: SceneObject = {
        ...originalObject,
        id: Date.now().toString(),
        name: `${originalObject.name} Copy`,
        position: [
          originalObject.position[0] + 1,
          originalObject.position[1],
          originalObject.position[2]
        ]
      };
      
      set({ sceneObjects: [...sceneObjects, duplicatedObject] });

      // Send the new object through WebSocket to the running game
      if (currentFilePath) {
        import('./editor-connection-store').then(({ useEditorConnectionStore }) => {
          const editorConnection = useEditorConnectionStore.getState();
          
          if (editorConnection.isConnected) {
            editorConnection.sendPropertyUpdate(
              currentFilePath,
              `objects.${duplicatedObject.id}`,
              {
                name: duplicatedObject.name,
                type: duplicatedObject.type,
                visible: duplicatedObject.visible,
                position: duplicatedObject.position,
                rotation: duplicatedObject.rotation,
                scale: duplicatedObject.scale,
                material: duplicatedObject.material
              },
              false
            );
          }
        });
      }
    }
  },

  setupEditorConnection: (projectName: string) => {
    import('./editor-connection-store').then(({ useEditorConnectionStore }) => {
      const editorConnection = useEditorConnectionStore.getState();
      
      // Set up callbacks for receiving updates from the running game
      editorConnection.onPropertyUpdate((update) => {
        console.log('Received property update from game:', update);
        // Don't reload scene objects here to avoid infinite loops
        // The game will send updated scene state via onSceneUpdate if needed
      });

      editorConnection.onSceneUpdate((data) => {
        console.log('Received scene update from game:', data);
        
        // Handle scene state responses specifically
        if (data.type === 'scene-state-response' && 'editorState' in data && data.editorState) {
          const editorState = data.editorState as { properties?: unknown; objects?: Record<string, unknown>; overrides?: unknown };
          console.log('Processing scene state from running game:', editorState);
          
          // Convert the running game's registered objects to our scene objects format
          if (editorState.objects) {
            const objects: SceneObject[] = [];
            
            Object.entries(editorState.objects).forEach(([key, obj]) => {
              const objectData = obj as Record<string, unknown>;
              objects.push({
                id: key,
                name: (objectData.name as string) || key,
                type: (objectData.type as string) || 'Object3D',
                visible: objectData.visible !== false,
                position: (objectData.position as [number, number, number]) || [0, 0, 0],
                rotation: (objectData.rotation as [number, number, number]) || [0, 0, 0],
                scale: (objectData.scale as [number, number, number]) || [1, 1, 1],
                material: objectData.material as { color?: number; opacity?: number; transparent?: boolean } | undefined
              });
            });
            
            console.log('Successfully parsed scene objects from running game:', objects);
            set({ sceneObjects: objects });
            return;
          }
        }
        
        // For other update types, just log them - don't reload to avoid loops
        console.log('Received other scene update type:', data.type || 'unknown');
      });

      // Connect to the Vite plugin's WebSocket server
      console.log('Setting up editor connection for project:', projectName);
      editorConnection.connect(projectName);
    });
  }
})); 