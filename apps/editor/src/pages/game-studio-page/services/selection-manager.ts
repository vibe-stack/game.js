import * as THREE from "three/webgpu";
import { Entity } from "@/models";
import { GameWorld } from "@/models/game-world";
import useGameStudioStore from "@/stores/game-studio-store";

export class SelectionManager {
  private gameWorld: GameWorld | null = null;
  private selectedEntity: Entity | null = null;
  private selectionHelper: THREE.BoxHelper | null = null;
  private isInitialized = false;
  private entityChangeListener: (() => void) | null = null;
  private animationFrameId: number | null = null;

  constructor() {}

  initialize(gameWorld: GameWorld): void {
    this.gameWorld = gameWorld;
    this.isInitialized = true;
    
    // Set up onClick interactions for all entities
    this.setupEntityInteractions();
    
    // Listen for store changes to update visual selection
    useGameStudioStore.subscribe(
      (state) => state.selectedEntity,
      (selectedEntityId) => {
        this.updateSelection(selectedEntityId);
      }
    );
  }

  private setupEntityInteractions(): void {
    if (!this.gameWorld) return;
    this.refreshEntityInteractions();
  }

  private refreshEntityInteractions(): void {
    if (!this.gameWorld) return;

    const entitiesRegistry = this.gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) return;

    // Set up interactions for all entities (including new ones)
    entitiesRegistry.forEach((entity) => {
      this.setupEntityClickHandler(entity);
    });
  }

  private setupEntityClickHandler(entity: Entity): void {
    if (!entity) return;

    // Set up onClick handler that only works when in SELECT mode and not in PLAY mode
    entity.onClick((event) => {
      const { gameState, editorMode } = useGameStudioStore.getState();
      
      // Only handle clicks when in SELECT mode and not in PLAY mode
      if (gameState !== "playing" && editorMode === "select") {
        this.selectEntity(entity.entityId);
        event.stopPropagation();
      }
    });
  }

  selectEntity(entityId: string | null): void {
    const { setSelectedEntity } = useGameStudioStore.getState();
    setSelectedEntity(entityId);
  }

  private updateSelection(selectedEntityId: string | null): void {
    // Clear previous selection visual and listeners
    try {
      this.clearSelectionHelper();
    } catch (error) {
      console.error("Error clearing selection helper:", error);
    }
    try {
      this.clearEntityChangeListener();
    } catch (error) {
      console.error("Error clearing entity change listener:", error);
    }

    if (!selectedEntityId || !this.gameWorld) {
      this.selectedEntity = null;
      return;
    }

    // Find the selected entity
    const entitiesRegistry = this.gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) return;

    const entity = entitiesRegistry.get(selectedEntityId);
    if (!entity) return;

    this.selectedEntity = entity;

    // Only show selection helper when not in PLAY mode
    const { gameState } = useGameStudioStore.getState();
    if (gameState !== "playing") {
      this.createSelectionHelper(entity);
      this.setupEntityChangeListener(entity);
    }
  }

  private createSelectionHelper(entity: Entity): void {
    if (!entity || !this.gameWorld) return;

    // Clear any existing selection helper first
    this.clearSelectionHelper();

    // Find the mesh in the entity to create AABB helper
    const mesh = this.findMeshInEntity(entity);
    if (!mesh) return;

    // Create BoxHelper for AABB visualization
    this.selectionHelper = new THREE.BoxHelper(mesh, 0xff8800); // Orange color
    this.selectionHelper.name = "selection-helper";
    
    // Add to scene
    this.gameWorld.getScene().add(this.selectionHelper);
  }

  private setupEntityChangeListener(entity: Entity): void {
    // Set up listener for entity changes
    this.entityChangeListener = () => {
      this.updateSelectionHelper();
    };
    
    entity.addChangeListener(this.entityChangeListener);
    
    // Also set up continuous update for real-time changes
    this.startContinuousUpdate();
  }

  private startContinuousUpdate(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    const update = () => {
      if (this.selectedEntity && this.selectionHelper) {
        this.updateSelectionHelper();
      }
      
      // Continue updating if we have a selected entity
      if (this.selectedEntity) {
        this.animationFrameId = requestAnimationFrame(update);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(update);
  }

  private updateSelectionHelper(): void {
    if (!this.selectionHelper || !this.selectedEntity) return;

    const mesh = this.findMeshInEntity(this.selectedEntity);
    if (!mesh) return;

    // Update the BoxHelper to reflect the current mesh transform
    this.selectionHelper.setFromObject(mesh);
    this.selectionHelper.updateMatrixWorld(true);
  }

  private clearEntityChangeListener(): void {
    if (this.entityChangeListener && this.selectedEntity) {
      this.selectedEntity.removeChangeListener(this.entityChangeListener);
      this.entityChangeListener = null;
    }
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private findMeshInEntity(entity: Entity): THREE.Mesh | null {
    // Traverse the entity to find the first mesh
    let foundMesh: THREE.Mesh | null = null;
    
    entity.traverse((child) => {
      if (child instanceof THREE.Mesh && !foundMesh) {
        foundMesh = child;
      }
    });

    return foundMesh;
  }

  private clearSelectionHelper(): void {
    if (this.selectionHelper && this.gameWorld) {
      try {
        this.gameWorld.getScene().remove(this.selectionHelper);
        if (typeof this.selectionHelper.dispose === 'function') {
          this.selectionHelper.dispose();
        }
      } catch (error) {
        console.warn("Error disposing selection helper:", error);
      } finally {
        this.selectionHelper = null;
      }
    }
    
    // Also clean up any orphaned selection helpers in the scene
    this.cleanupOrphanedSelectionHelpers();
  }

  private cleanupOrphanedSelectionHelpers(): void {
    if (!this.gameWorld) return;
    
    const scene = this.gameWorld.getScene();
    const orphanedHelpers: THREE.Object3D[] = [];
    
    scene.traverse((child) => {
      if (child.name === "selection-helper" && child !== this.selectionHelper) {
        orphanedHelpers.push(child);
      }
    });
    
    orphanedHelpers.forEach((helper) => {
      try {
        scene.remove(helper);
        if (typeof (helper as any).dispose === 'function') {
          (helper as any).dispose();
        }
      } catch (error) {
        console.warn("Error disposing orphaned selection helper:", error);
      }
    });
  }

  // Method to be called when entities are added/removed from the scene
  public refreshInteractions(): void {
    if (this.isInitialized) {
      this.refreshEntityInteractions();
    }
  }

  // Method to be called when an entity is added to the scene
  onEntityAdded(entity: Entity): void {
    if (this.isInitialized) {
      this.setupEntityClickHandler(entity);
      // Only create selection helper if this entity is currently selected
      const { selectedEntity } = useGameStudioStore.getState();
      if (selectedEntity === entity.entityId) {
        this.createSelectionHelper(entity);
        this.setupEntityChangeListener(entity);
      }
    }
  }

  // Method to be called when game state changes
  onGameStateChanged(gameState: "initial" | "playing" | "paused"): void {
    if (gameState === "playing") {
      // Hide selection helper when playing
      this.clearSelectionHelper();
      this.clearEntityChangeListener();
    } else if (this.selectedEntity) {
      // Show selection helper when not playing
      this.createSelectionHelper(this.selectedEntity);
      this.setupEntityChangeListener(this.selectedEntity);
    }
  }

  getSelectedEntity(): Entity | null {
    return this.selectedEntity;
  }

  dispose(): void {
    this.clearSelectionHelper();
    this.clearEntityChangeListener();
    this.gameWorld = null;
    this.selectedEntity = null;
    this.isInitialized = false;
  }
} 