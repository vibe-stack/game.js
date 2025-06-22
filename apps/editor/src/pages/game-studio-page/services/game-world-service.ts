import { GameWorld, SceneLoader, SceneSerializer, CharacterController, Entity } from "@/models";
import useGameStudioStore from "@/stores/game-studio-store";
import { EditorCameraService } from "./editor-camera-service";
import { SelectionManager } from "./selection-manager";

export class GameWorldService {
  private gameWorld: GameWorld | null = null;
  private sceneLoader: SceneLoader;
  private sceneSerializer: SceneSerializer;
  private currentSceneData: any = null;
  private editorCameraService: EditorCameraService;
  private selectionManager: SelectionManager;
  private characterControllers: Map<string, CharacterController> = new Map();

  constructor() {
    this.sceneLoader = new SceneLoader();
    this.sceneSerializer = new SceneSerializer();
    this.editorCameraService = new EditorCameraService();
    this.selectionManager = new SelectionManager();
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
      this.gameWorld.enablePhysicsDebugRender();
      this.gameWorld.enablePhysicsDebugRender();
      this.gameWorld.enablePhysicsDebugRender();
      // Initialize editor camera service
      this.editorCameraService.initialize(this.gameWorld, canvas);
      
      // Set editor camera as default active camera for viewport
      this.editorCameraService.switchToEditorCamera();

      // Initialize selection manager
      this.selectionManager.initialize(this.gameWorld);
      
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
        
        // Reinitialize editor camera service after scene reload
        this.editorCameraService.initialize(this.gameWorld, canvas);
        
        // Reinitialize selection manager after scene reload
        this.selectionManager.initialize(this.gameWorld);
        
        // Discover and update available cameras in the store
        this.updateAvailableCameras();
        
        // Set editor camera as active by default after scene load
        this.editorCameraService.switchToEditorCamera();
        
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

  // New method to load scene with filename tracking
  async loadSceneFromFile(sceneData: any, fileName: string): Promise<void> {
    const { setSceneFileName } = useGameStudioStore.getState();
    
    // Store the filename that was used to load this scene
    setSceneFileName(fileName);
    
    // Load the scene normally
    await this.loadScene(sceneData);
  }

  async loadDefaultScene(): Promise<void> {
    if (!this.gameWorld) throw new Error("Game world not initialized");
    const { setSceneFileName } = useGameStudioStore.getState();
    
    // Clear the scene filename since this is a default scene, not loaded from a file
    setSceneFileName(null);
    
    const defaultSceneData = SceneLoader.getDefaultSceneData();
    await this.loadScene(defaultSceneData);
  }

  async saveScene(): Promise<void> {
    if (!this.gameWorld) throw new Error("Game world not initialized");
    const { currentProject, currentScene, sceneFileName } = useGameStudioStore.getState();
    
    if (!currentProject) throw new Error("No project loaded");
    if (!currentScene) throw new Error("No scene loaded");

    try {
      // Serialize the current scene
      const sceneData = await this.sceneSerializer.serializeScene(this.gameWorld, currentScene.name || "Untitled Scene");
      
      // Use the stored scene filename if available, otherwise fall back to scene ID/name
      let filenameToUse = sceneFileName;
      
      if (!filenameToUse) {
        // If no filename is stored (e.g., for default scenes), create a new filename
        filenameToUse = currentScene.id || currentScene.name || "untitled-scene";
        
        // Clean the filename to make it filesystem-safe
        filenameToUse = filenameToUse.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        
        // Store this filename for future saves
        const { setSceneFileName } = useGameStudioStore.getState();
        setSceneFileName(filenameToUse);
      }
      
      // Use the proper IPC method to save the scene
      await window.projectAPI.saveScene(currentProject.path, filenameToUse, sceneData);
      
    } catch (error) {
      console.error("Failed to save scene:", error);
      throw error;
    }
  }

  play(): void {
    if (this.gameWorld) {
      this.gameWorld.start();
      useGameStudioStore.getState().setGameState('playing');
      this.selectionManager.onGameStateChanged('playing');
      
      // Enable character controllers
      this.enableCharacterControllers();
    }
  }

  pause(): void {
    if (this.gameWorld) {
      this.gameWorld.pause();
      useGameStudioStore.getState().setGameState('paused');
      this.selectionManager.onGameStateChanged('paused');
    }
  }

  resume(): void {
    if (this.gameWorld) {
      this.gameWorld.resume();
      useGameStudioStore.getState().setGameState('playing');
      this.selectionManager.onGameStateChanged('playing');
    }
  }

  reset(): void {
    if (this.gameWorld) {
      this.gameWorld.reset();
      useGameStudioStore.getState().setGameState('initial');
      this.selectionManager.onGameStateChanged('initial');
      
      // Disable character controllers
      this.disableCharacterControllers();
    }
  }
  
  stop(): void {
    if (this.gameWorld) {
      this.gameWorld.stop();
      useGameStudioStore.getState().setGameState('initial');
    }
  }

  dispose(): void {
    // Disable character controllers first
    this.disableCharacterControllers();
    
    if (this.gameWorld) {
      this.gameWorld.dispose();
      this.gameWorld = null;
    }
    this.editorCameraService.dispose();
    this.selectionManager.dispose();
  }

  getGameWorld(): GameWorld | null {
    return this.gameWorld;
  }

  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  // Camera Management Methods
  updateAvailableCameras(): void {
    if (!this.gameWorld) return;
    
    const { setAvailableCameras, setActiveCamera } = useGameStudioStore.getState();
    
    // Get all cameras from the camera manager
    const cameraManager = this.gameWorld.getCameraManager();
    const allCameras = cameraManager.getAllCameras();
    
    // Filter out the editor camera to get only scene cameras
    const sceneCameras = allCameras.filter(cam => cam.id !== this.editorCameraService.getEditorCameraId());
    
    // Convert to the format expected by the store (Entity-like objects)
    const availableCameras = sceneCameras.map(cam => ({
      entityId: cam.id,
      entityName: cam.name,
      // Add other properties that might be expected
      metadata: { tags: ['camera'] }
    }));
    
    setAvailableCameras(availableCameras as any);
    
    // Set editor camera as active by default
    setActiveCamera(this.editorCameraService.getEditorCameraId());
  }

  switchToCamera(cameraId: string): boolean {
    if (!this.gameWorld) return false;
    
    const { setActiveCamera, setTransitioning } = useGameStudioStore.getState();
    
    if (cameraId === this.editorCameraService.getEditorCameraId()) {
      // Switch to editor camera
      setTransitioning(true);
      const success = this.editorCameraService.switchToEditorCamera();
      if (success) {
        setActiveCamera(cameraId);
      }
      
      // Simulate transition for smooth UX
      setTimeout(() => {
        setTransitioning(false);
      }, 300);
      
      return success;
    } else {
      // Switch to scene camera
      setTransitioning(true);
      const success = this.editorCameraService.switchToSceneCamera(cameraId);
      if (success) {
        setActiveCamera(cameraId);
      }
      
      // Simulate transition for smooth UX
      setTimeout(() => {
        setTransitioning(false);
      }, 300);
      
      return success;
    }
  }

  isEditorCameraActive(): boolean {
    return this.editorCameraService.isEditorCameraActive();
  }

  // Character controller management
  private enableCharacterControllers(): void {
    if (!this.gameWorld) return;

    // Find all entities with character controllers
    const entitiesRegistry = this.gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) return;
    
    entitiesRegistry.forEach((entity: Entity) => {
      if (entity.hasCharacterControllerEnabled()) {
        const config = entity.getCharacterControllerConfig();
        if (config) {
          try {
            const controller = new CharacterController(
              entity,
              this.gameWorld!.getCameraManager(),
              this.gameWorld!.getPhysicsManager(),
              this.gameWorld!.getInputManager(),
              config
            );
            
            this.characterControllers.set(entity.entityId, controller);
            controller.activateCamera();
          } catch (error) {
            console.error(`Failed to create character controller for entity ${entity.entityId}:`, error);
          }
        }
      }
    });
  }

  private disableCharacterControllers(): void {
    // Dispose all character controllers
    this.characterControllers.forEach(controller => {
      controller.dispose();
    });
    this.characterControllers.clear();
  }

  private updateCharacterControllers(deltaTime: number): void {
    this.characterControllers.forEach(controller => {
      controller.update(deltaTime);
    });
  }

  // Update method to be called in the render loop
  update(): void {
    if (this.gameWorld) {
      this.editorCameraService.update();
      
      // Update character controllers during gameplay
      const { gameState } = useGameStudioStore.getState();
      if (gameState === 'playing') {
        // Calculate delta time (you might want to get this from the game world)
        const deltaTime = 1/60; // Assuming 60fps, ideally get this from game world
        this.updateCharacterControllers(deltaTime);
      }
    }
  }
}