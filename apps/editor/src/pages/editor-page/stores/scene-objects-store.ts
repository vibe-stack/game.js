import { create } from 'zustand';
import { SceneObject, ObjectCreateOptions, SceneEditorData } from '../types';
import { useSceneHistoryStore } from './scene-history-store';
import { 
  findAndUpdateSceneObject, 
  createSceneDiff, 
  createHistoryEntry, 
  generateChangeDescription,
  applySceneDiff 
} from '../utils/scene-operations';

interface SceneObjectsStore {
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  sceneData: SceneEditorData | null;
  
  setSceneData: (data: SceneEditorData) => void;
  setSceneObjects: (objects: SceneObject[]) => void;
  setSelectedObjectId: (id: string | null) => void;
  addObject: (scenePath: string, objectOptions: ObjectCreateOptions) => Promise<void>;
  updateObject: (objectId: string, updates: Partial<SceneObject>) => Promise<void>;
  removeObject: (objectId: string) => Promise<void>;
  duplicateObject: (objectId: string) => Promise<void>;
  undoLastChange: () => Promise<void>;
  redoLastChange: () => Promise<void>;
}

// Helper functions for scene traversal
const findObjectPath = (obj: Record<string, unknown>, targetId: string, currentPath: string = 'scene.object'): string | null => {
  if (obj.uuid === targetId) {
    return currentPath;
  }
  if (obj.children && Array.isArray(obj.children)) {
    for (let i = 0; i < obj.children.length; i++) {
      const childPath = findObjectPath(obj.children[i] as Record<string, unknown>, targetId, `${currentPath}.children.${i}`);
      if (childPath) return childPath;
    }
  }
  return null;
};

const removeObjectFromScene = (obj: Record<string, unknown>, targetId: string, currentPath: string = 'scene.object'): { removed: boolean; path: string | null } => {
  if (obj.children && Array.isArray(obj.children)) {
    for (let i = 0; i < obj.children.length; i++) {
      const child = obj.children[i] as Record<string, unknown>;
      if (child.uuid === targetId) {
        obj.children.splice(i, 1);
        return { removed: true, path: `${currentPath}.children.${i}` };
      }
      const result = removeObjectFromScene(child, targetId, `${currentPath}.children.${i}`);
      if (result.removed) {
        return result;
      }
    }
  }
  return { removed: false, path: null };
};

export const useSceneObjectsStore = create<SceneObjectsStore>((set, get) => ({
  sceneObjects: [],
  selectedObjectId: null,
  sceneData: null,

  setSceneData: (data) => set({ sceneData: data }),
  setSceneObjects: (objects) => set({ sceneObjects: objects }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),

  addObject: async (scenePath: string, objectOptions: ObjectCreateOptions) => {
    const { sceneObjects, sceneData } = get();
    
    const newObject: SceneObject = {
      id: Date.now().toString(),
      name: `${objectOptions.geometry.type.replace('Geometry', '')} ${sceneObjects.length + 1}`,
      type: objectOptions.type,
      visible: true,
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // Identity matrix
      material: {
        color: objectOptions.material.color || 0xffffff,
        opacity: objectOptions.material.opacity || 1,
        transparent: objectOptions.material.transparent || false
      }
    };

    set({ sceneObjects: [...sceneObjects, newObject] });
    
    // Add to scene data structure if it exists
    if (sceneData?.scene?.object) {
      if (!sceneData.scene.object.children) {
        sceneData.scene.object.children = [];
      }
      
      // Create the scene object definition
      const sceneObjectDef = {
        uuid: newObject.id,
        name: newObject.name,
        type: newObject.type,
        visible: newObject.visible,
        matrix: newObject.matrix
      };
      
      sceneData.scene.object.children.push(sceneObjectDef);
      
      const { useEditorConnectionStore } = await import('./editor-connection-store');
      const editorConnection = useEditorConnectionStore.getState();
      
      if (editorConnection.isConnected) {
        // Add to the scene structure, not objects
        const newIndex = sceneData.scene.object.children.length - 1;
        editorConnection.sendPropertyUpdate(
          scenePath,
          `scene.object.children.${newIndex}`,
          sceneObjectDef,
          false
        );
      }
    }
  },

  updateObject: async (objectId: string, updates: Partial<SceneObject>) => {
    const { sceneData, sceneObjects } = get();
    
    if (!sceneData) {
      console.warn('No scene data available for updates');
      return;
    }

    // Find the object to get its name for history description
    const findObjectById = (objects: SceneObject[], id: string): SceneObject | null => {
      for (const obj of objects) {
        if (obj.id === id) return obj;
        if (obj.children) {
          const found = findObjectById(obj.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const targetObject = findObjectById(sceneObjects, objectId);
    if (!targetObject) {
      console.warn(`Object ${objectId} not found for update`);
      return;
    }

    // Update the base scene and capture old values for history
    const diffs = [];
    for (const [property, newValue] of Object.entries(updates)) {
      const { found, oldValues } = findAndUpdateSceneObject(
        sceneData.scene.object,
        objectId,
        { [property]: newValue }
      );
      
      if (found && oldValues[property] !== undefined) {
        const diff = createSceneDiff(
          objectId,
          property,
          oldValues[property],
          newValue,
          property === 'matrix' ? 'matrix' : property === 'name' ? 'name' : 'visible'
        );
        diffs.push(diff);
      }
    }

    // Add to history if we have diffs
    if (diffs.length > 0) {
      const description = generateChangeDescription(
        targetObject.name,
        Object.keys(updates)[0],
        diffs[0].oldValue,
        diffs[0].newValue
      );
      
      const historyEntry = createHistoryEntry(description, diffs);
      useSceneHistoryStore.getState().pushHistory(historyEntry);
    }

    // Update local scene objects for UI
    const updatedObjects = sceneObjects.map(obj => 
      obj.id === objectId ? { ...obj, ...updates } : obj
    );
    set({ sceneObjects: updatedObjects });

    // Send matrix update to WebSocket - update the actual scene structure
    const { useSceneRoutesStore } = await import('./scene-routes-store');
    const { currentFilePath } = useSceneRoutesStore.getState();

    if (currentFilePath) {
      const { useEditorConnectionStore } = await import('./editor-connection-store');
      const editorConnection = useEditorConnectionStore.getState();
      
      if (editorConnection.isConnected) {
        // Find the object's path in the scene structure to update it directly
        const objectPath = findObjectPath(sceneData.scene.object, objectId);
        if (objectPath) {
          // Send property updates to the actual scene structure
          Object.entries(updates).forEach(([property, value]) => {
            editorConnection.sendPropertyUpdate(
              currentFilePath,
              `${objectPath}.${property}`,
              value,
              false
            );
          });
        }
      }
    }
  },

  undoLastChange: async () => {
    const historyStore = useSceneHistoryStore.getState();
    const entry = historyStore.undo();
    
    if (entry && get().sceneData) {
      for (const diff of entry.diffs) {
        applySceneDiff(get().sceneData!.scene.object, diff, true);
      }
    }
  },

  redoLastChange: async () => {
    const historyStore = useSceneHistoryStore.getState();
    const entry = historyStore.redo();
    
    if (entry && get().sceneData) {
      for (const diff of entry.diffs) {
        applySceneDiff(get().sceneData!.scene.object, diff, false);
      }
    }
  },

  removeObject: async (objectId: string) => {
    const { sceneObjects, sceneData } = get();
    const filteredObjects = sceneObjects.filter(obj => obj.id !== objectId);
    set({ sceneObjects: filteredObjects });

    // Remove from scene data structure
    if (sceneData?.scene?.object?.children) {
      const { removed, path } = removeObjectFromScene(sceneData.scene.object, objectId);
      if (removed) {
        if (path) {
          const { useSceneRoutesStore } = await import('./scene-routes-store');
          const { currentFilePath } = useSceneRoutesStore.getState();

          if (currentFilePath) {
            const { useEditorConnectionStore } = await import('./editor-connection-store');
            const editorConnection = useEditorConnectionStore.getState();
            
            if (editorConnection.isConnected) {
              // Remove from the scene structure
              editorConnection.sendPropertyUpdate(
                currentFilePath,
                path,
                null,
                false
              );
            }
          }
        }
      }
    }
  },

  duplicateObject: async (objectId: string) => {
    const { sceneObjects, sceneData } = get();
    const originalObject = sceneObjects.find(obj => obj.id === objectId);
    
    if (originalObject && sceneData?.scene?.object) {
      const duplicatedObject: SceneObject = {
        ...originalObject,
        id: Date.now().toString(),
        name: `${originalObject.name} Copy`,
      };
      
      set({ sceneObjects: [...sceneObjects, duplicatedObject] });

      // Add to root level for now
      if (!sceneData.scene.object.children) {
        sceneData.scene.object.children = [];
      }
      
      const sceneObjectDef = {
        uuid: duplicatedObject.id,
        name: duplicatedObject.name,
        type: duplicatedObject.type,
        visible: duplicatedObject.visible,
        matrix: duplicatedObject.matrix
      };
      
      sceneData.scene.object.children.push(sceneObjectDef);
      
      const { useSceneRoutesStore } = await import('./scene-routes-store');
      const { currentFilePath } = useSceneRoutesStore.getState();

      if (currentFilePath) {
        const { useEditorConnectionStore } = await import('./editor-connection-store');
        const editorConnection = useEditorConnectionStore.getState();
        
        if (editorConnection.isConnected) {
          const newIndex = sceneData.scene.object.children.length - 1;
          editorConnection.sendPropertyUpdate(
            currentFilePath,
            `scene.object.children.${newIndex}`,
            sceneObjectDef,
            false
          );
        }
      }
    }
  },
})); 