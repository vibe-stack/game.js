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
    if ('envMapIntensity' in material) {
      properties.envMapIntensity = (material as any).envMapIntensity;
    }

    // Serialize texture references and UV properties
    this.serializeTextureProperty(material, properties, 'map', 'mapProps');
    this.serializeTextureProperty(material, properties, 'normalMap', 'normalMapProps');
    this.serializeTextureProperty(material, properties, 'roughnessMap', 'roughnessMapProps');
    this.serializeTextureProperty(material, properties, 'metalnessMap', 'metalnessMapProps');
    this.serializeTextureProperty(material, properties, 'aoMap', 'aoMapProps');
    this.serializeTextureProperty(material, properties, 'emissiveMap', 'emissiveMapProps');
    this.serializeTextureProperty(material, properties, 'specularMap', 'specularMapProps');

    // Normal scale
    if ('normalScale' in material && (material as any).normalScale) {
      properties.normalScale = (material as any).normalScale.x;
    }

    // AO Map intensity
    if ('aoMapIntensity' in material) {
      properties.aoMapIntensity = (material as any).aoMapIntensity;
    }

    // Physical material specific properties and textures
    if (material instanceof THREE.MeshPhysicalMaterial) {
      properties.clearcoat = material.clearcoat;
      properties.clearcoatRoughness = material.clearcoatRoughness;
      properties.ior = material.ior;
      properties.transmission = material.transmission;
      properties.thickness = material.thickness;
      properties.iridescence = material.iridescence;
      properties.iridescenceIOR = material.iridescenceIOR;
      properties.sheen = material.sheen;
      properties.sheenColor = '#' + material.sheenColor.getHexString();
      properties.sheenRoughness = material.sheenRoughness;

      // Physical material textures
      this.serializeTextureProperty(material, properties, 'clearcoatMap', 'clearcoatMapProps');
      this.serializeTextureProperty(material, properties, 'clearcoatRoughnessMap', 'clearcoatRoughnessMapProps');
      this.serializeTextureProperty(material, properties, 'clearcoatNormalMap', 'clearcoatNormalMapProps');
      this.serializeTextureProperty(material, properties, 'transmissionMap', 'transmissionMapProps');
      this.serializeTextureProperty(material, properties, 'thicknessMap', 'thicknessMapProps');
      this.serializeTextureProperty(material, properties, 'iridescenceMap', 'iridescenceMapProps');
      this.serializeTextureProperty(material, properties, 'iridescenceThicknessMap', 'iridescenceThicknessMapProps');
      this.serializeTextureProperty(material, properties, 'sheenColorMap', 'sheenColorMapProps');
      this.serializeTextureProperty(material, properties, 'sheenRoughnessMap', 'sheenRoughnessMapProps');

      // Clearcoat normal scale
      if (material.clearcoatNormalScale) {
        properties.clearcoatNormalScale = material.clearcoatNormalScale.x;
      }
    }
    
    return properties;
  }

  private serializeTextureProperty(material: THREE.Material, properties: Record<string, any>, textureProp: string, uvProp: string): void {
    if (textureProp in material) {
      const texture = (material as any)[textureProp] as THREE.Texture;
      if (texture && texture.source && texture.source.data && texture.source.data.src) {
        // Extract the asset path from the texture URL
        const src = texture.source.data.src;
        const assetMatch = src.match(/\/assets\/(.+)$/);
        if (assetMatch) {
          properties[textureProp] = `assets/${assetMatch[1]}`;
          
          // Save UV properties (using 'scale' as the new standard)
          properties[uvProp] = {
            scale: { x: texture.repeat.x, y: texture.repeat.y },
            offset: { x: texture.offset.x, y: texture.offset.y },
            rotation: texture.rotation
          };
        }
      }
    }
  }
}