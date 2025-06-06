import { create } from 'zustand';
import { SceneRoute, SceneObject, ObjectCreateOptions } from '../types';

interface SceneStore {
  routes: SceneRoute[];
  currentRoute: string | null;
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  isLoadingRoutes: boolean;
  
  setRoutes: (routes: SceneRoute[]) => void;
  setCurrentRoute: (route: string | null) => void;
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
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  routes: [],
  currentRoute: null,
  sceneObjects: [],
  selectedObjectId: null,
  isLoadingRoutes: false,

  setRoutes: (routes) => set({ routes }),
  setCurrentRoute: (route) => set({ currentRoute: route }),
  setSceneObjects: (objects) => set({ sceneObjects: objects }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setIsLoadingRoutes: (loading) => set({ isLoadingRoutes: loading }),

  loadSceneRoutes: async (projectName: string) => {
    set({ isLoadingRoutes: true });
    try {
      // Get scene info from the project API
      const sceneInfo = await window.projectAPI.getSceneInfo(projectName, '/');
      
      if (sceneInfo && typeof sceneInfo === 'object' && 'routes' in sceneInfo) {
        const routes = sceneInfo.routes as SceneRoute[];
        set({ routes, isLoadingRoutes: false });
      } else {
        // Fallback to mock routes if no scene info available
        const mockRoutes: SceneRoute[] = [
          { path: '/', filePath: 'src/app/scene.ts', name: 'Main Scene' },
          { path: '/level1', filePath: 'src/app/level1/scene.ts', name: 'Level 1' },
          { path: '/level2', filePath: 'src/app/level2/scene.ts', name: 'Level 2' }
        ];
        set({ routes: mockRoutes, isLoadingRoutes: false });
      }
    } catch (error) {
      console.error("Failed to load scene routes:", error);
      set({ isLoadingRoutes: false });
    }
  },

  loadSceneObjects: async (scenePath: string) => {
    try {
      // Try to fetch .editor.json for this scene
      const editorJsonUrl = scenePath.replace('.ts', '.editor.json').replace('.js', '.editor.json');
      
      try {
        const response = await fetch(editorJsonUrl);
        if (response.ok) {
          const editorData = await response.json();
          
          // Convert editor data to scene objects
          const objects: SceneObject[] = [];
          
          if (editorData.objects) {
            Object.entries(editorData.objects).forEach(([key, obj]: [string, unknown]) => {
              const objectData = obj as Record<string, unknown>;
              objects.push({
                id: key,
                name: (objectData.name as string) || key,
                type: (objectData.type as string) || 'Mesh',
                visible: objectData.visible !== false,
                position: (objectData.position as [number, number, number]) || [0, 0, 0],
                rotation: (objectData.rotation as [number, number, number]) || [0, 0, 0],
                scale: (objectData.scale as [number, number, number]) || [1, 1, 1],
                material: (objectData.material as { color?: number; opacity?: number; transparent?: boolean }) || { color: 0xffffff, opacity: 1, transparent: false }
              });
            });
          }
          
          set({ sceneObjects: objects });
          return;
        }
      } catch {
        console.log('No .editor.json found, using mock data');
      }

      // Fallback to mock data
      const mockObjects: SceneObject[] = [
        {
          id: '1',
          name: 'Cube',
          type: 'Mesh',
          visible: true,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: { color: 0xff0000, opacity: 1, transparent: false }
        },
        {
          id: '2',
          name: 'Sphere',
          type: 'Mesh', 
          visible: true,
          position: [2, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: { color: 0x00ff00, opacity: 1, transparent: false }
        }
      ];
      set({ sceneObjects: mockObjects });
    } catch (error) {
      console.error("Failed to load scene objects:", error);
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
    
    // Send the update through WebSocket
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
    const { sceneObjects, currentRoute } = get();
    const updatedObjects = sceneObjects.map(obj => 
      obj.id === objectId ? { ...obj, ...updates } : obj
    );
    set({ sceneObjects: updatedObjects });

    // Send property updates through WebSocket
    if (currentRoute) {
      import('./editor-connection-store').then(({ useEditorConnectionStore }) => {
        const editorConnection = useEditorConnectionStore.getState();
        
        if (editorConnection.isConnected) {
          Object.entries(updates).forEach(([key, value]) => {
            editorConnection.sendPropertyUpdate(
              currentRoute,
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
    const { sceneObjects, currentRoute } = get();
    const filteredObjects = sceneObjects.filter(obj => obj.id !== objectId);
    set({ sceneObjects: filteredObjects });

    // Send remove update through WebSocket
    if (currentRoute) {
      import('./editor-connection-store').then(({ useEditorConnectionStore }) => {
        const editorConnection = useEditorConnectionStore.getState();
        
        if (editorConnection.isConnected) {
          editorConnection.sendPropertyUpdate(
            currentRoute,
            `objects.${objectId}`,
            null, // null means delete
            false
          );
        }
      });
    }
  },

  duplicateObject: (objectId: string) => {
    const { sceneObjects, currentRoute } = get();
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

      // Send the new object through WebSocket
      if (currentRoute) {
        import('./editor-connection-store').then(({ useEditorConnectionStore }) => {
          const editorConnection = useEditorConnectionStore.getState();
          
          if (editorConnection.isConnected) {
            editorConnection.sendPropertyUpdate(
              currentRoute,
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
      
      // Set up callbacks for receiving updates
      editorConnection.onPropertyUpdate((update) => {
        // Handle property updates from the game
        console.log('Received property update:', update);
        
        // Reload scene objects when we receive updates
        const { currentRoute, loadSceneObjects } = get();
        if (currentRoute) {
          loadSceneObjects(currentRoute);
        }
      });

      editorConnection.onSceneUpdate((data) => {
        // Handle scene reload events
        console.log('Received scene reload:', data);
        
        const { currentRoute, loadSceneObjects } = get();
        if (currentRoute) {
          loadSceneObjects(currentRoute);
        }
      });

      // Connect to the WebSocket
      editorConnection.connect(projectName);
    });
  }
})); 