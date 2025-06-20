import { GameWorld, SceneLoader, SceneSerializer } from "@/models";
import useGameStudioStore from "@/stores/game-studio-store";

export class GameWorldService {
  private gameWorld: GameWorld | null = null;
  private sceneLoader: SceneLoader;
  private sceneSerializer: SceneSerializer;
  private currentSceneData: any = null;

  constructor() {
    this.sceneLoader = new SceneLoader();
    this.sceneSerializer = new SceneSerializer();
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    const { setInitialized, setError, setGameState } = useGameStudioStore.getState();

    try {
      // Dispose of existing game world if it exists
      if (this.gameWorld) {
        this.gameWorld.dispose();
        this.gameWorld = null;
      }

      this.gameWorld = new GameWorld({
        canvas,
        enablePhysics: true,
        antialias: true,
        shadowMapEnabled: true,
      });

      await this.gameWorld.initialize();
      // The gameWorld instance itself is not stored in zustand to avoid serialization issues.
      // We manage its lifecycle here and interact with it.
      setInitialized(true);
      setGameState("initial");
      setError(null);
    } catch (error) {
      console.error("Failed to initialize game world:", error);
      setError(`Failed to initialize: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  async loadScene(sceneData: any): Promise<void> {
    if (!this.gameWorld) throw new Error("Game world not initialized");
    const { setCurrentScene, setGameState } = useGameStudioStore.getState();

    try {
      // Clear the existing scene completely before loading new one
      // Store reference to canvas before disposing
      const canvas = this.gameWorld.getCanvas();
      this.gameWorld.dispose();
      
      // Reinitialize the game world with the same canvas
      this.gameWorld = new GameWorld({
        canvas,
        enablePhysics: true,
        antialias: true,
        shadowMapEnabled: true,
      });
      
      await this.gameWorld.initialize();

      if (SceneLoader.validateSceneData(sceneData)) {
        await this.sceneLoader.loadScene(this.gameWorld, sceneData);
        this.currentSceneData = sceneData; // Keep a copy for reset
        setCurrentScene(sceneData);
        setGameState("initial");
      } else {
        throw new Error("Invalid scene data format");
      }
    } catch (error) {
      console.error("Failed to load scene:", error);
      throw error;
    }
  }

  async loadDefaultScene(): Promise<void> {
    if (!this.gameWorld) throw new Error("Game world not initialized");
    const defaultSceneData = SceneLoader.getDefaultSceneData();
    await this.loadScene(defaultSceneData);
  }

  async saveScene(): Promise<void> {
    if (!this.gameWorld) throw new Error("Game world not initialized");
    const { currentScene } = useGameStudioStore.getState();
    if (!currentScene) throw new Error("No scene loaded");

    const sceneData = await this.sceneSerializer.serializeScene(this.gameWorld, currentScene.name || "Untitled Scene");
    // TODO: Use projectAPI to write this to a file
    console.log("Saving scene (data):", sceneData);
  }

  play(): void {
    if (this.gameWorld) {
      this.gameWorld.start();
      useGameStudioStore.getState().setGameState('playing');
    }
  }

  pause(): void {
    if (this.gameWorld) {
      this.gameWorld.pause();
      useGameStudioStore.getState().setGameState('paused');
    }
  }

  resume(): void {
    if (this.gameWorld) {
      this.gameWorld.resume();
      useGameStudioStore.getState().setGameState('playing');
    }
  }

  reset(): void {
    if (this.gameWorld) {
      this.gameWorld.reset();
      useGameStudioStore.getState().setGameState('initial');
    }
  }
  
  stop(): void {
    if (this.gameWorld) {
      this.gameWorld.stop();
      useGameStudioStore.getState().setGameState('initial');
    }
  }

  dispose(): void {
    if (this.gameWorld) {
      this.gameWorld.dispose();
      this.gameWorld = null;
    }
  }

  getGameWorld(): GameWorld | null {
    return this.gameWorld;
  }
}