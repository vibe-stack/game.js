import { GameWorld, SceneLoader, SceneSerializer, CharacterController, Entity, AssetManager } from "@/models";
import useGameStudioStore from "@/stores/game-studio-store";
import { materialSystem } from "@/services/material-system";
import { EditorCameraService } from "./editor-camera-service";
import { SelectionManager } from "./selection-manager";
import { TransformControlsManager } from "./transform-controls-manager";
import { HelperManager } from "./helper-manager";
import { ScriptLoaderService } from "@/services/script-loader-service";

export class GameWorldService {
  private gameWorld: GameWorld | null = null;
  private sceneLoader: SceneLoader;
  private sceneSerializer: SceneSerializer;
  private assetManager: AssetManager;
  private currentSceneData: any = null;
  private editorCameraService: EditorCameraService;
  private selectionManager: SelectionManager;
  private transformControlsManager: TransformControlsManager;
  private helperManager: HelperManager;
  private characterControllers: Map<string, CharacterController> = new Map();
  private prePlaActiveCamera: string | null = null; // Store active camera before gameplay
  private scriptLoaderService: ScriptLoaderService;

  constructor() {
    this.assetManager = new AssetManager();
    this.sceneLoader = new SceneLoader(this.assetManager);
    this.sceneSerializer = new SceneSerializer();
    this.editorCameraService = new EditorCameraService();
    this.selectionManager = new SelectionManager();
    this.transformControlsManager = new TransformControlsManager();
    this.helperManager = new HelperManager();
    this.scriptLoaderService = ScriptLoaderService.getInstance();
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    const { setInitialized, setError, setGameState, currentProject } = useGameStudioStore.getState();

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
      
      // Initialize script loader service with asset server URL
      // Initialize script loader service
      await this.scriptLoaderService.initialize();
      
      // Start watching project scripts if we have a current project
      if (currentProject) {
        await this.scriptLoaderService.startWatchingProject(currentProject.path);
        
        // Load scripts into the script manager
        const scriptManager = this.gameWorld.getScriptManager();
        if (scriptManager) {
          await this.scriptLoaderService.loadScriptsIntoManager(scriptManager, currentProject.path);
        }
      }
      
      // Initialize editor camera service
      this.editorCameraService.initialize(this.gameWorld, canvas);
      
      // Set editor camera as default active camera for viewport
      this.editorCameraService.switchToEditorCamera();

      // Initialize selection manager
      this.selectionManager.initialize(this.gameWorld);
      
      // Initialize helper manager
      this.helperManager.initialize(this.gameWorld);
      
      // Initialize transform controls manager
      await this.transformControlsManager.initialize(this.gameWorld, canvas);
      
      // Connect orbit controls to transform controls manager
      const orbitControls = this.editorCameraService.getOrbitControls();
      if (orbitControls) {
        this.transformControlsManager.setOrbitControls(orbitControls);
      }
      
      // Update transform controls camera
      const activeCamera = this.gameWorld.getCameraManager().getActiveCamera();
      if (activeCamera) {
        this.transformControlsManager.updateCamera(activeCamera);
      }
    
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
  const { setCurrentScene, setGameState, currentProject } = useGameStudioStore.getState();

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
      // Load scripts BEFORE loading the scene so entities can reattach them
      if (currentProject) {
        const scriptManager = this.gameWorld.getScriptManager();
        if (scriptManager) {
          await this.scriptLoaderService.loadScriptsIntoManager(scriptManager, currentProject.path);
        }
      }
      
      await this.sceneLoader.loadScene(this.gameWorld, sceneData);
      this.currentSceneData = sceneData; // Keep a copy for reset
      
      // Reinitialize editor camera service after scene reload
      this.editorCameraService.initialize(this.gameWorld, canvas);
      
      // Reinitialize selection manager after scene reload
      this.selectionManager.initialize(this.gameWorld);
      
      // Reinitialize helper manager after scene reload
      this.helperManager.initialize(this.gameWorld);
      
      // Reinitialize transform controls manager AFTER scene is loaded (so entities exist)
      await this.transformControlsManager.initialize(this.gameWorld, canvas);
      
      // Connect orbit controls to transform controls manager
      const orbitControls = this.editorCameraService.getOrbitControls();
      if (orbitControls) {
        this.transformControlsManager.setOrbitControls(orbitControls);
      }
      
      // Discover and update available cameras in the store
      this.updateAvailableCameras();
      
      // Set editor camera as active by default after scene load
      this.editorCameraService.switchToEditorCamera();
      
      // Update transform controls camera
      const activeCamera = this.gameWorld.getCameraManager().getActiveCamera();
      if (activeCamera) {
        this.transformControlsManager.updateCamera(activeCamera);
      }
      
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
  if (!this.gameWorld) return;

  // FIXED: Clean up duplicate materials before saving
  const duplicatesRemoved = materialSystem.cleanupDuplicateMaterials();
  if (duplicatesRemoved > 0) {
    console.log(`Cleaned up ${duplicatesRemoved} duplicate materials before saving`);
  }

  const { currentProject, currentScene, sceneFileName } = useGameStudioStore.getState();
  if (!currentProject) return;
  if (!currentScene) return;

  try {
    const serializer = new SceneSerializer();
    const serializedScene = await serializer.serializeScene(this.gameWorld, currentScene.name);
    
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
    
    await window.projectAPI.saveScene(currentProject.path, filenameToUse, serializedScene);
    useGameStudioStore.getState().setCurrentScene(serializedScene);
  } catch (error) {
    console.error("Failed to save scene:", error);
    throw error;
  }
}

/**
 * Clean up duplicate materials in the material system
 */
cleanupDuplicateMaterials(): number {
  return materialSystem.cleanupDuplicateMaterials();
}

/**
 * Get material system statistics for debugging
 */
getMaterialSystemStats(): { totalMaterials: number; materialsByCategory: Record<string, number> } {
  const allMaterials = materialSystem.getAllMaterialDefinitions();
  const totalMaterials = allMaterials.length;
  
  const materialsByCategory: Record<string, number> = {};
  allMaterials.forEach(material => {
    const category = material.metadata.category || 'uncategorized';
    materialsByCategory[category] = (materialsByCategory[category] || 0) + 1;
  });

  return { totalMaterials, materialsByCategory };
}

play(): void {
  if (this.gameWorld) {
    // Store the currently active camera before gameplay starts
    const { activeCamera } = useGameStudioStore.getState();
    this.prePlaActiveCamera = activeCamera;
    
    this.gameWorld.start();
    useGameStudioStore.getState().setGameState('playing');
    this.selectionManager.onGameStateChanged('playing');
    
    // Hide helpers when playing
    this.helperManager.setVisible(false);
    
    // Enable character controllers
    this.enableCharacterControllers();
  }
}

pause(): void {
  if (this.gameWorld) {
    this.gameWorld.pause();
    useGameStudioStore.getState().setGameState('paused');
    this.selectionManager.onGameStateChanged('paused');
    
    // Show helpers when paused (not playing)
    this.helperManager.setVisible(true);
  }
}

resume(): void {
  if (this.gameWorld) {
    this.gameWorld.resume();
    useGameStudioStore.getState().setGameState('playing');
    this.selectionManager.onGameStateChanged('playing');
    
    // Hide helpers when playing
    this.helperManager.setVisible(false);
  }
}

reset(): void {
  if (this.gameWorld) {
    this.gameWorld.reset();
    useGameStudioStore.getState().setGameState('initial');
    this.selectionManager.onGameStateChanged('initial');
    
    // Show helpers when not playing
    this.helperManager.setVisible(true);
    
    // Disable character controllers first (this removes their cameras)
    this.disableCharacterControllers();
    
    // Restore the previously active camera if we have it, otherwise use editor camera
    if (this.prePlaActiveCamera) {
      const success = this.switchToCamera(this.prePlaActiveCamera);
      if (!success) {
        // If switching back to previous camera failed, fallback to editor camera
        this.editorCameraService.switchToEditorCamera();
      }
      this.prePlaActiveCamera = null; // Clear the stored camera
    } else {
      // No previous camera stored, default to editor camera
      this.editorCameraService.switchToEditorCamera();
    }
    
    // Update available cameras to remove any runtime cameras
    this.updateAvailableCameras();
    
    // Refresh helpers after camera changes
    this.helperManager.onCamerasChanged();
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

  // Stop watching project scripts
  const { currentProject } = useGameStudioStore.getState();
  if (currentProject) {
    this.scriptLoaderService.stopWatchingProject(currentProject.path);
  }

  try {
    if (this.gameWorld) {
      this.gameWorld.dispose();
      this.gameWorld = null;
    }
    this.editorCameraService.dispose();
    this.selectionManager.dispose();
    this.transformControlsManager.dispose();
    this.helperManager.dispose();
    this.assetManager.dispose();
  } catch (error) {
    console.error("Failed to dispose game world:", error);
  }
}

getGameWorld(): GameWorld | null {
  return this.gameWorld;
}

getSelectionManager(): SelectionManager {
  return this.selectionManager;
}

getTransformControlsManager(): TransformControlsManager {
  return this.transformControlsManager;
}

getHelperManager(): HelperManager {
  return this.helperManager;
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
  
  // Update camera helpers when cameras change
  this.helperManager.onCamerasChanged();
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
      // Update transform controls camera
      const activeCamera = this.gameWorld.getCameraManager().getActiveCamera();
      if (activeCamera) {
        this.transformControlsManager.updateCamera(activeCamera);
      }
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
      // Update transform controls camera
      const activeCamera = this.gameWorld.getCameraManager().getActiveCamera();
      if (activeCamera) {
        this.transformControlsManager.updateCamera(activeCamera);
      }
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
    
    // Update helpers
    this.helperManager.update();
    
    // Update character controllers during gameplay
    const { gameState } = useGameStudioStore.getState();
    if (gameState === 'playing') {
      // Calculate delta time (you might want to get this from the game world)
      const deltaTime = 1/60; // Assuming 60fps, ideally get this from game world
      this.updateCharacterControllers(deltaTime);
    }
  }
}

/**
 * Delete an entity by ID with proper cleanup
 */
deleteEntity(entityId: string): boolean {
  if (!this.gameWorld) return false;

  const entitiesRegistry = this.gameWorld.getRegistryManager().getRegistry<Entity>("entities");
  if (!entitiesRegistry) return false;

  const entity = entitiesRegistry.get(entityId);
  if (!entity) return false;

  // Destroy the entity (this handles physics, scripts, and other cleanup)
  entity.destroy();
  
  // Remove from registry
  entitiesRegistry.remove(entityId);

  // Notify helper manager about entity removal
  this.helperManager.onEntityRemoved(entityId);

  // If this entity was selected, clear the selection
  const { selectedEntity, setSelectedEntity } = useGameStudioStore.getState();
  if (selectedEntity === entityId) {
    setSelectedEntity(null);
  }

  return true;
}
}