import { LoaderContext, EntityData } from "./types";
import { Entity, Box, Sphere, Cylinder, Cone, Torus, Capsule, Ring, Plane, Heightfield, Mesh3D, AmbientLight, DirectionalLight, PointLight, SpotLight, Camera, PerspectiveCamera, OrthographicCamera, Group } from "../index";
import { CameraManager } from "../camera-manager";
import * as THREE from "three/webgpu";
import useGameStudioStore from "../../stores/game-studio-store";

export class EntityLoader {
  /**
   * Deep clone a material including all textures to avoid WebGPU buffer conflicts
   */
  private deepCloneMaterialWithTextures(sourceMaterial: THREE.Material): THREE.Material {
    try {
      // Standard clone first
      const clonedMaterial = sourceMaterial.clone();

      // List of texture properties that commonly exist on materials
      const textureProperties = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap',
        'envMap', 'displacementMap', 'alphaMap', 'bumpMap', 'specularMap',
        // Physical material textures
        'clearcoatMap', 'clearcoatRoughnessMap', 'clearcoatNormalMap',
        'transmissionMap', 'thicknessMap', 'sheenColorMap', 'sheenRoughnessMap',
        'iridescenceMap', 'iridescenceThicknessMap'
      ];

      // Clone all textures to avoid sharing GPU resources
      for (const propName of textureProperties) {
        if (propName in clonedMaterial) {
          const texture = (clonedMaterial as any)[propName] as THREE.Texture;
          if (texture && texture.isTexture) {
            try {
              // Create a new texture instance to avoid sharing WebGPU buffers
              const clonedTexture = texture.clone();
              
              // Force WebGPU to treat this as a new texture resource
              clonedTexture.needsUpdate = true;
              clonedTexture.version = texture.version + 1; // Force version increment
              
              // Copy texture properties to ensure consistency
              clonedTexture.wrapS = texture.wrapS;
              clonedTexture.wrapT = texture.wrapT;
              clonedTexture.magFilter = texture.magFilter;
              clonedTexture.minFilter = texture.minFilter;
              clonedTexture.anisotropy = texture.anisotropy;
              clonedTexture.format = texture.format;
              clonedTexture.type = texture.type;
              clonedTexture.colorSpace = texture.colorSpace;
              
              (clonedMaterial as any)[propName] = clonedTexture;
            } catch (error) {
              console.warn(`Failed to clone texture ${propName}:`, error);
              // If texture cloning fails, at least ensure the material has a fresh reference
              (clonedMaterial as any)[propName] = texture;
            }
          }
        }
      }

      // Ensure material needs update for WebGPU
      clonedMaterial.needsUpdate = true;
      
      // Force material version increment to ensure WebGPU treats it as new
      if ('version' in clonedMaterial) {
        (clonedMaterial as any).version = (sourceMaterial as any).version + 1;
      }

      return clonedMaterial;
    } catch (error) {
      console.error('Failed to deep clone material with textures:', error);
      // Fallback to standard clone
      return sourceMaterial.clone();
    }
  }

  async load(context: LoaderContext, entityData: EntityData[]): Promise<void> {
    const entityMap = new Map<string, Entity>();
    const mesh3dEntities: Array<{ entity: any, data: EntityData }> = [];
    
    for (const data of entityData) {
      const entity = await this.createEntity(context, data, entityMap);
      if (entity) {
        entityMap.set(data.id, entity);
        
        // Track mesh3d entities that need model loading
        if (data.type === 'mesh3d' && data.properties?.modelPath) {
          mesh3dEntities.push({ entity, data });
        }
      }
    }
    
    // Post-process: Load GLB files for mesh3d entities
    const currentProject = useGameStudioStore.getState().currentProject;
    if (currentProject && context.assetManager) {
      for (const { entity, data } of mesh3dEntities) {
        try {
          if (entity.loadFromPath && data.properties?.modelPath) {
            // Set the AssetManager on the entity before loading
            entity.setAssetManager(context.assetManager);
            await entity.loadFromPath(currentProject.path, data.properties.modelPath);
          }
        } catch (error) {
          console.error(`Failed to load model for entity ${data.id}:`, error);
        }
      }
    }
  }

  private async createEntity(context: LoaderContext, data: EntityData, entityMap: Map<string, Entity>): Promise<Entity | null> {
    const { gameWorld } = context;
    let entity: Entity | null = null;
    
    // Handle material references
    let material: THREE.Material | undefined = undefined;
    if (data.materialId && context.materials.has(data.materialId)) {
      // Deep clone material from context to avoid sharing material instances and textures between entities
      const sharedMaterial = context.materials.get(data.materialId);
      material = sharedMaterial ? this.deepCloneMaterialWithTextures(sharedMaterial) : undefined;
    } else if (data.material) {
      // Create material from inline definition
      material = this.createMaterialFromData(context, data.material);
    }
    
    const config: any = {
      name: data.name,
      position: new THREE.Vector3(data.transform.position.x, data.transform.position.y, data.transform.position.z),
      rotation: new THREE.Euler(data.transform.rotation.x, data.transform.rotation.y, data.transform.rotation.z),
      scale: new THREE.Vector3(data.transform.scale.x, data.transform.scale.y, data.transform.scale.z),
      material: material,
      castShadow: data.castShadow,
      receiveShadow: data.receiveShadow,
      ...data.properties,
      ...data.geometry?.parameters
    };
    
    switch (data.type) {
      case "box": entity = new Box(config); break;
      case "sphere": entity = new Sphere(config); break;
      case "cylinder": entity = new Cylinder(config); break;
      case "cone": entity = new Cone(config); break;
      case "torus": entity = new Torus(config); break;
      case "capsule": entity = new Capsule(config); break;
      case "ring": entity = new Ring(config); break;
      case "plane": entity = new Plane(config); break;
      case "heightfield": entity = new Heightfield(config); break;
      case "mesh3d": entity = new Mesh3D(config); break;
      case "group": entity = new Group(config); break;
      case "light": entity = this.createLight(config); break;
      case "camera": entity = this.createCameraEntity(data); break;
      default: throw new Error(`Unsupported entity type: ${data.type}`);
    }

    if (entity) {
      gameWorld.createEntity(entity);
      
      // Special handling for camera entities - register their THREE.js camera with CameraManager
      if (data.type === "camera") {
        const cameraEntity = entity as Camera;
        if (cameraEntity.camera) {
          const cameraManager = gameWorld.getCameraManager();
          cameraManager.addCamera(entity.entityId, entity.entityName, cameraEntity.camera);
          
          // Set as active camera if specified
          if (cameraEntity.isActive) {
            cameraManager.setActiveCamera(entity.entityId);
          }
        }
      }
      
      if (data.physics?.enabled) {
        this.applyPhysicsToEntity(entity, data);
      }
      
      // Apply character controller if present in data
      if (data.characterController) {
        // Convert plain object colliderOffset back to THREE.Vector3
        const characterControllerConfig = { ...data.characterController } as any;
        if (characterControllerConfig.colliderOffset) {
          characterControllerConfig.colliderOffset = new THREE.Vector3(
            characterControllerConfig.colliderOffset.x,
            characterControllerConfig.colliderOffset.y,
            characterControllerConfig.colliderOffset.z
          );
        } else {
          // Backward compatibility: add default colliderOffset for older save files
          characterControllerConfig.colliderOffset = new THREE.Vector3(0, 0, 0);
        }
        entity.enableCharacterController(characterControllerConfig);
      }
      
      // Reattach scripts if present in data
      if (data.scripts && data.scripts.length > 0) {
        const scriptManager = gameWorld.getScriptManager();
        if (scriptManager) {
          for (const scriptData of data.scripts) {
            // Handle both old format (string array) and new format (object array)
            const scriptId = typeof scriptData === 'string' ? scriptData : scriptData.scriptId;
            const parameters = typeof scriptData === 'object' ? scriptData.parameters : {};
            
            // Check if script exists in the script manager
            if (scriptManager.getScript(scriptId)) {
              entity.attachScript(scriptId);
              
              // Set script parameters if they exist
              if (parameters && Object.keys(parameters).length > 0) {
                scriptManager.setScriptParameters(entity.entityId, scriptId, parameters);
              }
            } else {
              console.warn(`Script ${scriptId} not found in script manager when loading entity ${entity.entityId}`);
            }
          }
        } else {
          console.warn(`Cannot reattach scripts: ScriptManager not available when loading entity ${entity.entityId}`);
        }
      }
      
      if (data.children && data.children.length > 0) {
        for (const childData of data.children) {
          const childEntity = await this.createEntity(context, childData, entityMap);
          if (childEntity) {
            entity.add(childEntity);
          }
        }
      }
    }
    return entity;
  }

  private createLight(config: any): Entity {
    const lightType = config.type || config.lightType;

    switch (lightType) {
      case "ambient": return new AmbientLight(config);
      case "directional": return new DirectionalLight(config);
      case "point": return new PointLight(config);
      case "spot": return new SpotLight(config);
      default: throw new Error(`Unsupported light type: ${lightType}`);
    }
  }

  private createCameraEntity(data: EntityData): Entity {
    const config = {
      name: data.name,
      position: new THREE.Vector3(data.transform.position.x, data.transform.position.y, data.transform.position.z),
      rotation: new THREE.Euler(data.transform.rotation.x, data.transform.rotation.y, data.transform.rotation.z),
      target: data.properties?.target ? new THREE.Vector3(data.properties.target.x, data.properties.target.y, data.properties.target.z) : new THREE.Vector3(0, 0, 0),
      isActive: data.properties?.isActive ?? false,
    };

    if (data.properties?.type === 'orthographic') {
      return new OrthographicCamera({
        ...config,
        left: data.properties?.left ?? -10,
        right: data.properties?.right ?? 10,
        top: data.properties?.top ?? 10,
        bottom: data.properties?.bottom ?? -10,
        near: data.properties?.near ?? 0.1,
        far: data.properties?.far ?? 1000,
      });
    } else {
      return new PerspectiveCamera({
        ...config,
        fov: data.properties?.fov ?? 75,
        aspect: data.properties?.aspect ?? 16 / 9,
        near: data.properties?.near ?? 0.1,
        far: data.properties?.far ?? 1000,
      });
    }
  }

  private applyPhysicsToEntity(entity: Entity, data: EntityData): void {
    if (!data.physics || !data.physics.enabled) return;
    switch (data.physics.type) {
      case "dynamic": entity.enableDynamicPhysics(data.physics.mass, data.physics.restitution, data.physics.friction); break;
      case "static": entity.enableStaticPhysics(data.physics.restitution, data.physics.friction); break;
      case "kinematic": entity.enableKinematicPhysics(); break;
    }
  }

  private createMaterialFromData(context: LoaderContext, materialData: any): THREE.Material {
    const MatClass = (THREE as any)[materialData.type] || THREE.MeshStandardMaterial;
    const material = new MatClass(materialData.properties);
    return material;
  }
}