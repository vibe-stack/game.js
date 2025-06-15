import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameWorld } from '@/services/game-world';
import { generateHeightfieldData } from '@/utils/heightfield-generator';
import { clearTextureCache } from '@/pages/editor-page/components/viewport/enhanced-material-components';

interface EditorState {
  // Project State
  currentProject: GameProject | null;
  projects: GameProject[];
  
  // GameWorld Integration
  gameWorld: GameWorld | null;
  
  // Scene State (snapshots for UI)
  currentScene: GameScene | null;
  selectedObjects: string[];
  selectedObjectData: GameObject | null; // Snapshot of selected object for inspector
  
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
  setGameWorld: (gameWorld: GameWorld | null) => void;
  setCurrentScene: (scene: GameScene | null) => void;
  setSelectedObjects: (objectIds: string[]) => void;
  selectObject: (objectId: string, additive?: boolean) => void;
  deselectAll: () => void;
  updateSelectedObjectSnapshot: () => void;
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
  
  // GameWorld Actions (delegated to GameWorld service)
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
  editingMeshId: string | null;
  
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
  subscribeWithSelector((set, get) => ({
    // Initial State
    currentProject: null,
    projects: [],
    gameWorld: null,
    currentScene: null,
    selectedObjects: [],
    selectedObjectData: null,
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
      clearTextureCache();
      set({ currentProject: project });
    },
    setProjects: (projects) => set({ projects }),
    
    // GameWorld Actions
    setGameWorld: (gameWorld) => {
      const currentGameWorld = get().gameWorld;
      
      // Clean up previous game world listeners
      if (currentGameWorld) {
        currentGameWorld.removeAllListeners();
      }
      
      // Set up new game world with listeners
      if (gameWorld) {
        // Listen for scene changes from GameWorld (e.g., after restore)
        gameWorld.on('sceneChanged', ({ scene }) => {
          set({ currentScene: scene });
        });
        
        // Listen for object transform updates
        gameWorld.on('objectTransformUpdate', () => {
          // Update selected object snapshot when transforms change
          get().updateSelectedObjectSnapshot();
        });
      }
      
      set({ gameWorld });
    },
    
    // Scene Actions
    setCurrentScene: (scene) => {
      const state = get();
      set({ 
        currentScene: scene,
        materials: scene?.materials || [], // Sync materials from scene
        selectedObjects: [], // Clear selection when changing scenes
        selectedObjectData: null
      });
      
      // Load scene into GameWorld if available
      if (state.gameWorld && scene) {
        state.gameWorld.loadScene(scene);
      }
    },
    
    // Selection Actions
    setSelectedObjects: (objectIds) => {
      set({ selectedObjects: objectIds });
      // Update selected object snapshot
      get().updateSelectedObjectSnapshot();
    },
    
    selectObject: (objectId: string, additive = false) => {
      const { selectedObjects } = get();
      let newSelection: string[];
      
      if (additive) {
        newSelection = selectedObjects.includes(objectId)
          ? selectedObjects.filter(id => id !== objectId)
          : [...selectedObjects, objectId];
      } else {
        newSelection = [objectId];
      }
      
      set({ selectedObjects: newSelection });
      get().updateSelectedObjectSnapshot();
    },
    
    deselectAll: () => {
      set({ selectedObjects: [], selectedObjectData: null });
    },
    
    updateSelectedObjectSnapshot: () => {
      const { selectedObjects, gameWorld } = get();
      
      if (selectedObjects.length === 1 && gameWorld) {
        const objectData = gameWorld.getSelectedObjectData(selectedObjects[0]);
        set({ selectedObjectData: objectData });
      } else {
        set({ selectedObjectData: null });
      }
    },
    
    setEditorMode: (mode) => set({ editorMode: mode }),
    setViewportMode: (mode) => set({ viewportMode: mode }),
    
    // Asset Actions
    loadAssets: async () => {
      const { currentProject } = get();
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
      const { currentProject } = get();
      if (!currentProject) throw new Error('No project loaded');
      
      try {
        const assetReference = await window.projectAPI.importAsset(currentProject.path, filePath);
        set({ assets: [...get().assets, assetReference] });
        return assetReference;
      } catch (error) {
        console.error('Failed to import asset:', error);
        throw error;
      }
    },
    
    importAssetFromData: async (fileName: string, fileData: ArrayBuffer) => {
      const { currentProject } = get();
      if (!currentProject) throw new Error('No project loaded');
      
      try {
        const assetReference = await window.projectAPI.importAssetFromData(currentProject.path, fileName, fileData);
        set({ assets: [...get().assets, assetReference] });
        return assetReference;
      } catch (error) {
        console.error('Failed to import asset from data:', error);
        throw error;
      }
    },
    
    deleteAsset: async (assetId: string) => {
      const { currentProject, assets } = get();
      if (!currentProject) return;
      
      try {
        await window.projectAPI.deleteAsset(currentProject.path, assetId);
        set({ assets: assets.filter(asset => asset.id !== assetId) });
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    },
    
    createMeshFromGLB: (assetReference: AssetReference, position?: Vector3) => {
      const { gameWorld, currentScene } = get();
      if (!gameWorld || !currentScene) return;

      const newObject: GameObject = {
        id: `mesh_${Date.now()}`,
        name: assetReference.name,
        transform: {
          position: position || { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        components: [{
          id: `component_${Date.now()}`,
          type: 'MeshRenderer',
          enabled: true,
          properties: {
            geometry: 'model',
            model: assetReference.path,
            materialRef: { type: 'library', materialId: 'default' }
          }
        }],
        children: [],
        visible: true,
        tags: [],
        layer: 0
      };

      // Add to scene via GameWorld (will emit events)
      get().addObject(newObject);
    },
    
    // Physics Actions
    setPhysicsState: (state) => set({ physicsState: state }),
    setPhysicsCallbacks: (callbacks) => set({ physicsCallbacks: callbacks }),
    
    playPhysics: () => {
      const { physicsCallbacks, gameWorld } = get();
      
      // Create a comprehensive scene snapshot BEFORE starting physics
      if (gameWorld) {
        gameWorld.createSceneSnapshot();
      }
      
      physicsCallbacks.play?.();
      gameWorld?.start();
      set({ physicsState: 'playing' });
    },
    
    pausePhysics: () => {
      const { physicsCallbacks, gameWorld } = get();
      physicsCallbacks.pause?.();
      gameWorld?.pause();
      set({ physicsState: 'paused' });
    },
    
    stopPhysics: () => {
      const { physicsCallbacks, gameWorld } = get();

      physicsCallbacks.stop?.();
      gameWorld?.stop();

      if (gameWorld) {
        gameWorld.restoreSceneSnapshot();
      }

      set({ physicsState: 'stopped' });
      get().updateSelectedObjectSnapshot();
    },
    
    resumePhysics: () => {
      const { physicsCallbacks, gameWorld } = get();
      physicsCallbacks.resume?.();
      gameWorld?.resume();
      set({ physicsState: 'playing' });
    },
    
    // GameWorld Delegated Actions
    addObject: (object: GameObject, parentId?: string) => {
      const { gameWorld, currentScene } = get();
      if (!gameWorld || !currentScene) return;

      // Add to scene objects
      if (parentId) {
        const findAndAddToParent = (objects: GameObject[]): GameObject[] => {
          return objects.map(obj => {
            if (obj.id === parentId) {
              return { ...obj, children: [...obj.children, object] };
            }
            if (obj.children.length > 0) {
              return { ...obj, children: findAndAddToParent(obj.children) };
            }
            return obj;
          });
        };
        
        const updatedObjects = findAndAddToParent(currentScene.objects);
        const updatedScene = { ...currentScene, objects: updatedObjects };
        set({ currentScene: updatedScene });
        gameWorld.loadScene(updatedScene);
      } else {
        const updatedScene = { 
          ...currentScene, 
          objects: [...currentScene.objects, object] 
        };
        set({ currentScene: updatedScene });
        gameWorld.loadScene(updatedScene);
      }
    },
    
    removeObject: (objectId: string) => {
      const { gameWorld, currentScene } = get();
      if (!gameWorld || !currentScene) return;

      const removeFromObjects = (objects: GameObject[]): GameObject[] => {
        return objects.filter(obj => obj.id !== objectId)
          .map(obj => ({
            ...obj,
            children: removeFromObjects(obj.children)
          }));
      };

      const updatedScene = {
        ...currentScene,
        objects: removeFromObjects(currentScene.objects)
      };
      
      set({ currentScene: updatedScene });
      gameWorld.loadScene(updatedScene);
    },
    
    updateObject: (objectId: string, updates: Partial<GameObject>) => {
      const { gameWorld } = get();
      if (!gameWorld) return;

      // Delegate to GameWorld for immediate updates
      Object.keys(updates).forEach(key => {
        gameWorld.updateObjectProperty(objectId, key, (updates as any)[key]);
      });
      
      // Update snapshot if selected
      if (get().selectedObjects.includes(objectId)) {
        get().updateSelectedObjectSnapshot();
      }
    },
    
    updateObjectTransform: (objectId: string, transform: Partial<Transform>) => {
      const { gameWorld } = get();
      if (!gameWorld) return;

      gameWorld.updateObjectTransform(objectId, transform);
      
      // Update snapshot if selected
      if (get().selectedObjects.includes(objectId)) {
        get().updateSelectedObjectSnapshot();
      }
    },
    
    updateObjectComponent: (objectId: string, componentId: string, updates: Partial<GameObjectComponent>) => {
      const { gameWorld } = get();
      if (!gameWorld) return;

      gameWorld.updateObjectComponent(objectId, componentId, updates);
      
      // Update snapshot if selected
      if (get().selectedObjects.includes(objectId)) {
        get().updateSelectedObjectSnapshot();
      }
    },
    
    addObjectComponent: (objectId: string, component: GameObjectComponent | PhysicsComponent) => {
      const { gameWorld, currentScene } = get();
      if (!gameWorld || !currentScene) return;

      const updateInObjects = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id === objectId) {
            return { ...obj, components: [...obj.components, component] };
          }
          if (obj.children.length > 0) {
            return { ...obj, children: updateInObjects(obj.children) };
          }
          return obj;
        });
      };

      const updatedScene = {
        ...currentScene,
        objects: updateInObjects(currentScene.objects)
      };
      
      set({ currentScene: updatedScene });
      gameWorld.loadScene(updatedScene);
      
      // Update snapshot if selected
      if (get().selectedObjects.includes(objectId)) {
        get().updateSelectedObjectSnapshot();
      }
    },
    
    updateHeightfieldComponent: (objectId: string, componentId: string, updates: Partial<HeightfieldComponent['properties']>) => {
      const { gameWorld, currentScene } = get();
      if (!gameWorld || !currentScene) return;

      const findAndUpdate = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id === objectId) {
            const updatedComponents = obj.components.map(comp => {
              if (comp.id === componentId && comp.type === 'heightfield') {
                const heightfieldComp = comp as HeightfieldComponent;
                const updatedProperties = { ...heightfieldComp.properties, ...updates };
                
                if (updatedProperties.autoRegenerate) {
                  updatedProperties.heights = generateHeightfieldData(updatedProperties);
                  updatedProperties.lastGenerated = new Date();
                }
                
                return { ...heightfieldComp, properties: updatedProperties };
              }
              return comp;
            });
            return { ...obj, components: updatedComponents };
          }
          
          if (obj.children.length > 0) {
            return { ...obj, children: findAndUpdate(obj.children) };
          }
          return obj;
        });
      };

      const updatedScene = {
        ...currentScene,
        objects: findAndUpdate(currentScene.objects)
      };
      
      set({ currentScene: updatedScene });
      gameWorld.loadScene(updatedScene);
      
      // Update snapshot if selected
      if (get().selectedObjects.includes(objectId)) {
        get().updateSelectedObjectSnapshot();
      }
    },
    
    updateExtrudedArcComponent: (objectId: string, componentId: string, updates: Partial<ExtrudedArcComponent['properties']>) => {
      const { gameWorld, currentScene } = get();
      if (!gameWorld || !currentScene) return;

      const findAndUpdate = (objects: GameObject[]): GameObject[] => {
        return objects.map(obj => {
          if (obj.id === objectId) {
            const updatedComponents = obj.components.map(comp => {
              if (comp.id === componentId && comp.type === 'extrudedArc') {
                const extrudedArcComp = comp as ExtrudedArcComponent;
                const updatedProperties = { ...extrudedArcComp.properties, ...updates };
                
                if (updatedProperties.autoRegenerate) {
                  updatedProperties.lastGenerated = new Date();
                }
                
                return { ...extrudedArcComp, properties: updatedProperties };
              }
              return comp;
            });
            return { ...obj, components: updatedComponents };
          }
          
          if (obj.children.length > 0) {
            return { ...obj, children: findAndUpdate(obj.children) };
          }
          return obj;
        });
      };

      const updatedScene = {
        ...currentScene,
        objects: findAndUpdate(currentScene.objects)
      };
      
      set({ currentScene: updatedScene });
      gameWorld.loadScene(updatedScene);
      
      // Update snapshot if selected
      if (get().selectedObjects.includes(objectId)) {
        get().updateSelectedObjectSnapshot();
      }
    },
    
    // Scene Configuration
    updateSceneEditorConfig: (config: Partial<SceneEditorConfig>) => {
      const { currentScene } = get();
      if (!currentScene) return;
      
      const updatedScene = {
        ...currentScene,
        editorConfig: { ...currentScene.editorConfig, ...config }
      };
      set({ currentScene: updatedScene });
    },
    
    updateSceneRuntimeConfig: (config: Partial<SceneRuntimeConfig>) => {
      const { currentScene } = get();
      if (!currentScene) return;
      
      const updatedScene = {
        ...currentScene,
        runtimeConfig: { ...currentScene.runtimeConfig, ...config }
      };
      set({ currentScene: updatedScene });
    },
    
    updateScenePhysicsConfig: (config: Partial<PhysicsWorldConfig>) => {
      const { currentScene } = get();
      if (!currentScene) return;
      
      const updatedScene = {
        ...currentScene,
        physicsWorld: { ...currentScene.physicsWorld, ...config }
      };
      set({ currentScene: updatedScene });
    },
    
    // Viewport
    setViewportCamera: (camera) => {
      set({ viewportCamera: { ...get().viewportCamera, ...camera } });
    },
    
    // Scene switching
    switchScene: async (sceneName: string) => {
      const { currentProject } = get();
      if (!currentProject) return;
      
      try {
        const scene = await window.projectAPI.loadScene(currentProject.path, sceneName);
        get().setCurrentScene(scene);
      } catch (error) {
        console.error('Failed to switch scene:', error);
      }
    },
    
    // Material Management Actions
    setMaterials: (materials) => set({ materials }),
    addMaterial: (material) => set({ materials: [...get().materials, material] }),
    updateMaterial: (materialId, updatedMaterial) => {
      const materials = get().materials.map(m => 
        m.id === materialId ? updatedMaterial : m
      );
      set({ materials });
    },
    deleteMaterial: (materialId) => {
      const materials = get().materials.filter(m => m.id !== materialId);
      set({ materials });
    },
    setSelectedMaterial: (materialId) => set({ selectedMaterialId: materialId }),
    openMaterialBrowser: (meshId) => set({ 
      isMaterialBrowserOpen: true, 
      editingMeshId: meshId || null 
    }),
    closeMaterialBrowser: () => set({ 
      isMaterialBrowserOpen: false, 
      editingMeshId: null 
    }),
    assignMaterialToMesh: (meshId, materialId) => {
      // This would typically update the mesh component's material reference
      // Implementation depends on your specific component structure
      console.log('Assigning material', materialId, 'to mesh', meshId);
    },
  }))
);

export default useEditorStore; 