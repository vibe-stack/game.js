import * as THREE from "three/webgpu";
import { MaterialDefinition } from "@/types/project";
import { materialSystem } from "@/services/material-system";
import { Entity } from "@/models";

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
      // Check if material exists in registry
      const existingMaterial = materialSystem.getMaterialDefinition(materialDefinition.id);
      
      if (existingMaterial) {
        // Update existing material - we need to update the internal registry
        // Since materialSystem doesn't have an update method, we need to work around this
        materialSystem.loadMaterialLibrary({
          id: 'updated-materials',
          name: 'Updated Materials',
          version: '1.0.0',
          materials: [materialDefinition],
          sharedShaderGraphs: [],
          sharedTextures: [],
          metadata: {
            created: new Date(),
            modified: new Date()
          }
        });
      } else {
        // Add new material to registry
        materialSystem.loadMaterialLibrary({
          id: 'new-materials',
          name: 'New Materials',
          version: '1.0.0',
          materials: [materialDefinition],
          sharedShaderGraphs: [],
          sharedTextures: [],
          metadata: {
            created: new Date(),
            modified: new Date()
          }
        });
      }
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
    // Create material directly since the material system might have registry issues
    return this.createMaterialDirectly(definition);
  }

  /**
   * Create material directly from properties with proper defaults
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

    // Apply properties with proper validation
    this.applyPropertiesToMaterial(material, props);
    
    return material;
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
   */
  static getCurrentMaterialFromEntity(entity: Entity): MaterialDefinition | null {
    try {
      if (!('getMaterial' in entity) || typeof entity.getMaterial !== 'function') {
        return null;
      }

      const threeMaterial = (entity as any).getMaterial();
      if (!threeMaterial) return null;

      // Convert THREE.js material back to MaterialDefinition
      return this.convertThreeMaterialToDefinition(threeMaterial, entity.entityId.toString());
    } catch (error) {
      console.error('Failed to get current material from entity:', error);
      return null;
    }
  }

  /**
   * Convert THREE.js material to MaterialDefinition
   */
  private static convertThreeMaterialToDefinition(material: THREE.Material, entityId: string): MaterialDefinition {
    let type: MaterialDefinition['type'] = 'standard';
    const properties: any = {};

    // Determine material type
    if (material instanceof THREE.MeshBasicMaterial) type = 'basic';
    else if (material instanceof THREE.MeshLambertMaterial) type = 'lambert';
    else if (material instanceof THREE.MeshPhongMaterial) type = 'phong';
    else if (material instanceof THREE.MeshStandardMaterial) type = 'standard';
    else if (material instanceof THREE.MeshPhysicalMaterial) type = 'physical';
    else if (material instanceof THREE.MeshToonMaterial) type = 'toon';

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
    if ('specular' in material) {
      properties.specular = '#' + (material as any).specular.getHexString();
    }
    if ('shininess' in material) {
      properties.shininess = (material as any).shininess;
    }

    return {
      id: `entity-material-${entityId}`,
      name: `${material.constructor.name} (${entityId})`,
      type,
      properties,
      metadata: {
        category: 'entity',
        tags: ['entity', type]
      }
    };
  }
} 