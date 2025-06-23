import * as THREE from "three/webgpu";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { Entity } from "@/models";
import { GameWorld } from "@/models/game-world";
import useGameStudioStore from "@/stores/game-studio-store";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class TransformControlsManager {
  private gameWorld: GameWorld | null = null;
  private transformControls: any | null = null;
  private isInitialized = false;
  private currentEntity: Entity | null = null;
  private currentMode: "translate" | "rotate" | "scale" | null = null;
  private isTransforming = false;
  private orbitControls: OrbitControls | null = null; // Reference to orbit controls to disable during transform

  constructor() {}

  initialize(gameWorld: GameWorld, canvas: HTMLCanvasElement): void {
    if (this.isInitialized) return;
    this.gameWorld = gameWorld;

    const camera = gameWorld.getCameraManager().getActiveCamera();
    if (!camera) {
      console.error("No active camera found for transform controls");
      return;
    }

    this.transformControls = new TransformControls(camera, canvas);
    this.transformControls.setSpace("world");
    this.transformControls.setSize(0.8);
    
    this.gameWorld.getScene().add(this.transformControls as THREE.Object3D);

    this.setupEventListeners();
    this.setupStoreListeners();
    this.isInitialized = true;
  }

  private setupEventListeners(): void {
    if (!this.transformControls) return;

    this.transformControls.addEventListener("dragging-changed", (event: any) => {
      this.isTransforming = event.value;
      
      if (this.orbitControls) {
        this.orbitControls.enabled = !event.value;
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
    if (!this.transformControls || !this.gameWorld) return;

    // Detach from current entity
    this.transformControls.detach();
    this.currentEntity = null;

    if (!selectedEntityId) return;

    // Find the selected entity
    const entitiesRegistry = this.gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) return;

    const entity = entitiesRegistry.get(selectedEntityId);
    if (!entity) return;

    this.currentEntity = entity;

    // Attach transform controls to the entity
    this.transformControls.attach(entity);

    // Update the transform mode based on current editor mode
    const { editorMode } = useGameStudioStore.getState();
    this.updateTransformMode(editorMode);
  }

  private updateTransformMode(editorMode: "select" | "move" | "rotate" | "scale"): void {
    if (!this.transformControls || !this.currentEntity) return;

    const { gameState } = useGameStudioStore.getState();
    
    // Only show transform controls when not playing and not in select mode
    if (gameState === "playing" || editorMode === "select") {
      this.transformControls.visible = false;
      this.currentMode = null;
      return;
    }

    // Show and configure transform controls based on editor mode
    this.transformControls.visible = true;
    console.log("editorMode", editorMode)
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
        this.transformControls.visible = false;
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

    // Get the current transform from the entity (which is now updated by transform controls)
    const position = this.currentEntity.position;
    const rotation = this.currentEntity.rotation;
    const scale = this.currentEntity.scale;

    // Update physics if the entity has physics
    if (this.currentEntity.hasPhysics()) {
      this.currentEntity.syncPhysicsFromTransform();
    }

    (this.currentEntity as any).emitChange();

    console.log(`Entity ${this.currentEntity.entityName} transformed:`, {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
      scale: { x: scale.x, y: scale.y, z: scale.z }
    });
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
      this.transformControls.dispose();
      this.gameWorld.getScene().remove(this.transformControls as THREE.Object3D);
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