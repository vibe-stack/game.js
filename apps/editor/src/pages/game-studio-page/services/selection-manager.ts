import * as THREE from "three/webgpu";
import { Entity } from "@/models";
import { GameWorld } from "@/models/game-world";
import useGameStudioStore from "@/stores/game-studio-store";

export class SelectionManager {
  private gameWorld: GameWorld | null = null;
  private selectedEntity: Entity | null = null;
  private selectionHelper: THREE.BoxHelper | null = null;
  private isInitialized = false;

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

    // Set up onClick handler that only works when not in PLAY mode
    entity.onClick((event) => {
      const { gameState } = useGameStudioStore.getState();
      
      // Only handle clicks when not in PLAY mode
      if (gameState !== "playing") {
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
    // Clear previous selection visual
    this.clearSelectionHelper();

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
    }
  }

  private createSelectionHelper(entity: Entity): void {
    if (!entity || !this.gameWorld) return;

    // Find the mesh in the entity to create AABB helper
    const mesh = this.findMeshInEntity(entity);
    if (!mesh) return;

    // Create BoxHelper for AABB visualization
    this.selectionHelper = new THREE.BoxHelper(mesh, 0xff8800); // Orange color
    this.selectionHelper.name = "selection-helper";
    
    // Add to scene
    this.gameWorld.getScene().add(this.selectionHelper);
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
      this.gameWorld.getScene().remove(this.selectionHelper);
      this.selectionHelper.dispose();
      this.selectionHelper = null;
    }
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
    }
  }

  // Method to be called when game state changes
  onGameStateChanged(gameState: "initial" | "playing" | "paused"): void {
    if (gameState === "playing") {
      // Hide selection helper when playing
      this.clearSelectionHelper();
    } else if (this.selectedEntity) {
      // Show selection helper when not playing
      this.createSelectionHelper(this.selectedEntity);
    }
  }

  getSelectedEntity(): Entity | null {
    return this.selectedEntity;
  }

  dispose(): void {
    this.clearSelectionHelper();
    this.gameWorld = null;
    this.selectedEntity = null;
    this.isInitialized = false;
  }
} 