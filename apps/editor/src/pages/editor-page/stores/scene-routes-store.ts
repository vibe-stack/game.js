import { create } from 'zustand';
import { SceneRoute } from '../types';

interface SceneRoutesStore {
  routes: SceneRoute[];
  currentRoute: string | null;
  currentFilePath: string | null;
  isLoadingRoutes: boolean;
  
  setRoutes: (routes: SceneRoute[]) => void;
  setCurrentRoute: (route: string | null, filePath?: string | null) => void;
  setIsLoadingRoutes: (loading: boolean) => void;
  loadSceneRoutes: (projectName: string) => Promise<void>;
}

export const useSceneRoutesStore = create<SceneRoutesStore>((set) => ({
  routes: [],
  currentRoute: null,
  currentFilePath: null,
  isLoadingRoutes: false,

  setRoutes: (routes) => set({ routes }),
  setCurrentRoute: (route, filePath = null) => set({ currentRoute: route, currentFilePath: filePath }),
  setIsLoadingRoutes: (loading) => set({ isLoadingRoutes: loading }),

  loadSceneRoutes: async (projectName: string) => {
    set({ isLoadingRoutes: true });
    try {
      const sceneInfo = await window.projectAPI.getSceneInfo(projectName);
      
      if (sceneInfo && typeof sceneInfo === 'object' && 'routes' in sceneInfo) {
        const routes = sceneInfo.routes as SceneRoute[];
        set({ routes, isLoadingRoutes: false });
      } else {
        set({ routes: [], isLoadingRoutes: false });
      }
    } catch {
      set({ routes: [], isLoadingRoutes: false });
    }
  },
})); 