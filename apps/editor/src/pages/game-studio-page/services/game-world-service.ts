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
    const { setGameWorld, setInitialized, setError, setGameState } = useGameStudioStore.getState();

    try {
      this.gameWorld = new GameWorld({
        canvas,
        enablePhysics: true,
        antialias: true,
        shadowMapEnabled: true,
      });

      await this.gameWorld.initialize();
      setGameWorld(this.gameWorld);
      setInitialized(true);
      setGameState("initial"); // Ensure game starts in initial/stopped state
      setError(null);
    } catch (error) {
      console.error("Failed to initialize game world:", error);
      setError(`Failed to initialize: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  async loadScene(sceneData: any): Promise<void> {
    if (!this.gameWorld) {
      throw new Error("Game world not initialized");
    }

    const { setCurrentScene, setGameState } = useGameStudioStore.getState();

    try {
      console.log("Loading scene:", sceneData.name);
      console.log("Scene data entities:", sceneData.entities?.map((e: any) => ({ name: e.name, type: e.type })));
      
      if (SceneLoader.validateSceneData(sceneData)) {
        // Stop the game world before loading new scene to prevent duplication
        if (this.gameWorld.isRunningState()) {
          this.gameWorld.stop();
        }
        
        await this.sceneLoader.loadScene(this.gameWorld, sceneData);
        this.currentSceneData = sceneData;
        setCurrentScene(sceneData as any);
        setGameState("initial"); // Ensure game remains in initial state after loading
      } else {
        throw new Error("Invalid scene data format");
      }
    } catch (error) {
      console.error("Failed to load scene:", error);
      throw error;
    }
  }

  async loadDefaultScene(): Promise<void> {
    if (!this.gameWorld) {
      throw new Error("Game world not initialized");
    }

    try {
      const defaultSceneData = SceneLoader.getDefaultSceneData();
      await this.loadScene(defaultSceneData);
    } catch (error) {
      console.error("Failed to load default scene:", error);
      throw error;
    }
  }

  async saveScene(): Promise<void> {
    if (!this.gameWorld) {
      throw new Error("Game world not initialized");
    }

    const { currentProject, currentScene } = useGameStudioStore.getState();

    if (!currentProject || !currentScene) {
      throw new Error("No project or scene loaded");
    }

    try {
      const sceneData = await this.sceneSerializer.serializeScene(
        this.gameWorld,
        currentScene.name || "Untitled Scene"
      );

      // TODO: Implement actual scene saving when project API is available
      console.log("Saving scene:", sceneData);
    } catch (error) {
      console.error("Failed to save scene:", error);
      throw error;
    }
  }

  start(): void {
    if (this.gameWorld) {
      this.gameWorld.start();
    }
  }

  stop(): void {
    if (this.gameWorld) {
      this.gameWorld.stop();
    }
  }

  pause(): void {
    if (this.gameWorld) {
      this.gameWorld.pause();
    }
  }

  resume(): void {
    if (this.gameWorld) {
      this.gameWorld.resume();
    }
  }

  reset(): void {
    if (this.gameWorld) {
      // Stop the simulation first
      this.gameWorld.stop();
      
      // Optionally reload the current scene to ensure clean state
      if (this.currentSceneData) {
        try {
          this.sceneLoader.loadScene(this.gameWorld, this.currentSceneData);
          console.log("Scene reloaded for reset");
        } catch (error) {
          console.error("Failed to reload scene during reset:", error);
        }
      }
    }
  }

  isRunning(): boolean {
    return this.gameWorld ? this.gameWorld.isRunningState() : false;
  }

  isPaused(): boolean {
    return this.gameWorld ? this.gameWorld.isPausedState() : false;
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