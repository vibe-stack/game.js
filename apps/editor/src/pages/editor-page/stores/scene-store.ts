import { create } from 'zustand';
import { useSceneRoutesStore } from './scene-routes-store';
import { useSceneSyncStore } from './scene-sync-store';

interface SceneStore {
  initializeScene: (projectName: string) => Promise<void>;
}

export const useSceneStore = create<SceneStore>(() => ({
  initializeScene: async (projectName: string) => {
    const routesStore = useSceneRoutesStore.getState();
    const syncStore = useSceneSyncStore.getState();
    
    await routesStore.loadSceneRoutes(projectName);
    syncStore.setupEditorConnection(projectName);
  },
}));

// Re-export all the stores for convenience
export { useSceneRoutesStore } from './scene-routes-store';
export { useSceneObjectsStore } from './scene-objects-store';
export { useSceneSyncStore } from './scene-sync-store';