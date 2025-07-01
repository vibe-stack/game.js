import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Entity, GameWorld } from "@/models";
import { GameProject, SceneData } from "@/types/project";
import { GameWorldService } from "@/pages/game-studio-page/services/game-world-service";

interface GameStudioState {
  currentProject: GameProject | null;
  currentScene: SceneData | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  editorMode: "select" | "move" | "rotate" | "scale";
  viewportMode: "orbit" | "camera";
  gameState: "initial" | "playing" | "paused";
  availableCameras: Entity[];
  activeCamera: string | null;
  isTransitioning: boolean;
  isSaving: boolean;
  isExporting: boolean;
  availableScenes: string[];
  currentSceneName: string | null;
  shouldLoadScene: boolean;
  gameWorldService: GameWorldService | null;
  selectedEntity: string | null;
  materialEditorOpen: boolean;
  materialEditorEntity: string | null;
  characterControllerEditorOpen: boolean;
  characterControllerEditorEntity: string | null;
  sceneFileName: string | null;
  shaderEditorOpen: boolean;
  shaderEditorEntity: string | null;
  selectedShaderId: string | null;
  // Actions - These should mostly set state, logic is in services/models
  setCurrentProject: (project: GameProject | null) => void;
  setCurrentScene: (scene: SceneData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  setEditorMode: (mode: "select" | "move" | "rotate" | "scale") => void;
  setViewportMode: (mode: "orbit" | "camera") => void;
  setGameState: (state: "initial" | "playing" | "paused") => void;
  setAvailableCameras: (cameras: Entity[]) => void;
  setActiveCamera: (cameraId: string | null) => void;
  setTransitioning: (transitioning: boolean) => void;
  setSaving: (saving: boolean) => void;
  setExporting: (exporting: boolean) => void;
  setAvailableScenes: (scenes: string[]) => void;
  setCurrentSceneName: (sceneName: string | null) => void;
  setShouldLoadScene: (should: boolean) => void;
  setGameWorldService: (service: GameWorldService | null) => void;
  setSelectedEntity: (entityId: string | null) => void;
  loadScene: (sceneName: string) => void;
  loadDefaultScene: () => void;
  setMaterialEditorOpen: (open: boolean) => void;
  setMaterialEditorEntity: (entityId: string | null) => void;
  setCharacterControllerEditorOpen: (open: boolean) => void;
  setCharacterControllerEditorEntity: (entityId: string | null) => void;
  setSceneFileName: (fileName: string | null) => void;
  setShaderEditorOpen: (open: boolean) => void;
  setShaderEditorEntity: (entityId: string | null) => void;
  setSelectedShaderId: (shaderId: string | null) => void;
  // Game control actions - These trigger service calls and update state
  playGame: () => void;
  pauseGame: () => void;
  resetGame: () => void;
  resumeGame: () => void;
}

const useGameStudioStore = create<GameStudioState>()(
  subscribeWithSelector((set, get) => ({
    currentProject: null,
    currentScene: null,
    isLoading: true,
    error: null,
    isInitialized: false,
    editorMode: "select",
    viewportMode: "orbit",
    gameState: "initial",
    availableCameras: [],
    activeCamera: null,
    isTransitioning: false,
    isSaving: false,
    isExporting: false,
    availableScenes: [],
    currentSceneName: null,
    shouldLoadScene: false,
    gameWorldService: null,
    selectedEntity: null,
    materialEditorOpen: false,
    materialEditorEntity: null,
    characterControllerEditorOpen: false,
    characterControllerEditorEntity: null,
    sceneFileName: null,
    shaderEditorOpen: false,
    shaderEditorEntity: null,
    selectedShaderId: null,

    // Basic Setters
    setCurrentProject: (project) => {
      const availableScenes = project?.scenes || [];
      set({ currentProject: project, availableScenes: availableScenes });
    },
    setCurrentScene: (scene) => set({ currentScene: scene }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setInitialized: (initialized) => set({ isInitialized: initialized }),
    setEditorMode: (mode) => set({ editorMode: mode }),
    setViewportMode: (mode) => set({ viewportMode: mode }),
    setGameState: (state) => set({ gameState: state }),
    setAvailableCameras: (cameras) => set({ availableCameras: cameras }),
    setActiveCamera: (cameraId) => set({ activeCamera: cameraId }),
    setTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
    setSaving: (saving) => set({ isSaving: saving }),
    setExporting: (exporting) => set({ isExporting: exporting }),
    setAvailableScenes: (scenes) => set({ availableScenes: scenes }),
    setCurrentSceneName: (sceneName) => set({ currentSceneName: sceneName }),
    setShouldLoadScene: (should) => set({ shouldLoadScene: should }),
    setGameWorldService: (service) => set({ gameWorldService: service }),
    setSelectedEntity: (entityId) => set({ selectedEntity: entityId }),
    setMaterialEditorOpen: (open) => set({ materialEditorOpen: open }),
    setMaterialEditorEntity: (entityId) => set({ materialEditorEntity: entityId }),
    setCharacterControllerEditorOpen: (open) => set({ characterControllerEditorOpen: open }),
    setCharacterControllerEditorEntity: (entityId) => set({ characterControllerEditorEntity: entityId }),
    setSceneFileName: (fileName) => set({ sceneFileName: fileName }),
    setShaderEditorOpen: (open) => set({ shaderEditorOpen: open }),
    setShaderEditorEntity: (entityId) => set({ shaderEditorEntity: entityId }),
    setSelectedShaderId: (shaderId) => set({ selectedShaderId: shaderId }),
    loadScene: (sceneName) => {
      set({ currentSceneName: sceneName, shouldLoadScene: true, isLoading: true, error: null });
    },

    loadDefaultScene: () => {
      set({ currentSceneName: "Demo Scene", shouldLoadScene: true, isLoading: true, error: null });
    },

    // Game Controls - Simplified to just set state, logic is in GameWorldService
    playGame: () => set({ gameState: "playing" }),
    pauseGame: () => set({ gameState: "paused" }),
    resetGame: () => set({ gameState: "initial" }),
    resumeGame: () => set({ gameState: "playing" }),
  }))
);

export default useGameStudioStore;