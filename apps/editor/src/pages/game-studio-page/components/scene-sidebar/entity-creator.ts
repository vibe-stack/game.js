import * as THREE from "three/webgpu";
import { Sphere } from "@/models/primitives/sphere";
import { Entity } from "@/models";
import { GameWorldService } from "../../services/game-world-service";

export class EntityCreator {
  private static entityCounter = 1;

  static async createEntity(entityType: string, gameWorldService: GameWorldService): Promise<Entity | null> {
    const gameWorld = gameWorldService.getGameWorld();
    if (!gameWorld) {
      throw new Error("Game world not initialized");
    }

    const scene = gameWorld.getScene();
    const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    
    if (!entitiesRegistry) {
      throw new Error("Entities registry not found");
    }

    let entity: Entity | null = null;

    switch (entityType) {
      case "sphere":
        entity = new Sphere({
          name: `Sphere ${this.entityCounter++}`,
          position: new THREE.Vector3(0, 2, 0), // Spawn slightly above ground
          castShadow: true,
          receiveShadow: true,
        });
        break;
      
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    if (entity) {
      // Add entity to the scene
      scene.add(entity);
      
      // Register entity in the registry
      entitiesRegistry.add(entity.entityId, entity.entityName, entity, {
        tags: entity.metadata.tags,
        type: entity.metadata.type,
      });
      
      console.log(`Created and registered ${entityType} entity:`, entity.entityId);
      return entity;
    }

    return null;
  }

  static resetCounter(): void {
    this.entityCounter = 1;
  }
} 