import * as THREE from "three/webgpu";
import { MaterialDefinition } from "@/types/project";
import { materialSystem } from "@/services/material-system";
import { Entity } from "@/models";
import useGameStudioStore from "@/stores/game-studio-store";

export class MaterialApplicationService {
  /**
   * Apply a material definition to an entity
   */
  static async applyMaterialToEntity(
    entity: Entity, 
    materialDefinition: MaterialDefinition
  ): Promise<boolean> {
    try {
      // Check if entity supports materials
      if (!('getMaterial' in entity) || !('setMaterial' in entity)) {
        console.warn('Entity does not support materials');
        return false;
      }

      // Update the material definition in the central registry first
      await this.updateMaterialInRegistry(materialDefinition);

      // Create THREE.js material from definition
      const threeMaterial = await this.createThreeMaterialFromDefinition(materialDefinition);
      
      // Apply to entity
      (entity as any).setMaterial(threeMaterial);
      
      // CRITICAL: Trigger entity change event for UI updates
      // This ensures the material section and other UI components refresh
      if ('emitChange' in entity && typeof (entity as any).emitChange === 'function') {
        (entity as any).emitChange();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to apply material to entity:', error);
      return false;
    }
  }

  /**
   * Update material definition in the central registry
   */
  private static async updateMaterialInRegistry(materialDefinition: MaterialDefinition): Promise<void> {
    try {
      // Use the new material system methods instead of creating new libraries
      materialSystem.addMaterialDefinition(materialDefinition);
    } catch (error) {
      console.error('Failed to update material in registry:', error);
    }
  }

  /**
   * Create THREE.js material from MaterialDefinition
   */
  private static async createThreeMaterialFromDefinition(
    definition: MaterialDefinition
  ): Promise<THREE.Material> {
    // Create material directly with texture support
    try {
      return await this.createMaterialWithTextures(definition);
    } catch (error) {
      console.error('Failed to create material with textures, falling back to basic material:', error);
      return this.createMaterialDirectly(definition);
    }
  }

  /**
   * Create material directly from properties without textures (fallback)
   */
  private static createMaterialDirectly(definition: MaterialDefinition): THREE.Material {
    const props = definition.properties;
    let material: THREE.Material;

    switch (definition.type) {
      case 'basic':
        material = new THREE.MeshBasicMaterial();
        break;
      case 'lambert':
        material = new THREE.MeshLambertMaterial();
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial();
        break;
      case 'standard':
        material = new THREE.MeshStandardMaterial();
        break;
      case 'physical':
        material = new THREE.MeshPhysicalMaterial();
        break;
      case 'toon':
        material = new THREE.MeshToonMaterial();
        break;
      default:
        material = new THREE.MeshStandardMaterial();
    }

    // Apply basic properties only
    this.applyPropertiesToMaterial(material, props);
    
    return material;
  }

  /**
   * Create material directly from properties with texture support
   */
  private static async createMaterialWithTextures(definition: MaterialDefinition): Promise<THREE.Material> {
    const props = definition.properties;
    let material: THREE.Material;

    switch (definition.type) {
      case 'basic':
        material = new THREE.MeshBasicMaterial();
        break;
      case 'lambert':
        material = new THREE.MeshLambertMaterial();
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial();
        break;
      case 'standard':
        material = new THREE.MeshStandardMaterial();
        break;
      case 'physical':
        material = new THREE.MeshPhysicalMaterial();
        break;
      case 'toon':
        material = new THREE.MeshToonMaterial();
        break;
      default:
        material = new THREE.MeshStandardMaterial();
    }

    // Apply basic properties first
    this.applyPropertiesToMaterial(material, props);
    
    // Apply textures if project is available
    const currentProject = useGameStudioStore.getState().currentProject;
    if (currentProject) {
      await this.applyTexturesToMaterial(material, props, currentProject.path);
    }
    
    return material;
  }

  /**
   * Apply textures to material
   */
  private static async applyTexturesToMaterial(material: THREE.Material, props: any, projectPath: string): Promise<void> {
    try {
      const texturePromises: Promise<void>[] = [];

      // Base color map
      if (props.map && 'map' in material) {
        texturePromises.push(
          this.loadTexture(projectPath, props.map, props.mapProps).then(texture => {
            if (texture) (material as any).map = texture;
          })
        );
      }

      // Normal map
      if (props.normalMap && 'normalMap' in material) {
        texturePromises.push(
          this.loadTexture(projectPath, props.normalMap, props.normalMapProps).then(texture => {
            if (texture) {
              (material as any).normalMap = texture;
              if (props.normalScale && 'normalScale' in material) {
                (material as any).normalScale.set(props.normalScale, props.normalScale);
              }
            }
          })
        );
      }

      // Roughness map
      if (props.roughnessMap && 'roughnessMap' in material) {
        texturePromises.push(
          this.loadTexture(projectPath, props.roughnessMap, props.roughnessMapProps).then(texture => {
            if (texture) (material as any).roughnessMap = texture;
          })
        );
      }

      // Metalness map
      if (props.metalnessMap && 'metalnessMap' in material) {
        texturePromises.push(
          this.loadTexture(projectPath, props.metalnessMap, props.metalnessMapProps).then(texture => {
            if (texture) (material as any).metalnessMap = texture;
          })
        );
      }

      // AO map
      if (props.aoMap && 'aoMap' in material) {
        texturePromises.push(
          this.loadTexture(projectPath, props.aoMap, props.aoMapProps).then(texture => {
            if (texture) {
              (material as any).aoMap = texture;
              if (props.aoMapIntensity !== undefined) {
                (material as any).aoMapIntensity = props.aoMapIntensity;
              }
            }
          })
        );
      }

      // Emissive map
      if (props.emissiveMap && 'emissiveMap' in material) {
        texturePromises.push(
          this.loadTexture(projectPath, props.emissiveMap, props.emissiveMapProps).then(texture => {
            if (texture) (material as any).emissiveMap = texture;
          })
        );
      }

      // Physical material specific textures
      if (material instanceof THREE.MeshPhysicalMaterial) {
        // Clearcoat maps
        if (props.clearcoatMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.clearcoatMap, props.clearcoatMapProps).then(texture => {
              if (texture) material.clearcoatMap = texture;
            })
          );
        }
        
        if (props.clearcoatRoughnessMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.clearcoatRoughnessMap, props.clearcoatRoughnessMapProps).then(texture => {
              if (texture) material.clearcoatRoughnessMap = texture;
            })
          );
        }
        
        if (props.clearcoatNormalMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.clearcoatNormalMap, props.clearcoatNormalMapProps).then(texture => {
              if (texture) {
                material.clearcoatNormalMap = texture;
                if (props.clearcoatNormalScale) {
                  material.clearcoatNormalScale.set(props.clearcoatNormalScale, props.clearcoatNormalScale);
                }
              }
            })
          );
        }

        // Transmission and thickness
        if (props.transmissionMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.transmissionMap, props.transmissionMapProps).then(texture => {
              if (texture) material.transmissionMap = texture;
            })
          );
        }
        
        if (props.thicknessMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.thicknessMap, props.thicknessMapProps).then(texture => {
              if (texture) material.thicknessMap = texture;
            })
          );
        }

        // Iridescence
        if (props.iridescenceMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.iridescenceMap, props.iridescenceMapProps).then(texture => {
              if (texture) material.iridescenceMap = texture;
            })
          );
        }
        
        if (props.iridescenceThicknessMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.iridescenceThicknessMap, props.iridescenceThicknessMapProps).then(texture => {
              if (texture) material.iridescenceThicknessMap = texture;
            })
          );
        }

        // Sheen
        if (props.sheenColorMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.sheenColorMap, props.sheenColorMapProps).then(texture => {
              if (texture) material.sheenColorMap = texture;
            })
          );
        }
        
        if (props.sheenRoughnessMap) {
          texturePromises.push(
            this.loadTexture(projectPath, props.sheenRoughnessMap, props.sheenRoughnessMapProps).then(texture => {
              if (texture) material.sheenRoughnessMap = texture;
            })
          );
        }
      }

      // Phong material specific textures
      if (material instanceof THREE.MeshPhongMaterial && props.specularMap) {
        texturePromises.push(
          this.loadTexture(projectPath, props.specularMap, props.specularMapProps).then(texture => {
            if (texture) material.specularMap = texture;
          })
        );
      }

      // Wait for all textures to load
      await Promise.allSettled(texturePromises);
      
      // Force material update
      material.needsUpdate = true;

    } catch (error) {
      console.error('Failed to load textures for material:', error);
    }
  }

  /**
   * Load texture from project path
   */
  private static async loadTexture(projectPath: string, texturePath: string, textureProps?: any): Promise<THREE.Texture | null> {
    try {
      const textureDataUrl = await window.projectAPI.getAssetDataUrl(projectPath, texturePath);
      if (!textureDataUrl) {
        console.warn(`Could not get data for texture: ${texturePath}`);
        return null;
      }

      // Convert data URL to blob URL for TextureLoader
      const response = await fetch(textureDataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const loader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(blobUrl, (loadedTexture) => {
          // Clean up blob URL after loading
          URL.revokeObjectURL(blobUrl);
          resolve(loadedTexture);
        }, undefined, (error) => {
          // Clean up blob URL on error
          URL.revokeObjectURL(blobUrl);
          reject(error);
        });
      });

      // Apply texture properties
      if (textureProps) {
        // Handle both 'scale' and 'repeat' for UV scaling (scale is the new standard)
        const uvScale = textureProps.scale || textureProps.repeat;
        if (uvScale) {
          texture.repeat.set(uvScale.x, uvScale.y);
        }
        if (textureProps.offset) {
          texture.offset.set(textureProps.offset.x, textureProps.offset.y);
        }
        if (textureProps.rotation !== undefined) {
          texture.rotation = textureProps.rotation;
        }
        // Set wrapping mode for UV scaling to work properly
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
      }

      return texture;
    } catch (error) {
      console.error(`Failed to load texture ${texturePath}:`, error);
      return null;
    }
  }

  /**
   * Apply properties object to THREE.js material with proper validation
   */
  private static applyPropertiesToMaterial(material: THREE.Material, props: any): void {
    // Common properties
    if (props.color && 'color' in material) {
      try {
        (material as any).color.set(props.color);
      } catch (e) {
        console.warn('Invalid color value:', props.color);
      }
    }
    
    if (props.opacity !== undefined && props.opacity >= 0 && props.opacity <= 1) {
      material.opacity = props.opacity;
      material.transparent = props.opacity < 1;
    }
    
    if (props.transparent !== undefined) {
      material.transparent = props.transparent;
    }
    
    if (props.wireframe !== undefined && 'wireframe' in material) {
      (material as any).wireframe = props.wireframe;
    }
    
    if (props.side !== undefined) {
      material.side = props.side;
    }

    // Material-specific properties
    this.applySpecificProperties(material, props);
  }

  /**
   * Apply material-type specific properties with validation
   */
  private static applySpecificProperties(material: THREE.Material, props: any): void {
    // Emissive properties
    if ('emissive' in material) {
      if (props.emissive) {
        try {
          (material as any).emissive.set(props.emissive);
        } catch (e) {
          console.warn('Invalid emissive color value:', props.emissive);
        }
      }
      if (props.emissiveIntensity !== undefined && props.emissiveIntensity >= 0) {
        (material as any).emissiveIntensity = props.emissiveIntensity;
      }
    }

    // PBR properties
    if ('metalness' in material && props.metalness !== undefined) {
      (material as any).metalness = Math.max(0, Math.min(1, props.metalness));
    }
    if ('roughness' in material && props.roughness !== undefined) {
      (material as any).roughness = Math.max(0, Math.min(1, props.roughness));
    }

    // Phong properties
    if ('specular' in material && props.specular) {
      try {
        (material as any).specular.set(props.specular);
      } catch (e) {
        console.warn('Invalid specular color value:', props.specular);
      }
    }
    if ('shininess' in material && props.shininess !== undefined) {
      (material as any).shininess = Math.max(0, props.shininess);
    }

    // Physical material properties
    if ('clearcoat' in material && props.clearcoat !== undefined) {
      (material as any).clearcoat = Math.max(0, Math.min(1, props.clearcoat));
    }
    if ('clearcoatRoughness' in material && props.clearcoatRoughness !== undefined) {
      (material as any).clearcoatRoughness = Math.max(0, Math.min(1, props.clearcoatRoughness));
    }
    if ('ior' in material && props.ior !== undefined) {
      (material as any).ior = Math.max(1, props.ior);
    }
    if ('transmission' in material && props.transmission !== undefined) {
      (material as any).transmission = Math.max(0, Math.min(1, props.transmission));
    }
    if ('thickness' in material && props.thickness !== undefined) {
      (material as any).thickness = Math.max(0, props.thickness);
    }
    if ('iridescence' in material && props.iridescence !== undefined) {
      (material as any).iridescence = Math.max(0, Math.min(1, props.iridescence));
    }
    if ('sheen' in material && props.sheen !== undefined) {
      (material as any).sheen = Math.max(0, Math.min(1, props.sheen));
    }
    if ('sheenColor' in material && props.sheenColor) {
      try {
        (material as any).sheenColor.set(props.sheenColor);
      } catch (e) {
        console.warn('Invalid sheen color value:', props.sheenColor);
      }
    }
  }

  /**
   * Get the current material from an entity and convert it to a MaterialDefinition
   * FIXED: Now reuses existing materials instead of creating new ones for each entity
   */
  static getCurrentMaterialFromEntity(entity: Entity): MaterialDefinition | null {
    try {
      if (!('getMaterial' in entity) || typeof entity.getMaterial !== 'function') {
        return null;
      }

      const threeMaterial = (entity as any).getMaterial();
      if (!threeMaterial) return null;

      // First, try to find an existing material that matches this THREE.js material
      const existingMaterial = this.findMatchingMaterialDefinition(threeMaterial);
      if (existingMaterial) {
        return existingMaterial;
      }

      // Only create a new material definition if we can't find a matching one
      return this.convertThreeMaterialToDefinition(threeMaterial, entity.entityId.toString());
    } catch (error) {
      console.error('Failed to get current material from entity:', error);
      return null;
    }
  }

  /**
   * Find an existing MaterialDefinition that matches the given THREE.js material
   */
  private static findMatchingMaterialDefinition(threeMaterial: THREE.Material): MaterialDefinition | null {
    const allMaterials = materialSystem.getAllMaterialDefinitions();
    
    for (const materialDef of allMaterials) {
      if (this.doesMaterialMatchDefinition(threeMaterial, materialDef)) {
        return materialDef;
      }
    }
    
    return null;
  }

  /**
   * Check if a THREE.js material matches a MaterialDefinition
   */
  private static doesMaterialMatchDefinition(threeMaterial: THREE.Material, materialDef: MaterialDefinition): boolean {
    // Check material type
    const materialType = this.getThreeMaterialType(threeMaterial);
    if (materialType !== materialDef.type) {
      return false;
    }

    // Check key properties
    const props = materialDef.properties;
    
    // Check color
    if ('color' in threeMaterial && props.color) {
      const currentColor = '#' + (threeMaterial as any).color.getHexString();
      if (currentColor !== props.color) {
        return false;
      }
    }

    // Check opacity
    if (Math.abs(threeMaterial.opacity - (props.opacity || 1)) > 0.001) {
      return false;
    }

    // Check transparency
    if (threeMaterial.transparent !== (props.transparent || false)) {
      return false;
    }

    // Check material-specific properties
    if ('metalness' in threeMaterial && props.metalness !== undefined) {
      if (Math.abs((threeMaterial as any).metalness - props.metalness) > 0.001) {
        return false;
      }
    }

    if ('roughness' in threeMaterial && props.roughness !== undefined) {
      if (Math.abs((threeMaterial as any).roughness - props.roughness) > 0.001) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the material type string from a THREE.js material
   */
  private static getThreeMaterialType(material: THREE.Material): MaterialDefinition['type'] {
    if (material instanceof THREE.MeshBasicMaterial) return 'basic';
    if (material instanceof THREE.MeshLambertMaterial) return 'lambert';
    if (material instanceof THREE.MeshPhongMaterial) return 'phong';
    if (material instanceof THREE.MeshStandardMaterial) return 'standard';
    if (material instanceof THREE.MeshPhysicalMaterial) return 'physical';
    if (material instanceof THREE.MeshToonMaterial) return 'toon';
    return 'standard';
  }

  /**
   * Convert THREE.js material to MaterialDefinition
   * FIXED: Now creates reusable materials instead of entity-specific ones
   */
  private static convertThreeMaterialToDefinition(material: THREE.Material, entityId: string): MaterialDefinition {
    let type: MaterialDefinition['type'] = 'standard';
    const properties: any = {};

    // Determine material type
    type = this.getThreeMaterialType(material);

    // Extract common properties
    if ('color' in material) {
      properties.color = '#' + (material as any).color.getHexString();
    }
    properties.opacity = material.opacity;
    properties.transparent = material.transparent;
    if ('wireframe' in material) {
      properties.wireframe = (material as any).wireframe;
    }
    properties.side = material.side;

    // Extract material-specific properties
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
    if ('envMapIntensity' in material) {
      properties.envMapIntensity = (material as any).envMapIntensity;
    }
    if ('specular' in material) {
      properties.specular = '#' + (material as any).specular.getHexString();
    }
    if ('shininess' in material) {
      properties.shininess = (material as any).shininess;
    }

    // Extract texture properties
    this.extractTextureProperty(material, properties, 'map', 'mapProps');
    this.extractTextureProperty(material, properties, 'normalMap', 'normalMapProps');
    this.extractTextureProperty(material, properties, 'roughnessMap', 'roughnessMapProps');
    this.extractTextureProperty(material, properties, 'metalnessMap', 'metalnessMapProps');
    this.extractTextureProperty(material, properties, 'aoMap', 'aoMapProps');
    this.extractTextureProperty(material, properties, 'emissiveMap', 'emissiveMapProps');
    this.extractTextureProperty(material, properties, 'specularMap', 'specularMapProps');

    // Normal scale
    if ('normalScale' in material && (material as any).normalScale) {
      properties.normalScale = (material as any).normalScale.x;
    }

    // AO Map intensity
    if ('aoMapIntensity' in material) {
      properties.aoMapIntensity = (material as any).aoMapIntensity;
    }

    // Physical material specific properties
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
      this.extractTextureProperty(material, properties, 'clearcoatMap', 'clearcoatMapProps');
      this.extractTextureProperty(material, properties, 'clearcoatRoughnessMap', 'clearcoatRoughnessMapProps');
      this.extractTextureProperty(material, properties, 'clearcoatNormalMap', 'clearcoatNormalMapProps');
      this.extractTextureProperty(material, properties, 'transmissionMap', 'transmissionMapProps');
      this.extractTextureProperty(material, properties, 'thicknessMap', 'thicknessMapProps');
      this.extractTextureProperty(material, properties, 'iridescenceMap', 'iridescenceMapProps');
      this.extractTextureProperty(material, properties, 'iridescenceThicknessMap', 'iridescenceThicknessMapProps');
      this.extractTextureProperty(material, properties, 'sheenColorMap', 'sheenColorMapProps');
      this.extractTextureProperty(material, properties, 'sheenRoughnessMap', 'sheenRoughnessMapProps');

      // Clearcoat normal scale
      if (material.clearcoatNormalScale) {
        properties.clearcoatNormalScale = material.clearcoatNormalScale.x;
      }
    }

    // Create a reusable material ID based on content, not entity
    const materialSignature = JSON.stringify({ type, properties });
    const materialHash = this.hashString(materialSignature);
    
    const materialDefinition: MaterialDefinition = {
      id: `auto-material-${type}-${materialHash}`,
      name: `Auto ${type.charAt(0).toUpperCase() + type.slice(1)} Material`,
      type,
      properties,
      metadata: {
        category: 'auto-generated',
        tags: ['auto-generated', type]
      }
    };

    // Add the new material to the system
    materialSystem.addMaterialDefinition(materialDefinition);

    return materialDefinition;
  }

  /**
   * Extract texture property from THREE.js material
   */
  private static extractTextureProperty(material: THREE.Material, properties: any, textureProp: string, uvProp: string): void {
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

  /**
   * Simple hash function for creating consistent material IDs
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
} 