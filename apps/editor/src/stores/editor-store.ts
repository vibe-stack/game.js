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
  
  // Actions
  setCurrentProject: (project: GameProject | null) => void;
  setProjects: (projects: GameProject[]) => void;
  setCurrentScene: (scene: GameScene | null) => void;
  setSelectedObjects: (objectIds: string[]) => void;
  selectObject: (objectId: string, additive?: boolean) => void;
  deselectAll: () => void;
  setEditorMode: (mode: 'select' | 'move' | 'rotate' | 'scale') => void;
  
  // Scene Manipulation
  addObject: (object: GameObject, parentId?: string) => void;
  removeObject: (objectId: string) => void;
  updateObject: (objectId: string, updates: Partial<GameObject>) => void;
  updateObjectTransform: (objectId: string, transform: Partial<Transform>) => void;
  updateObjectComponent: (objectId: string, componentId: string, updates: Partial<GameObjectComponent>) => void;
  
  // Scene Configuration
  updateSceneEditorConfig: (config: Partial<SceneEditorConfig>) => void;
  updateSceneRuntimeConfig: (config: Partial<SceneRuntimeConfig>) => void;
  
  // Viewport
  setViewportCamera: (camera: Partial<EditorState['viewportCamera']>) => void;
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

    // Project Actions
    setCurrentProject: (project) => set({ currentProject: project }),
    setProjects: (projects) => set({ projects }),
    
    // Scene Actions
    setCurrentScene: (scene) => set({ 
      currentScene: scene,
      selectedObjects: [] // Clear selection when changing scenes
    }),
    
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
    
    // Viewport Actions
    setViewportCamera: (camera) => set((state) => ({
      viewportCamera: { ...state.viewportCamera, ...camera }
    }))
  }))
);

export default useEditorStore; 