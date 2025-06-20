import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { GameWorld, Entity } from "@/models";
import { GameProject, SceneData } from "@/types/project";

interface GameStudioState {
  // Project and Scene State
  currentProject: GameProject | null;
  currentScene: SceneData | null;
  isLoading: boolean;
  error: string | null;

  // Game World
  gameWorld: GameWorld | null;
  isInitialized: boolean;

  // UI State
  editorMode: "select" | "move" | "rotate" | "scale";
  viewportMode: "orbit" | "camera";
  gameState: "initial" | "playing" | "paused";
  
  // Camera State
  availableCameras: Entity[];
  activeCamera: string | null;
  isTransitioning: boolean;

  // Export/Save State
  isSaving: boolean;
  isExporting: boolean;

  // Scene Management
  availableScenes: string[];
  currentSceneName: string | null;
  shouldLoadScene: boolean;

  // Actions
  setCurrentProject: (project: GameProject | null) => void;
  setCurrentScene: (scene: SceneData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setGameWorld: (gameWorld: GameWorld | null) => void;
  setInitialized: (initialized: boolean) => void;
  
  // UI Actions
  setEditorMode: (mode: "select" | "move" | "rotate" | "scale") => void;
  setViewportMode: (mode: "orbit" | "camera") => void;
  setGameState: (state: "initial" | "playing" | "paused") => void;
  
  // Camera Actions
  setAvailableCameras: (cameras: Entity[]) => void;
  setActiveCamera: (cameraId: string | null) => void;
  setTransitioning: (transitioning: boolean) => void;
  
  // Export/Save Actions
  setSaving: (saving: boolean) => void;
  setExporting: (exporting: boolean) => void;
  
  // Scene Actions
  setAvailableScenes: (scenes: string[]) => void;
  setCurrentSceneName: (sceneName: string | null) => void;
  setShouldLoadScene: (should: boolean) => void;
  loadScene: (sceneName: string) => void;
  loadDefaultScene: () => void;
  
  // Game Controls
  playGame: () => void;
  pauseGame: () => void;
  resetGame: () => void;
  resumeGame: () => void;
}

const useGameStudioStore = create<GameStudioState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    currentProject: null,
    currentScene: null,
    isLoading: true,
    error: null,
    gameWorld: null,
    isInitialized: false,
    
    // UI State
    editorMode: "select",
    viewportMode: "orbit", 
    gameState: "initial",
    
    // Camera State
    availableCameras: [],
    activeCamera: null,
    isTransitioning: false,
    
    // Export/Save State
    isSaving: false,
    isExporting: false,
    
    // Scene Management
    availableScenes: [],
    currentSceneName: null,
    shouldLoadScene: false,

    // Basic Setters
    setCurrentProject: (project) => {
      let availableScenes: string[] = [];
      if (project) {
        // Try new structure first, then fallback to legacy
        if (project.data?.scenes) {
          availableScenes = Object.keys(project.data.scenes);
        } else if (project.scenes) {
          availableScenes = project.scenes;
        }
      }
      set({ 
        currentProject: project,
        availableScenes: availableScenes
      });
    },
    setCurrentScene: (scene) => set({ currentScene: scene }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setGameWorld: (gameWorld) => set({ gameWorld }),
    setInitialized: (initialized) => set({ isInitialized: initialized }),
    
    // UI Actions
    setEditorMode: (mode) => set({ editorMode: mode }),
    setViewportMode: (mode) => set({ viewportMode: mode }),
    setGameState: (state) => set({ gameState: state }),
    
    // Camera Actions
    setAvailableCameras: (cameras) => set({ availableCameras: cameras }),
    setActiveCamera: (cameraId) => set({ activeCamera: cameraId }),
    setTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
    
    // Export/Save Actions
    setSaving: (saving) => set({ isSaving: saving }),
    setExporting: (exporting) => set({ isExporting: exporting }),
    
    // Scene Actions
    setAvailableScenes: (scenes) => set({ availableScenes: scenes }),
    setCurrentSceneName: (sceneName) => set({ currentSceneName: sceneName }),
    setShouldLoadScene: (should) => set({ shouldLoadScene: should }),
    
    loadScene: (sceneName) => {
      set({ 
        currentSceneName: sceneName,
        shouldLoadScene: true,
        isLoading: true,
        error: null
      });
    },
    
    loadDefaultScene: () => {
      set({ 
        currentSceneName: "Demo Scene",
        shouldLoadScene: true,
        isLoading: true,
        error: null
      });
    },
    
    // Game Controls
    playGame: () => {
      const { gameWorld } = get();
      console.log("playGame", gameWorld);
      if (gameWorld) {
        gameWorld.start();
        set({ gameState: "playing" });
      }
    },
    
    pauseGame: () => {
      const { gameWorld } = get();
      if (gameWorld) {
        gameWorld.pause();
        set({ gameState: "paused" });
      }
    },
    
    resetGame: () => {
      const { gameWorld } = get();
      if (gameWorld) {
        // Stop the game world which will trigger both physics and visual reset
        console.log("Resetting game - restoring physics world and entity transforms...");
        gameWorld.stop();
        set({ gameState: "initial" });
        console.log("Game reset complete - both physics and visual states restored");
      }
    },
    
    resumeGame: () => {
      const { gameWorld } = get();
      if (gameWorld) {
        gameWorld.resume();
        set({ gameState: "playing" });
      }
    },
  }))
);

export default useGameStudioStore; 