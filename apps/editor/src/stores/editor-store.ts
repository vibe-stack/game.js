import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface EditorState {
  // Project State
  currentProject: GameProject | null;
  projects: GameProject[];
  
  // Scene State
  currentScene: GameScene | null;
  selectedObjects: string[];
  
  // Editor UI State
  editorMode: 'select' | 'move' | 'rotate' | 'scale';
  viewportCamera: {
    position: Vector3;
    rotation: Vector3;
    target: Vector3;
  };
  
  // Physics State
  physicsState: 'stopped' | 'playing' | 'paused';
  physicsCallbacks: {
    play?: () => void;
    pause?: () => void;
    stop?: () => void;
    resume?: () => void;
  };
  
  // Actions
  setCurrentProject: (project: GameProject | null) => void;
  setProjects: (projects: GameProject[]) => void;
  setCurrentScene: (scene: GameScene | null) => void;
  setSelectedObjects: (objectIds: string[]) => void;
  selectObject: (objectId: string, additive?: boolean) => void;
  deselectAll: () => void;
  setEditorMode: (mode: 'select' | 'move' | 'rotate' | 'scale') => void;
  
  // Physics Actions
  setPhysicsState: (state: 'stopped' | 'playing' | 'paused') => void;
  setPhysicsCallbacks: (callbacks: EditorState['physicsCallbacks']) => void;
  playPhysics: () => void;
  pausePhysics: () => void;
  stopPhysics: () => void;
  resumePhysics: () => void;
  
  // Scene Manipulation
  addObject: (object: GameObject, parentId?: string) => void;
  removeObject: (objectId: string) => void;
  updateObject: (objectId: string, updates: Partial<GameObject>) => void;
  updateObjectTransform: (objectId: string, transform: Partial<Transform>) => void;
  updateObjectComponent: (objectId: string, componentId: string, updates: Partial<GameObjectComponent>) => void;
  addObjectComponent: (objectId: string, component: GameObjectComponent | PhysicsComponent) => void;
  
  // Scene Configuration
  updateSceneEditorConfig: (config: Partial<SceneEditorConfig>) => void;
  updateSceneRuntimeConfig: (config: Partial<SceneRuntimeConfig>) => void;
  updateScenePhysicsConfig: (config: Partial<PhysicsWorldConfig>) => void;
  
  // Viewport
  setViewportCamera: (camera: Partial<EditorState['viewportCamera']>) => void;
  
  // Scene switching
  switchScene: (sceneName: string) => Promise<void>;
  
  // Material management
  materials: MaterialDefinition[];
  selectedMaterialId: string | null;
  isMaterialBrowserOpen: boolean;
  editingMeshId: string | null; // Which mesh is being edited for material assignment
  
  // Material Management Actions
  setMaterials: (materials: MaterialDefinition[]) => void;
  addMaterial: (material: MaterialDefinition) => void;
  updateMaterial: (materialId: string, updatedMaterial: MaterialDefinition) => void;
  deleteMaterial: (materialId: string) => void;
  setSelectedMaterial: (materialId: string | null) => void;
  openMaterialBrowser: (meshId?: string) => void;
  closeMaterialBrowser: () => void;
  assignMaterialToMesh: (meshId: string, materialId: string) => void;
}

const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set) => ({
    // Initial State
    currentProject: null,
    projects: [],
    currentScene: null,
    selectedObjects: [],
    editorMode: 'select',
    viewportCamera: {
      position: { x: 0, y: 5, z: 10 },
      rotation: { x: -0.2, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 }
    },
    physicsState: 'stopped',
    physicsCallbacks: {},
    
    // Material management
    materials: [],
    selectedMaterialId: null,
    isMaterialBrowserOpen: false,
    editingMeshId: null,

    // Project Actions
    setCurrentProject: (project) => set({ currentProject: project }),
    setProjects: (projects) => set({ projects }),
    
    // Scene Actions
    setCurrentScene: (scene) => set({ 
      currentScene: scene,
      selectedObjects: [], // Clear selection when changing scenes
      materials: scene?.materials || [] // Load materials from scene
    }),
    
    // Scene switching
    switchScene: async (sceneName: string) => {
      const { currentProject } = useEditorStore.getState();
      if (!currentProject) return;

      try {
        const scene = await window.projectAPI.loadScene(currentProject.path, sceneName);
        set({ 
          currentScene: scene,
          selectedObjects: []
        });
        
        // Update project's current scene
        const updatedProject = { ...currentProject, currentScene: sceneName };
        await window.projectAPI.saveProject(updatedProject);
        set({ currentProject: updatedProject });
      } catch (error) {
        console.error('Failed to switch scene:', error);
      }
    },
    
    // Selection Actions
    setSelectedObjects: (objectIds) => set({ selectedObjects: objectIds }),
    selectObject: (objectId, additive = false) => set((state) => ({
      selectedObjects: additive 
        ? state.selectedObjects.includes(objectId)
          ? state.selectedObjects.filter(id => id !== objectId)
          : [...state.selectedObjects, objectId]
        : [objectId]
    })),
    deselectAll: () => set({ selectedObjects: [] }),
    
    // Editor Mode
    setEditorMode: (mode) => set({ editorMode: mode }),
    
    // Scene Manipulation
    addObject: (object, parentId) => set((state) => {
      if (!state.currentScene) return state;
      
      const scene = { ...state.currentScene };
      
      if (parentId) {
        const updateObjectChildren = (objects: GameObject[]): GameObject[] => {
          return objects.map(obj => {
            if (obj.id === parentId) {
              return {
                ...obj,
                children: [...obj.children, object]
              };
            }
            return {
              ...obj,
              children: updateObjectChildren(obj.children)
            };
          });
        };
        scene.objects = updateObjectChildren(scene.objects);
      } else {
        scene.objects = [...scene.objects, object];
      }
      
      return { currentScene: scene };
    }),
    
    removeObject: (objectId) => set((state) => {
      if (!state.currentScene) return state;
      
      const scene = { ...state.currentScene };
      
      const removeFromObjects = (objects: GameObject[]): GameObject[] => {
        return objects
          .filter(obj => obj.id !== objectId)
          .map(obj => ({
            ...obj,
            children: removeFromObjects(obj.children)
          }));
      };
      
      scene.objects = removeFromObjects(scene.objects);
      
      return { 
        currentScene: scene,
        selectedObjects: state.selectedObjects.filter(id => id !== objectId)
      };
    }),
    
    updateObject: (objectId, updates) => set((state) => {
      if (!state.currentScene) return state;
      
      const scene = { ...state.currentScene };
      
      const updateInObjects = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id === objectId) {
            return { ...obj, ...updates };
          }
          return {
            ...obj,
            children: updateInObjects(obj.children)
          };
        });
      };
      
      scene.objects = updateInObjects(scene.objects);
      
      return { currentScene: scene };
    }),
    
    updateObjectTransform: (objectId, transform) => set((state) => {
      if (!state.currentScene) return state;
      
      const scene = { ...state.currentScene };
      
      const updateInObjects = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id === objectId) {
            return { 
              ...obj, 
              transform: { ...obj.transform, ...transform }
            };
          }
          return {
            ...obj,
            children: updateInObjects(obj.children)
          };
        });
      };
      
      scene.objects = updateInObjects(scene.objects);
      
      return { currentScene: scene };
    }),
    
    updateObjectComponent: (objectId, componentId, updates) => set((state) => {
      if (!state.currentScene) return state;
      
      const scene = { ...state.currentScene };
      
      const updateInObjects = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id === objectId) {
            return {
              ...obj,
              components: obj.components.map(comp => 
                comp.id === componentId 
                  ? { ...comp, ...updates }
                  : comp
              )
            };
          }
          return {
            ...obj,
            children: updateInObjects(obj.children)
          };
        });
      };
      
      scene.objects = updateInObjects(scene.objects);
      
      return { currentScene: scene };
    }),

    addObjectComponent: (objectId, component) => set((state) => {
      if (!state.currentScene) return state;
      
      const scene = { ...state.currentScene };
      
      const updateInObjects = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id === objectId) {
            return {
              ...obj,
              components: [...obj.components, component]
            };
          }
          return {
            ...obj,
            children: updateInObjects(obj.children)
          };
        });
      };
      
      scene.objects = updateInObjects(scene.objects);
      
      return { currentScene: scene };
    }),
    
    // Scene Configuration Updates
    updateSceneEditorConfig: (config) => set((state) => {
      if (!state.currentScene) return state;
      
      return {
        currentScene: {
          ...state.currentScene,
          editorConfig: { ...state.currentScene.editorConfig, ...config }
        }
      };
    }),
    
    updateSceneRuntimeConfig: (config) => set((state) => {
      if (!state.currentScene) return state;
      
      return {
        currentScene: {
          ...state.currentScene,
          runtimeConfig: { ...state.currentScene.runtimeConfig, ...config }
        }
      };
    }),
    
    updateScenePhysicsConfig: (config) => set((state) => {
      if (!state.currentScene) return state;
      
      return {
        currentScene: {
          ...state.currentScene,
          physicsWorld: { ...state.currentScene.physicsWorld, ...config }
        }
      };
    }),
    
    // Viewport Actions
    setViewportCamera: (camera) => set((state) => ({
      viewportCamera: { ...state.viewportCamera, ...camera }
    })),

    // Physics Actions
    setPhysicsState: (state) => set({ physicsState: state }),
    setPhysicsCallbacks: (callbacks) => set({ physicsCallbacks: callbacks }),
    playPhysics: () => {
      const { physicsState, physicsCallbacks } = useEditorStore.getState();
      if (physicsState === 'stopped' && physicsCallbacks.play) {
        physicsCallbacks.play();
      }
    },
    pausePhysics: () => {
      const { physicsState, physicsCallbacks } = useEditorStore.getState();
      if (physicsState === 'playing' && physicsCallbacks.pause) {
        physicsCallbacks.pause();
      }
    },
    stopPhysics: () => {
      const { physicsState, physicsCallbacks } = useEditorStore.getState();
      if (physicsState === 'playing' && physicsCallbacks.stop) {
        physicsCallbacks.stop();
      }
    },
    resumePhysics: () => {
      const { physicsState, physicsCallbacks } = useEditorStore.getState();
      if (physicsState === 'paused' && physicsCallbacks.resume) {
        physicsCallbacks.resume();
      }
    },

    // Material Management Actions
    setMaterials: (materials: MaterialDefinition[]) => set({ materials }),
    
    addMaterial: (material: MaterialDefinition) => set((state) => {
      const updatedMaterials = [...state.materials, material];
      
      // Also add to current scene's materials if a scene is loaded
      const updatedScene = state.currentScene ? {
        ...state.currentScene,
        materials: [...(state.currentScene.materials || []), material]
      } : state.currentScene;

      return {
        materials: updatedMaterials,
        currentScene: updatedScene
      };
    }),
    
    updateMaterial: (materialId: string, updatedMaterial: MaterialDefinition) => set((state) => {
      const updatedMaterials = state.materials.map(material => 
        material.id === materialId ? updatedMaterial : material
      );
      
      // Also update in current scene's materials if a scene is loaded
      const updatedScene = state.currentScene ? {
        ...state.currentScene,
        materials: (state.currentScene.materials || []).map(material => 
          material.id === materialId ? updatedMaterial : material
        )
      } : state.currentScene;

      return {
        materials: updatedMaterials,
        currentScene: updatedScene
      };
    }),
    
    deleteMaterial: (materialId: string) => set((state) => {
      const updatedMaterials = state.materials.filter(material => material.id !== materialId);
      
      // Also remove from current scene's materials if a scene is loaded
      const updatedScene = state.currentScene ? {
        ...state.currentScene,
        materials: (state.currentScene.materials || []).filter(material => material.id !== materialId)
      } : state.currentScene;

      return {
        materials: updatedMaterials,
        currentScene: updatedScene
      };
    }),
    
    setSelectedMaterial: (materialId: string | null) => set({ selectedMaterialId: materialId }),
    
    openMaterialBrowser: (meshId?: string) => set({ 
      isMaterialBrowserOpen: true,
      editingMeshId: meshId || null
    }),
    
    closeMaterialBrowser: () => set({ 
      isMaterialBrowserOpen: false,
      editingMeshId: null,
      selectedMaterialId: null
    }),
    
    assignMaterialToMesh: (meshId: string, materialId: string) => {
      const state = useEditorStore.getState();
      const material = state.materials.find(m => m.id === materialId);
      if (material && state.currentScene) {
        // Find the object and update its mesh component
        const findAndUpdateObject = (objects: GameObject[]): GameObject[] => {
          return objects.map(obj => {
            if (obj.id === meshId) {
              return {
                ...obj,
                components: obj.components.map(comp => {
                  if (comp.type === 'Mesh') {
                    return {
                      ...comp,
                      properties: {
                        ...comp.properties,
                        materialRef: {
                          type: 'library',
                          materialId: materialId
                        }
                      }
                    };
                  }
                  return comp;
                })
              };
            }
            return {
              ...obj,
              children: findAndUpdateObject(obj.children)
            };
          });
        };

        // Ensure the material is included in the scene's materials array
        const sceneMaterials = state.currentScene.materials || [];
        const materialExists = sceneMaterials.some(m => m.id === materialId);
        const updatedMaterials = materialExists ? sceneMaterials : [...sceneMaterials, material];

        const updatedScene = {
          ...state.currentScene,
          objects: findAndUpdateObject(state.currentScene.objects),
          materials: updatedMaterials
        };

        set({ currentScene: updatedScene });
      }
    },
  }))
);

export default useEditorStore; 