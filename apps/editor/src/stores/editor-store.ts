import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { generateHeightfieldData } from '@/utils/heightfield-generator';
import { clearTextureCache } from '@/pages/editor-page/components/viewport/enhanced-material-components';
import { generateExtrudedArcColliderVertices } from "@/utils/extruded-arc-generator";

interface EditorState {
  // Project State
  currentProject: GameProject | null;
  projects: GameProject[];
  
  // Scene State
  currentScene: GameScene | null;
  selectedObjects: string[];
  
  // Asset State
  assets: AssetReference[];
  
  // Editor UI State
  editorMode: 'select' | 'move' | 'rotate' | 'scale';
  viewportMode: 'orbit' | 'camera';
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
  setViewportMode: (mode: 'orbit' | 'camera') => void;
  
  // Asset Actions
  loadAssets: () => Promise<void>;
  importAsset: (filePath: string) => Promise<AssetReference>;
  importAssetFromData: (fileName: string, fileData: ArrayBuffer) => Promise<AssetReference>;
  deleteAsset: (assetId: string) => Promise<void>;
  createMeshFromGLB: (assetReference: AssetReference, position?: Vector3) => void;
  
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
  updateHeightfieldComponent: (objectId: string, componentId: string, updates: Partial<HeightfieldComponent['properties']>) => void;
  updateExtrudedArcComponent: (objectId: string, componentId: string, updates: Partial<ExtrudedArcComponent['properties']>) => void;
  
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
    assets: [],
    editorMode: 'select',
    viewportMode: 'orbit',
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
    setCurrentProject: (project) => {
      // Clear texture cache when switching projects to avoid conflicts
      clearTextureCache();
      set({ currentProject: project });
    },
    setProjects: (projects) => set({ projects }),
    
    // Asset Actions
    loadAssets: async () => {
      const { currentProject } = useEditorStore.getState();
      if (!currentProject) return;
      
      try {
        const assets = await window.projectAPI.getAssets(currentProject.path);
        set({ assets });
      } catch (error) {
        console.error('Failed to load assets:', error);
        set({ assets: [] });
      }
    },
    
    importAsset: async (filePath: string) => {
      const { currentProject } = useEditorStore.getState();
      if (!currentProject) throw new Error('No project loaded');
      
      try {
        const assetReference = await window.projectAPI.importAsset(currentProject.path, filePath);
        
        // Update store with new asset
        set({ 
          assets: [...useEditorStore.getState().assets, assetReference]
        });
        
        return assetReference;
      } catch (error) {
        console.error('Failed to import asset:', error);
        throw error;
      }
    },
    
    importAssetFromData: async (fileName: string, fileData: ArrayBuffer) => {
      const { currentProject } = useEditorStore.getState();
      if (!currentProject) throw new Error('No project loaded');
      
      try {
        const assetReference = await window.projectAPI.importAssetFromData(currentProject.path, fileName, fileData);
        
        // Update store with new asset
        set({ 
          assets: [...useEditorStore.getState().assets, assetReference]
        });
        
        return assetReference;
      } catch (error) {
        console.error('Failed to import asset from data:', error);
        throw error;
      }
    },
    
    deleteAsset: async (assetId: string) => {
      const { currentProject, assets } = useEditorStore.getState();
      if (!currentProject) return;
      
      try {
        await window.projectAPI.deleteAsset(currentProject.path, assetId);
        
        // Update store to remove asset
        set({ 
          assets: assets.filter(asset => asset.id !== assetId)
        });
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    },
    
    createMeshFromGLB: (assetReference: AssetReference, position?: Vector3) => {
      const { currentScene, addObject } = useEditorStore.getState();
      if (!currentScene || assetReference.type !== 'model') return;
      
      const meshObject: GameObject = {
        id: `mesh_${Date.now()}`,
        name: assetReference.name,
        transform: {
          position: position || { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        components: [
          {
            id: `mesh_component_${Date.now()}`,
            type: 'Mesh',
            enabled: true,
            properties: {
              geometry: 'external',
              geometryProps: {
                assetId: assetReference.id,
                assetPath: assetReference.path
              },
              materialRef: {
                type: 'inline',
                properties: {
                  type: 'standard',
                  color: '#ffffff',
                  metalness: 0.1,
                  roughness: 0.3
                }
              },
              castShadow: true,
              receiveShadow: true
            }
          }
        ],
        children: [],
        visible: true,
        tags: ['model', 'imported'],
        layer: 0
      };
      
      addObject(meshObject);
    },
    
    // Scene Actions
    setCurrentScene: (scene) => set({ 
      currentScene: scene,
      selectedObjects: [], // Clear selection when changing scenes
      materials: scene?.materials || [], // Load materials from scene
      physicsState: 'stopped', // Reset physics state when changing scenes
      physicsCallbacks: {}, // Clear physics callbacks
      editorMode: 'select', // Reset editor mode to select
    }),
    
    // Scene switching
    switchScene: async (sceneName: string) => {
      const { currentProject } = useEditorStore.getState();
      if (!currentProject) return;

      try {
        // Clear texture cache before switching to avoid conflicts
        clearTextureCache();
        
        const scene = await window.projectAPI.loadScene(currentProject.path, sceneName);
        
        // Load assets from filesystem
        const assets = await window.projectAPI.getAssets(currentProject.path);
        
        set({ 
          currentScene: scene,
          selectedObjects: [],
          assets: assets,
          physicsState: 'stopped', // Reset physics state when switching scenes
          physicsCallbacks: {}, // Clear physics callbacks
          materials: scene?.materials || [], // Load materials from scene
          editorMode: 'select', // Reset editor mode to select
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
      console.log('addObjectComponent called:', { objectId, componentType: component.type });
      
      if (!state.currentScene) return state;
      
      const scene = { ...state.currentScene };
      
      const updateInObjects = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id === objectId) {
            let newComponent = component;
            
            // If adding a heightfield collider, sync with existing heightfield component
            if (component.type === 'collider' && (component as ColliderComponent).properties.shape.type === 'heightfield') {
              const heightfieldComp = obj.components.find(c => c.type === 'heightfield') as HeightfieldComponent;
              if (heightfieldComp && heightfieldComp.properties.heights) {
                const colliderComp = component as ColliderComponent;
                (colliderComp.properties.shape as any).heights = heightfieldComp.properties.heights;
                (colliderComp.properties.shape as any).scale = { 
                  x: heightfieldComp.properties.width / (heightfieldComp.properties.columns - 1),
                  y: 1,
                  z: heightfieldComp.properties.depth / (heightfieldComp.properties.rows - 1)
                };
                newComponent = colliderComp;
              }
            }
            
            // If adding a convex hull collider, sync with existing extruded arc component
            if (component.type === 'collider' && (component as ColliderComponent).properties.shape.type === 'convexHull') {
              const extrudedArcComp = obj.components.find(c => c.type === 'extrudedArc') as ExtrudedArcComponent;
              console.log('Adding convex hull collider to object:', objectId);
              console.log('Found extruded arc component:', !!extrudedArcComp);
              
              if (extrudedArcComp) {
                const colliderComp = component as ColliderComponent;
                const convexHullShape = colliderComp.properties.shape as { type: 'convexHull'; vertices: Vector3[] };
                
                console.log('Initial vertices count:', convexHullShape.vertices.length);
                
                // Only populate if vertices are empty
                if (convexHullShape.vertices.length === 0) {
                  try {
                    const vertices = generateExtrudedArcColliderVertices(extrudedArcComp.properties);
                    console.log('Generated vertices count:', vertices.length);
                    console.log('Generated vertices sample:', vertices.slice(0, 4));
                    
                    const updatedShape = { ...convexHullShape, vertices };
                    const updatedColliderComp = {
                      ...colliderComp,
                      properties: {
                        ...colliderComp.properties,
                        shape: updatedShape
                      }
                    };
                    newComponent = updatedColliderComp;
                    console.log('Updated collider component with vertices');
                  } catch (error) {
                    console.warn('Failed to generate collider vertices for extruded arc:', error);
                  }
                }
              }
            }
            
            return {
              ...obj,
              components: [...obj.components, newComponent]
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
                  if (comp.type === 'Mesh' || comp.type === 'heightfield' || comp.type === 'extrudedArc') {
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

    updateHeightfieldComponent: (objectId, componentId, updates) => set((state) => {
      if (!state.currentScene) return state;

      const findAndUpdate = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id !== objectId) {
            return { ...obj, children: findAndUpdate(obj.children) };
          }

          let newHeights: number[][] | undefined;
          const updatedComponents = obj.components.map(comp => {
            if (comp.id !== componentId || comp.type !== 'heightfield') {
              return comp;
            }

            const hfComp = comp as HeightfieldComponent;
            const newProps = { ...hfComp.properties, ...updates };

            newHeights = generateHeightfieldData(newProps);
            newProps.heights = newHeights;

            return { ...hfComp, properties: newProps };
          });

          let finalComponents = updatedComponents;
          if (newHeights) {
            finalComponents = updatedComponents.map(comp => {
              if (comp.type === 'collider' && (comp as ColliderComponent).properties.shape.type === 'heightfield') {
                const collComp = comp as ColliderComponent;
                (collComp.properties.shape as any).heights = newHeights;
              }
              return comp;
            });
          }

          return { ...obj, components: finalComponents };
        });
      };

      const newScene = { ...state.currentScene, objects: findAndUpdate(state.currentScene.objects) };
      return { currentScene: newScene };
    }),

    updateExtrudedArcComponent: (objectId, componentId, updates) => set((state) => {
      if (!state.currentScene) return state;

      const findAndUpdate = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id !== objectId) {
            return { ...obj, children: findAndUpdate(obj.children) };
          }

          let newExtrudedArcProps: ExtrudedArcComponent['properties'] | undefined;
          const updatedComponents = obj.components.map(comp => {
            if (comp.id !== componentId || comp.type !== 'extrudedArc') {
              return comp;
            }

            const eaComp = comp as ExtrudedArcComponent;
            const newProps = { ...eaComp.properties, ...updates };
            newExtrudedArcProps = newProps;

            return { ...eaComp, properties: newProps };
          });

          let finalComponents = updatedComponents;
          if (newExtrudedArcProps) {
            // Update any convex hull colliders that might be attached to this extruded arc
            finalComponents = updatedComponents.map(comp => {
              if (comp.type === 'collider') {
                const collComp = comp as ColliderComponent;
                if (collComp.properties.shape.type === 'convexHull') {
                  const convexHullShape = collComp.properties.shape as { type: 'convexHull'; vertices: Vector3[] };
                  
                  // Check if the convex hull has empty vertices and populate them from the extruded arc
                  if (convexHullShape.vertices.length === 0) {
                    try {
                      const vertices = generateExtrudedArcColliderVertices(newExtrudedArcProps!);
                      return {
                        ...collComp,
                        properties: {
                          ...collComp.properties,
                          shape: {
                            ...convexHullShape,
                            vertices
                          }
                        }
                      };
                    } catch (error) {
                      console.warn('Failed to generate collider vertices for extruded arc:', error);
                      return collComp;
                    }
                  } else {
                    // Update existing vertices when extruded arc geometry changes
                    try {
                      const vertices = generateExtrudedArcColliderVertices(newExtrudedArcProps!);
                      return {
                        ...collComp,
                        properties: {
                          ...collComp.properties,
                          shape: {
                            ...convexHullShape,
                            vertices
                          }
                        }
                      };
                    } catch (error) {
                      console.warn('Failed to update collider vertices for extruded arc:', error);
                      return collComp;
                    }
                  }
                }
              }
              return comp;
            });
          }

          return { ...obj, components: finalComponents };
        });
      };

      const newScene = { ...state.currentScene, objects: findAndUpdate(state.currentScene.objects) };
      return { currentScene: newScene };
    }),

    setViewportMode: (mode) => set({ viewportMode: mode }),
  }))
);

export default useEditorStore; 