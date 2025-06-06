import { create } from 'zustand';
import { GameProject } from '../types';

interface ProjectStore {
  projects: GameProject[];
  currentProject: GameProject | null;
  isLoading: boolean;
  errorMessage: string | null;
  
  setProjects: (projects: GameProject[]) => void;
  setCurrentProject: (project: GameProject | null) => void;
  setIsLoading: (loading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  loadProjects: () => Promise<void>;
  openProjectFolder: (projectPath: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  errorMessage: null,

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setErrorMessage: (message) => set({ errorMessage: message }),

  loadProjects: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const projectList = await window.projectAPI.loadProjects();
      set({ projects: projectList, isLoading: false });
    } catch (error) {
      console.error("Failed to load projects:", error);
      set({ 
        errorMessage: error instanceof Error ? error.message : "Failed to load projects",
        isLoading: false 
      });
    }
  },

  openProjectFolder: async (projectPath: string) => {
    try {
      await window.projectAPI.openProjectFolder(projectPath);
    } catch (error) {
      console.error("Failed to open project folder:", error);
      set({ 
        errorMessage: error instanceof Error ? error.message : "Failed to open project folder"
      });
    }
  }
})); 