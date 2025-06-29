import * as THREE from "three/webgpu";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { Entity } from "@/models";
import { GameWorld } from "@/models/game-world";
import useGameStudioStore from "@/stores/game-studio-store";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class TransformControlsManager {
  private gameWorld: GameWorld | null = null;
  private transformControls: any | null = null;
  private isInitialized = false;
  private currentEntity: Entity | null = null;
  private currentMode: "translate" | "rotate" | "scale" | null = null;
  private isTransforming = false;
  private orbitControls: OrbitControls | null = null; // Reference to orbit controls to disable during transform

  constructor() {}

  async initialize(gameWorld: GameWorld, canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      this.dispose(); // Clean up existing instance
    }
    this.gameWorld = gameWorld;

    const camera = gameWorld.getCameraManager().getActiveCamera();
    if (!camera) {
      console.error("No active camera found for transform controls");
      return;
    }

    try {
      // Wait for the WebGPU renderer to be fully initialized
      const renderer = gameWorld.getRenderer();
      if (renderer && renderer.info) {
        // Wait a bit more to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.transformControls = new TransformControls(camera, canvas);
      this.transformControls.setSpace("world");
      this.transformControls.setSize(0.8);
      
      // Add the transform controls helper to the scene (required since Three.js r169+)
      // TransformControls is no longer a THREE.Object3D and must be added via getHelper()
      this.gameWorld.getScene().add(this.transformControls.getHelper());

      this.setupEventListeners();
      this.setupStoreListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize transform controls:", error);
      return;
    }
  }

  private setupEventListeners(): void {
    if (!this.transformControls) return;

    this.transformControls.addEventListener("dragging-changed", (event: any) => {
      this.isTransforming = event.value;
      
      if (this.orbitControls) {
        this.orbitControls.enabled = !event.value;
      }

      // When transformation ends, ensure final state is properly saved
      if (!event.value && this.currentEntity) {
        // Final update to ensure all transforms are applied
        this.updateEntityTransform();
      }
    });

    this.transformControls.addEventListener("objectChange", () => {
      if (this.currentEntity && this.isTransforming) {
        this.updateEntityTransform();
      }
    });
  }

  private setupStoreListeners(): void {
    // Listen for selected entity changes
    useGameStudioStore.subscribe(
      (state) => state.selectedEntity,
      (selectedEntityId) => {
        this.updateSelectedEntity(selectedEntityId);
      }
    );

    // Listen for editor mode changes
    useGameStudioStore.subscribe(
      (state) => state.editorMode,
      (editorMode) => {
        this.updateTransformMode(editorMode);
      }
    );

    // Listen for game state changes
    useGameStudioStore.subscribe(
      (state) => state.gameState,
      (gameState) => {
        this.handleGameStateChange(gameState);
      }
    );
  }

  private updateSelectedEntity(selectedEntityId: string | null): void {
    if (!this.transformControls || !this.gameWorld) {
      return;
    }

    // Detach from current entity
    this.transformControls.detach();
    this.currentEntity = null;

    if (!selectedEntityId) {
      return;
    }

    // Find the selected entity
    const registryManager = this.gameWorld.getRegistryManager();
    if (!registryManager) {
      return;
    }
    
    const entitiesRegistry = registryManager.getRegistry<Entity>("entities");
    if (!entitiesRegistry) {
      return;
    }

    const entity = entitiesRegistry.get(selectedEntityId);
    if (!entity) {
      return;
    }

    this.currentEntity = entity;

    // Attach transform controls to the entity
    this.transformControls.attach(entity);

    // Update the transform mode based on current editor mode
    const { editorMode } = useGameStudioStore.getState();
    this.updateTransformMode(editorMode);
  }

  private updateTransformMode(editorMode: "select" | "move" | "rotate" | "scale"): void {
    if (!this.transformControls || !this.currentEntity) {
      return;
    }

    const { gameState } = useGameStudioStore.getState();
    
    // Only show transform controls when not playing and not in select mode
    if (gameState === "playing" || editorMode === "select") {
      // Hide the helper object that was added to the scene
      const helper = this.transformControls.getHelper();
      if (helper) {
        helper.visible = false;
      }
      this.currentMode = null;
      return;
    }

    // Show and configure transform controls based on editor mode
    const helper = this.transformControls.getHelper();
    if (helper) {
      helper.visible = true;
    }
    
    switch (editorMode) {
      case "move":
        this.transformControls.setMode("translate");
        this.currentMode = "translate";
        break;
      case "rotate":
        this.transformControls.setMode("rotate");
        this.currentMode = "rotate";
        break;
      case "scale":
        this.transformControls.setMode("scale");
        this.currentMode = "scale";
        break;
      default:
        // Hide for unknown modes
        if (helper) {
          helper.visible = false;
        }
        this.currentMode = null;
        break;
    }
  }

  private handleGameStateChange(gameState: "initial" | "playing" | "paused"): void {
    if (!this.transformControls) return;

    // Hide transform controls when playing
    if (gameState === "playing") {
      this.transformControls.visible = false;
    } else {
      // Update visibility based on current editor mode
      const { editorMode } = useGameStudioStore.getState();
      this.updateTransformMode(editorMode);
    }
  }

  private updateEntityTransform(): void {
    if (!this.currentEntity) return;

    // Force update the entity's matrix world to ensure transforms are applied
    this.currentEntity.updateMatrixWorld(true);

    // Update physics if the entity has physics
    if (this.currentEntity.hasPhysics()) {
      this.currentEntity.syncPhysicsFromTransform();
      // Force update debug renderer to show updated physics state
      if (this.gameWorld?.isPhysicsDebugRenderEnabled()) {
        this.gameWorld.forceUpdatePhysicsDebugRender();
      }
    }

    // CRITICAL FIX: Update the GameWorld's entity snapshot so transforms persist through game play/reset cycles
    if (this.gameWorld) {
      const sceneSnapshot = (this.gameWorld as any).sceneSnapshot;
      if (sceneSnapshot && sceneSnapshot instanceof Map) {
        sceneSnapshot.set(this.currentEntity.entityId, {
          position: this.currentEntity.position.clone(),
          rotation: this.currentEntity.rotation.clone(),
          scale: this.currentEntity.scale.clone(),
          visible: this.currentEntity.visible,
        });
      }
    }

    // Emit change event for React synchronization
    (this.currentEntity as any).emitChange();

    // Force update the entity's metadata timestamp to ensure it's considered "modified"
    this.currentEntity.metadata.updated = Date.now();
  }

  // Method to set orbit controls reference to disable during transform
  setOrbitControls(orbitControls: any): void {
    this.orbitControls = orbitControls;
  }

  // Method to update camera when switching cameras
  updateCamera(camera: THREE.Camera): void {
    if (this.transformControls) {
      this.transformControls.camera = camera;
    }
  }

  // Method to get current transform controls for external access
  getTransformControls(): any {
    return this.transformControls;
  }

  // Method to check if currently transforming
  isCurrentlyTransforming(): boolean {
    return this.isTransforming;
  }

  dispose(): void {
    if (this.transformControls && this.gameWorld) {
      try {
        // Remove the helper from the scene
        this.gameWorld.getScene().remove(this.transformControls.getHelper());
        this.transformControls.dispose();
      } catch (error) {
        console.error("Error disposing transform controls:", error);
      }
      this.transformControls = null;
    }
    
    this.gameWorld = null;
    this.currentEntity = null;
    this.currentMode = null;
    this.isTransforming = false;
    this.orbitControls = null;
    this.isInitialized = false;
  }
} 