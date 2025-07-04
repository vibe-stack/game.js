import { GameWorld } from "../game-world";
import { EntityLoader } from "./entity-loader";
import { PhysicsLoader } from "./physics-loader";
import { SceneData, LoaderContext } from "./types";
import { AssetManager } from "../asset-manager";
import { materialSystem } from "../../services/material-system";
import { MaterialApplicationService } from "../../pages/game-studio-page/components/material-editor/material-application-service";
import useGameStudioStore from "../../stores/game-studio-store";
import * as THREE from "three/webgpu";

export class SceneLoader {
  private entityLoader: EntityLoader;
  private physicsLoader: PhysicsLoader;
  private assetManager?: AssetManager;

  constructor(assetManager?: AssetManager) {
    this.entityLoader = new EntityLoader();
    this.physicsLoader = new PhysicsLoader();
    this.assetManager = assetManager;
  }

  async loadScene(gameWorld: GameWorld, sceneData: SceneData): Promise<void> {
    const context: LoaderContext = {
      gameWorld,
      materials: new Map(),
      geometries: new Map(),
      textures: new Map(),
      assetManager: this.assetManager,
    };

    try {
      gameWorld.scene.clear();
      
      // Load rendering settings first
      await this.loadRenderingSettings(context, sceneData);
      
      // Load materials first
      await this.loadMaterials(context, sceneData);
      
      // Transform physics data to expected format
      const physicsData = {
        enabled: sceneData.world.physics.enabled,
        gravity: [sceneData.world.gravity.x, sceneData.world.gravity.y, sceneData.world.gravity.z] as [number, number, number],
        debugRender: sceneData.editor?.debugPhysics || false,
        solver: {
          iterations: 10,
          timestep: sceneData.world.physics.timeStep
        }
      };
      
      if (physicsData) {
        await this.physicsLoader.load(context, physicsData);
      }
      // Convert SceneEntity to EntityData format for the entity loader
      // Use type assertion to handle complex type differences temporarily
      const entityData = sceneData.entities as any[];
      await this.entityLoader.load(context, entityData);

      // Load editor settings (including grid settings)
      await this.loadEditorSettings(context, sceneData);

    } catch (error) {
      console.error(`Failed to load scene "${sceneData.name}":`, error);
      throw error;
    }
  }

  private async loadEditorSettings(context: LoaderContext, sceneData: SceneData): Promise<void> {
    // Note: This method is called from GameWorldService which has access to the HelperManager
    // The actual grid settings loading is handled in GameWorldService.loadScene
  }

  private async loadRenderingSettings(context: LoaderContext, sceneData: SceneData): Promise<void> {
    const { gameWorld } = context;
    const renderingSettings = sceneData.world.rendering;
    
    if (!renderingSettings) return;
    
    // Load target resolution settings
    if (renderingSettings.targetResolution) {
      gameWorld.setTargetResolution(
        renderingSettings.targetResolution.width,
        renderingSettings.targetResolution.height,
        renderingSettings.targetResolution.maintainAspectRatio
      );
    } else if (renderingSettings.pixelRatio) {
      // Backwards compatibility: convert pixel ratio to target resolution
      const canvas = gameWorld.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || canvas.clientWidth || 800;
      const height = rect.height || canvas.clientHeight || 600;
      
      // Calculate target resolution based on pixel ratio
      const targetWidth = Math.round(width * renderingSettings.pixelRatio);
      const targetHeight = Math.round(height * renderingSettings.pixelRatio);
      
      gameWorld.setTargetResolution(targetWidth, targetHeight, true);
    }
    
    // Load shadow settings
    if (renderingSettings.shadows) {
      const renderer = gameWorld.getRenderer();
      renderer.shadowMap.enabled = renderingSettings.shadows.enabled;
      
      // Set shadow map type if specified
      if (renderingSettings.shadows.type) {
        switch (renderingSettings.shadows.type) {
          case "basic":
            renderer.shadowMap.type = THREE.BasicShadowMap;
            break;
          case "pcf":
            renderer.shadowMap.type = THREE.PCFShadowMap;
            break;
          case "pcfsoft":
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            break;
          case "vsm":
            renderer.shadowMap.type = THREE.VSMShadowMap;
            break;
          default:
            renderer.shadowMap.type = THREE.PCFShadowMap;
        }
      }
    }
    
    // Load background color
    if (renderingSettings.backgroundColor) {
      gameWorld.scene.background = new THREE.Color(renderingSettings.backgroundColor);
    }
    
    // Load fog settings
    if (renderingSettings.fog && renderingSettings.fog.enabled) {
      gameWorld.scene.fog = new THREE.Fog(
        renderingSettings.fog.color,
        renderingSettings.fog.near,
        renderingSettings.fog.far
      );
    } else {
      gameWorld.scene.fog = null;
    }
    
    // Load post-processing settings
    if (renderingSettings.postProcessing) {
      const { bloom, toneMappingExposure } = renderingSettings.postProcessing;
      
      // Set bloom settings
      if (bloom) {
        gameWorld.setBloomSettings(bloom.strength, bloom.radius);
      }
      
      // Set tone mapping exposure
      if (toneMappingExposure !== undefined) {
        gameWorld.setToneMappingExposure(toneMappingExposure);
      }
      
      // Ensure post-processing is initialized with the new settings
      gameWorld.ensurePostProcessingInitialized();
    }
  }

  private async loadMaterials(context: LoaderContext, sceneData: SceneData): Promise<void> {
    // Load materials from the assets array if they exist
    const materialAssets = sceneData.assets?.filter(asset => asset.type === 'material') || [];
    
    for (const materialAsset of materialAssets) {
      if (materialAsset.metadata?.materialDefinition) {
        const materialDef = materialAsset.metadata.materialDefinition;
        
        // FIXED: Use the new material system methods instead of creating new libraries
        materialSystem.addMaterialDefinition(materialDef);
        
        // Create the THREE.js material and store it in the context
        const threeMaterial = await this.createMaterialFromDefinition(materialDef);
        context.materials.set(materialDef.id, threeMaterial);
      }
    }
    
    // Also check if materials are stored in metadata (fallback)
    if ((sceneData.metadata as any)?.materials) {
      const materials = (sceneData.metadata as any).materials;
      for (const materialDef of materials) {
        if (!context.materials.has(materialDef.id)) {
          // FIXED: Use the new material system methods instead of creating new libraries
          materialSystem.addMaterialDefinition(materialDef);
          
          const threeMaterial = await this.createMaterialFromDefinition(materialDef);
          context.materials.set(materialDef.id, threeMaterial);
        }
      }
    }
  }

  private async createMaterialFromDefinition(materialDef: any): Promise<THREE.Material> {
    // Use MaterialApplicationService's private method by creating a mock definition
    // and letting it handle the texture loading properly
    try {
      // Create a proper MaterialDefinition from the saved data
      const materialDefinition = {
        id: materialDef.id,
        name: materialDef.name,
        type: materialDef.type,
        properties: materialDef.properties || {},
        metadata: materialDef.metadata || {}
      };

      // Use the same material creation logic as the material application service
      return await this.createMaterialWithTextures(materialDefinition);
    } catch (error) {
      console.error('Failed to create material with textures, falling back to basic material:', error);
      return this.createBasicMaterial(materialDef);
    }
  }

  /**
   * Create material with texture support (mirrors MaterialApplicationService logic)
   */
  private async createMaterialWithTextures(definition: any): Promise<THREE.Material> {
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
    this.applyBasicProperties(material, props);
    
    // Apply textures if available
    await this.applyTexturesToMaterial(material, props);
    
    return material;
  }

  /**
   * Apply basic properties to material (mirrors MaterialApplicationService logic)
   */
  private applyBasicProperties(material: THREE.Material, props: any): void {
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
    if ('envMapIntensity' in material && props.envMapIntensity !== undefined) {
      (material as any).envMapIntensity = props.envMapIntensity;
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
    if (material instanceof THREE.MeshPhysicalMaterial) {
      if (props.clearcoat !== undefined) {
        material.clearcoat = Math.max(0, Math.min(1, props.clearcoat));
      }
      if (props.clearcoatRoughness !== undefined) {
        material.clearcoatRoughness = Math.max(0, Math.min(1, props.clearcoatRoughness));
      }
      if (props.ior !== undefined) {
        material.ior = Math.max(1, props.ior);
      }
      if (props.transmission !== undefined) {
        material.transmission = Math.max(0, Math.min(1, props.transmission));
      }
      if (props.thickness !== undefined) {
        material.thickness = Math.max(0, props.thickness);
      }
      if (props.iridescence !== undefined) {
        material.iridescence = Math.max(0, Math.min(1, props.iridescence));
      }
      if (props.sheen !== undefined) {
        material.sheen = Math.max(0, Math.min(1, props.sheen));
      }
      if (props.sheenColor) {
        try {
          material.sheenColor.set(props.sheenColor);
        } catch (e) {
          console.warn('Invalid sheen color value:', props.sheenColor);
        }
      }
    }
  }

  /**
   * Apply textures to material (mirrors MaterialApplicationService logic)
   */
  private async applyTexturesToMaterial(material: THREE.Material, props: any): Promise<void> {
    try {
      // Get current project path from store
      const currentProject = useGameStudioStore.getState().currentProject;
      if (!currentProject) {
        console.warn('No current project available for texture loading');
        return;
      }

      const texturePromises: Promise<void>[] = [];

      // Base color map
      if (props.map && 'map' in material) {
        texturePromises.push(
          this.loadTexture(currentProject.path, props.map, props.mapProps).then(texture => {
            if (texture) (material as any).map = texture;
          })
        );
      }

      // Normal map
      if (props.normalMap && 'normalMap' in material) {
        texturePromises.push(
          this.loadTexture(currentProject.path, props.normalMap, props.normalMapProps).then(texture => {
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
          this.loadTexture(currentProject.path, props.roughnessMap, props.roughnessMapProps).then(texture => {
            if (texture) (material as any).roughnessMap = texture;
          })
        );
      }

      // Metalness map
      if (props.metalnessMap && 'metalnessMap' in material) {
        texturePromises.push(
          this.loadTexture(currentProject.path, props.metalnessMap, props.metalnessMapProps).then(texture => {
            if (texture) (material as any).metalnessMap = texture;
          })
        );
      }

      // AO map
      if (props.aoMap && 'aoMap' in material) {
        texturePromises.push(
          this.loadTexture(currentProject.path, props.aoMap, props.aoMapProps).then(texture => {
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
          this.loadTexture(currentProject.path, props.emissiveMap, props.emissiveMapProps).then(texture => {
            if (texture) (material as any).emissiveMap = texture;
          })
        );
      }

      // Physical material specific textures
      if (material instanceof THREE.MeshPhysicalMaterial) {
        if (props.clearcoatMap) {
          texturePromises.push(
            this.loadTexture(currentProject.path, props.clearcoatMap, props.clearcoatMapProps).then(texture => {
              if (texture) material.clearcoatMap = texture;
            })
          );
        }
        
        if (props.clearcoatRoughnessMap) {
          texturePromises.push(
            this.loadTexture(currentProject.path, props.clearcoatRoughnessMap, props.clearcoatRoughnessMapProps).then(texture => {
              if (texture) material.clearcoatRoughnessMap = texture;
            })
          );
        }
        
        if (props.clearcoatNormalMap) {
          texturePromises.push(
            this.loadTexture(currentProject.path, props.clearcoatNormalMap, props.clearcoatNormalMapProps).then(texture => {
              if (texture) {
                material.clearcoatNormalMap = texture;
                if (props.clearcoatNormalScale) {
                  material.clearcoatNormalScale.set(props.clearcoatNormalScale, props.clearcoatNormalScale);
                }
              }
            })
          );
        }

        // Other physical material textures...
        if (props.transmissionMap) {
          texturePromises.push(
            this.loadTexture(currentProject.path, props.transmissionMap, props.transmissionMapProps).then(texture => {
              if (texture) material.transmissionMap = texture;
            })
          );
        }
        
        if (props.thicknessMap) {
          texturePromises.push(
            this.loadTexture(currentProject.path, props.thicknessMap, props.thicknessMapProps).then(texture => {
              if (texture) material.thicknessMap = texture;
            })
          );
        }
      }

      // Phong material specific textures
      if (material instanceof THREE.MeshPhongMaterial && props.specularMap) {
        texturePromises.push(
          this.loadTexture(currentProject.path, props.specularMap, props.specularMapProps).then(texture => {
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
   * Load texture from project path (mirrors MaterialApplicationService logic)
   */
  private async loadTexture(projectPath: string, texturePath: string, textureProps?: any): Promise<THREE.Texture | null> {
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
        // Handle both 'scale' and 'repeat' for UV scaling (backward compatibility)
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
   * Fallback method for basic material creation without textures
   */
  private createBasicMaterial(materialDef: any): THREE.Material {
    let material: THREE.Material;

    switch (materialDef.type) {
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
    const props = materialDef.properties || {};
    this.applyBasicProperties(material, props);
    
    return material;
  }

  static validateSceneData(sceneData: any): sceneData is SceneData {
    if (!sceneData || typeof sceneData !== 'object') return false;
    return sceneData.entities && Array.isArray(sceneData.entities);
  }

  static getDefaultSceneData(): SceneData {
    const now = new Date();
    return {
      id: `scene_${Date.now()}`,
      name: "New Scene",
      entities: [
        { id: "main-camera", name: "Main Camera", type: "camera", transform: { position: { x: 5, y: 5, z: 10 }, rotation: {x:-0.4, y: 0.3, z: 0.1}, scale: { x:1, y:1, z:1 } }, properties: { type: "perspective", fov: 75, near: 0.1, far: 1000, isActive: true }, children: [], tags: [], layer: 0, visible: true, metadata: { created: Date.now(), updated: Date.now() }},
        { id: "ambient-light", name: "Ambient Light", type: "light", transform: { position: { x: 0, y: 0, z: 0 }, rotation: {x:0,y:0,z:0}, scale: {x:1,y:1,z:1} }, properties: { type: "ambient", color: "#404040", intensity: 0.8 }, children: [], tags: [], layer: 0, visible: true, metadata: { created: Date.now(), updated: Date.now() }},
        { id: "directional-light", name: "Sun", type: "light", transform: { position: { x: 10, y: 15, z: 5 }, rotation: {x:0,y:0,z:0}, scale:{x:1,y:1,z:1} }, properties: { type: "directional", color: "#ffffff", intensity: 1.5, castShadow: true }, children: [], tags: [], layer: 0, visible: true, metadata: { created: Date.now(), updated: Date.now() }},
        { id: "ground", name: "Ground", type: "box", transform: { position: { x: 0, y: -0.5, z: 0 }, rotation: {x:0,y:0,z:0}, scale: {x:20,y:1,z:20} }, physics: { enabled: true, type: 'static' }, children: [], tags: ["ground"], layer: 0, visible: true, castShadow: false, receiveShadow: true, properties: {}, metadata: { created: Date.now(), updated: Date.now() }},
      ],
      world: {
        gravity: { x: 0, y: -9.81, z: 0 },
        physics: { enabled: true, timeStep: 1/60, maxSubSteps: 10 },
        rendering: {
          backgroundColor: "#2a2a2a", environment: "",
          fog: { enabled: false, color: "#ffffff", near: 10, far: 100 },
          shadows: { enabled: true, type: "pcfsoft" },
          antialias: true, 
          targetResolution: { width: 1920, height: 1080, maintainAspectRatio: true },
          pixelRatio: 1, // Keep for backwards compatibility
          postProcessing: {
            bloom: { strength: 0.7, radius: 0.5 },
            toneMappingExposure: 1.0,
          },
        },
      },
      activeCamera: "main-camera",
      assets: [],
      editor: { 
        showGrid: true, 
        gridSize: 1, 
        gridDivisions: 10,
        gridColor: "#888888",
        gridOpacity: 0.5,
        gridCenter: { x: 0, y: 0, z: 0 },
        gridInfinite: false,
        showHelpers: true, 
        showWireframe: false, 
        debugPhysics: false 
      },
      metadata: { created: now, modified: now, version: "1.0.0" },
    };
  }
}