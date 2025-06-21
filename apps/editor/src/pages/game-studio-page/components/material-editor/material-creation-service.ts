import { MaterialDefinition } from "@/types/project";
import { materialSystem } from "@/services/material-system";

export class MaterialCreationService {
  /**
   * Create a new material definition
   */
  static createNewMaterial(
    name: string,
    type: "basic" | "lambert" | "phong" | "standard" | "physical" | "toon" = "standard",
    category: string = "custom"
  ): MaterialDefinition {
    const id = `material-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newMaterial: MaterialDefinition = {
      id,
      name,
      type,
      properties: this.getDefaultPropertiesForType(type),
      metadata: {
        category,
        tags: ["custom", type]
      }
    };

    return newMaterial;
  }

  /**
   * Add a material to the material system
   */
  static addMaterialToSystem(material: MaterialDefinition): void {
    // Create a temporary library for the new material
    const tempLibrary = {
      id: 'user-materials',
      name: 'User Materials',
      version: '1.0.0',
      materials: [material],
      sharedShaderGraphs: [],
      sharedTextures: [],
      metadata: {
        created: new Date(),
        modified: new Date()
      }
    };

    // Load into material system
    materialSystem.loadMaterialLibrary(tempLibrary);
  }

  /**
   * Get default properties for a material type
   */
  private static getDefaultPropertiesForType(type: string): Record<string, any> {
    const baseProperties = {
      type,
      color: "#ffffff",
      opacity: 1,
      transparent: false,
      wireframe: false,
      side: 0 // FrontSide
    };

    switch (type) {
      case 'basic':
        return baseProperties;

      case 'lambert':
        return {
          ...baseProperties,
          emissive: "#000000",
          emissiveIntensity: 0
        };

      case 'phong':
        return {
          ...baseProperties,
          emissive: "#000000",
          emissiveIntensity: 0,
          specular: "#111111",
          shininess: 30
        };

      case 'standard':
        return {
          ...baseProperties,
          emissive: "#000000",
          emissiveIntensity: 0,
          metalness: 0,
          roughness: 1,
          envMapIntensity: 1
        };

      case 'physical':
        return {
          ...baseProperties,
          emissive: "#000000",
          emissiveIntensity: 0,
          metalness: 0,
          roughness: 1,
          envMapIntensity: 1,
          clearcoat: 0,
          clearcoatRoughness: 0,
          ior: 1.5,
          transmission: 0,
          thickness: 0,
          iridescence: 0,
          sheen: 0,
          sheenColor: "#ffffff",
          sheenRoughness: 1
        };

      case 'toon':
        return {
          ...baseProperties,
          emissive: "#000000",
          emissiveIntensity: 0
        };

      default:
        return baseProperties;
    }
  }
} 