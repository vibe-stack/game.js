import * as THREE from "three/webgpu";
import { Entity, shaderManager } from "@/models";
import useGameStudioStore from "@/stores/game-studio-store";

export class ShaderApplicationService {
  /**
   * Apply a compiled shader to an entity's material
   */
  static async applyShaderToEntity(
    entity: Entity, 
    shaderId: string
  ): Promise<boolean> {
    try {
      // Check if entity supports materials
      if (!('getMaterial' in entity) || !('setMaterial' in entity)) {
        console.warn('Entity does not support materials');
        return false;
      }

      // Get compiled shader
      const compiledShader = shaderManager.getCompiledShader(shaderId);
      if (!compiledShader || !compiledShader.material) {
        console.warn('Shader not compiled or material not available');
        return false;
      }

      // Apply the shader material to the entity
      (entity as any).setMaterial(compiledShader.material);
      
      // CRITICAL: Trigger entity change event for UI updates
      if ('emitChange' in entity && typeof (entity as any).emitChange === 'function') {
        (entity as any).emitChange();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to apply shader to entity:', error);
      return false;
    }
  }

  /**
   * Get the current entity from the shader editor context
   */
  static getCurrentShaderEntity(): Entity | null {
    const { shaderEditorEntity, gameWorldService } = useGameStudioStore.getState();
    
    if (!shaderEditorEntity || !gameWorldService) {
      return null;
    }

    const gameWorld = gameWorldService.getGameWorld();
    if (!gameWorld) {
      return null;
    }

    const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    return entitiesRegistry?.get(shaderEditorEntity) || null;
  }

  /**
   * Apply the currently selected shader to the current entity
   */
  static async applyCurrentShaderToCurrentEntity(): Promise<boolean> {
    const entity = this.getCurrentShaderEntity();
    const { selectedShaderId } = useGameStudioStore.getState();

    if (!entity || !selectedShaderId) {
      console.warn('No entity or shader selected for application');
      return false;
    }

    return await this.applyShaderToEntity(entity, selectedShaderId);
  }
} 