import { GameWorld } from "../game-world";
import { Entity } from "../entity";
import { SceneData } from "../../types/project";
import { materialSystem } from "../../services/material-system";
import { MaterialApplicationService } from "../../pages/game-studio-page/components/material-editor/material-application-service";
import * as THREE from "three/webgpu";

export class SceneSerializer {
  async serializeScene(gameWorld: GameWorld, sceneName: string): Promise<SceneData> {
    console.log(`Serializing scene: ${sceneName}`);

    // For the snapshot, we'll create a minimal structure that matches SceneData
    const physicsManager = gameWorld.getPhysicsManager();
    const gravity = physicsManager.getGravity();

    // Get entities from the registry and serialize them
    const entities: any[] = [];
    const entityMaterials = new Map<string, any>(); // Track materials used by entities
    const entityRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");

    if (entityRegistry) {
      for (const item of entityRegistry.getAllRegistryItems()) {
        if (typeof item.item.serialize === 'function') {
          const entity = item.item;
          const serialized = entity.serialize();
          
          if (serialized) {
            // Check if entity has materials and serialize them
            if ('getMaterial' in entity && typeof entity.getMaterial === 'function') {
              const material = entity.getMaterial();
              if (material) {
                // Convert the THREE.js material back to a MaterialDefinition for serialization
                const materialDef = MaterialApplicationService.getCurrentMaterialFromEntity(entity);
                if (materialDef) {
                  entityMaterials.set(materialDef.id, materialDef);
                  
                  // Add material reference to the serialized entity
                  serialized.material = {
                    type: material.constructor.name,
                    properties: this.serializeMaterialProperties(material)
                  };
                  serialized.materialId = materialDef.id;
                }
              }
            }
            
            entities.push(serialized);
          }
        }
      }
    }

    // Serialize materials from the material system
    const allMaterials: any[] = [];
    
    // Add materials from the material system registry
    const materialDefinitions = materialSystem.getAllMaterialDefinitions();
    for (const materialDef of materialDefinitions) {
      allMaterials.push({
        id: materialDef.id,
        name: materialDef.name,
        type: materialDef.type,
        properties: materialDef.properties,
        metadata: materialDef.metadata
      });
    }
    
    // Add materials used by entities that might not be in the material system
    for (const [materialId, materialDef] of entityMaterials) {
      if (!allMaterials.find(m => m.id === materialId)) {
        allMaterials.push({
          id: materialDef.id,
          name: materialDef.name,
          type: materialDef.type,
          properties: materialDef.properties,
          metadata: materialDef.metadata
        });
      }
    }

    return {
      id: `scene_${Date.now()}`,
      name: sceneName,
      entities: entities,
      world: {
        gravity: { x: gravity.x, y: gravity.y, z: gravity.z },
        physics: {
          enabled: physicsManager.isEnabled(),
          timeStep: 1/60,
          maxSubSteps: 10,
        },
        rendering: {
          backgroundColor: "#87CEEB",
          environment: "",
          fog: {
            enabled: false,
            color: "#ffffff",
            near: 10,
            far: 100,
          },
          shadows: {
            enabled: true,
            type: "pcfsoft",
          },
          antialias: true,
          pixelRatio: 1,
        },
      },
      activeCamera: gameWorld.getCameraManager().getActiveCameraId() || undefined,
      assets: [
        // Add materials as assets
        ...allMaterials.map(material => ({
          id: material.id,
          type: "material" as const,
          path: `materials/${material.id}.json`,
          name: material.name,
          metadata: {
            materialType: material.type,
            category: material.metadata?.category || 'custom',
            tags: material.metadata?.tags || [],
            materialDefinition: material // Store the full material definition in metadata
          }
        }))
      ],
      editor: {
        showGrid: true,
        gridSize: 1,
        showHelpers: true,
        showWireframe: false,
        debugPhysics: gameWorld.isPhysicsDebugRenderEnabled(),
      },
      metadata: {
        created: Date.now(),
        modified: Date.now(),
        version: "1.0.0",
      },
    };
  }

  private serializeMaterialProperties(material: THREE.Material): Record<string, any> {
    const properties: Record<string, any> = {};
    
    // Common properties
    properties.opacity = material.opacity;
    properties.transparent = material.transparent;
    properties.side = material.side;
    properties.visible = material.visible;
    
    // Type-specific properties
    if ('color' in material) {
      properties.color = '#' + (material as any).color.getHexString();
    }
    if ('emissive' in material) {
      properties.emissive = '#' + (material as any).emissive.getHexString();
      properties.emissiveIntensity = (material as any).emissiveIntensity;
    }
    if ('metalness' in material) {
      properties.metalness = (material as any).metalness;
    }
    if ('roughness' in material) {
      properties.roughness = (material as any).roughness;
    }
    if ('wireframe' in material) {
      properties.wireframe = (material as any).wireframe;
    }
    if ('specular' in material) {
      properties.specular = '#' + (material as any).specular.getHexString();
    }
    if ('shininess' in material) {
      properties.shininess = (material as any).shininess;
    }
    
    return properties;
  }
}