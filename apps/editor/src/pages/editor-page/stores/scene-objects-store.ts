import { create } from 'zustand';
import { SceneObject, ObjectCreateOptions } from '../types';

interface SceneObjectsStore {
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  
  setSceneObjects: (objects: SceneObject[]) => void;
  setSelectedObjectId: (id: string | null) => void;
  addObject: (scenePath: string, objectOptions: ObjectCreateOptions) => Promise<void>;
  updateObject: (objectId: string, updates: Partial<SceneObject>) => Promise<void>;
  removeObject: (objectId: string) => Promise<void>;
  duplicateObject: (objectId: string) => Promise<void>;
}

export const useSceneObjectsStore = create<SceneObjectsStore>((set, get) => ({
  sceneObjects: [],
  selectedObjectId: null,

  setSceneObjects: (objects) => set({ sceneObjects: objects }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),

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

  updateObject: async (objectId: string, updates: Partial<SceneObject>) => {
    const { sceneObjects } = get();
    const updatedObjects = sceneObjects.map(obj => 
      obj.id === objectId ? { ...obj, ...updates } : obj
    );
    set({ sceneObjects: updatedObjects });

    const { useSceneRoutesStore } = await import('./scene-routes-store');
    const { currentFilePath } = useSceneRoutesStore.getState();

    if (currentFilePath) {
      const { useEditorConnectionStore } = await import('./editor-connection-store');
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
    }
  },

  removeObject: async (objectId: string) => {
    const { sceneObjects } = get();
    const filteredObjects = sceneObjects.filter(obj => obj.id !== objectId);
    set({ sceneObjects: filteredObjects });

    const { useSceneRoutesStore } = await import('./scene-routes-store');
    const { currentFilePath } = useSceneRoutesStore.getState();

    if (currentFilePath) {
      const { useEditorConnectionStore } = await import('./editor-connection-store');
      const editorConnection = useEditorConnectionStore.getState();
      
      if (editorConnection.isConnected) {
        editorConnection.sendPropertyUpdate(
          currentFilePath,
          `objects.${objectId}`,
          null,
          false
        );
      }
    }
  },

  duplicateObject: async (objectId: string) => {
    const { sceneObjects } = get();
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

      const { useSceneRoutesStore } = await import('./scene-routes-store');
      const { currentFilePath } = useSceneRoutesStore.getState();

      if (currentFilePath) {
        const { useEditorConnectionStore } = await import('./editor-connection-store');
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
      }
    }
  },
})); 