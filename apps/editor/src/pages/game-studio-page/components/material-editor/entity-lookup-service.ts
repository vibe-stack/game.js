import { Entity } from "@/models";
import { GameWorldService } from "../../services/game-world-service";

export class EntityLookupService {
  /**
   * Get entity by ID from the game world
   */
  static getEntityById(
    gameWorldService: GameWorldService | null,
    entityId: string
  ): Entity | null {
    if (!gameWorldService) return null;

    const gameWorld = gameWorldService.getGameWorld();
    if (!gameWorld) return null;

    const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) return null;

    return entitiesRegistry.get(entityId) || null;
  }
} 