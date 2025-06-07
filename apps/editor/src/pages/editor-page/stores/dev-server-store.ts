import { create } from 'zustand';
import { DevServerInfo } from '../types';

interface DevServerStore {
  isRunning: boolean;
  isStarting: boolean;
  isInstalling: boolean;
  serverInfo: DevServerInfo | undefined;
  errorMessage: string | null;
  
  setIsRunning: (running: boolean) => void;
  setIsStarting: (starting: boolean) => void;
  setIsInstalling: (installing: boolean) => void;
  setServerInfo: (info: DevServerInfo | undefined) => void;
  setErrorMessage: (message: string | null) => void;
  checkServerStatus: (projectName: string) => Promise<void>;
  startDevServer: (projectName: string) => Promise<void>;
  stopDevServer: (projectName: string) => Promise<void>;
  installPackages: (projectName: string) => Promise<void>;
}

export const useDevServerStore = create<DevServerStore>((set) => ({
  isRunning: false,
  isStarting: false,
  isInstalling: false,
  serverInfo: undefined,
  errorMessage: null,

  setIsRunning: (running) => set({ isRunning: running }),
  setIsStarting: (starting) => set({ isStarting: starting }),
  setIsInstalling: (installing) => set({ isInstalling: installing }),
  setServerInfo: (info) => set({ serverInfo: info }),
  setErrorMessage: (message) => set({ errorMessage: message }),

  checkServerStatus: async (projectName: string) => {
    try {
      const isRunning = await window.projectAPI.isDevServerRunning(projectName);
      set({ isRunning });

      if (isRunning) {
        const info = await window.projectAPI.getServerInfo(projectName);
        set({ serverInfo: info, errorMessage: null });
      } else {
        set({ serverInfo: undefined });
      }
    } catch (error) {
      console.error("Failed to check server status:", error);
      set({ 
        errorMessage: error instanceof Error ? error.message : "Failed to check server status"
      });
    }
  },

  startDevServer: async (projectName: string) => {
    set({ isStarting: true, errorMessage: null });
    try {
      const info = await window.projectAPI.startDevServer(projectName);
      set({ 
        isRunning: true, 
        serverInfo: info, 
        isStarting: false 
      });
    } catch (error) {
      console.error("Failed to start dev server:", error);
      set({
        errorMessage: error instanceof Error ? error.message : "Failed to start dev server",
        isRunning: false,
        isStarting: false
      });
    }
  },

  stopDevServer: async (projectName: string) => {
    set({ errorMessage: null });
    try {
      await window.projectAPI.stopDevServer(projectName);
      set({ 
        isRunning: false, 
        serverInfo: undefined 
      });
    } catch (error) {
      console.error("Failed to stop dev server:", error);
      set({
        errorMessage: error instanceof Error ? error.message : "Failed to stop dev server"
      });
    }
  },

  installPackages: async (projectName: string) => {
    set({ isInstalling: true, errorMessage: null });
    try {
      await window.projectAPI.installPackages(projectName);
    } catch (error) {
      console.error("Failed to install packages:", error);
      set({
        errorMessage: error instanceof Error ? error.message : "Failed to install packages"
      });
    } finally {
      set({ isInstalling: false });
    }
  }
})); 