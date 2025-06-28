import * as THREE from "three/webgpu";
import { 
  Sphere,
  Box,
  Plane,
  Cylinder,
  Cone,
  Torus,
  Capsule,
  Ring,
  Tetrahedron,
  Octahedron,
  Dodecahedron,
  Icosahedron,
  Heightfield,
  CustomHeightfield,
  AmbientLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  Camera,
  PerspectiveCamera,
  OrthographicCamera,
  Entity,
  Mesh3D
} from "@/models";
import { GameWorldService } from "../../services/game-world-service";
import useGameStudioStore from "@/stores/game-studio-store";

export class EntityCreator {
  private static entityCounter = 1;

  static async createEntity(entityType: string, gameWorldService: GameWorldService): Promise<Entity | null> {
    const gameWorld = gameWorldService.getGameWorld();
    if (!gameWorld) {
      throw new Error("Game world not initialized");
    }

    let entity: Entity | null = null;
    const spawnPosition = new THREE.Vector3(0, 2, 0);

    switch (entityType) {
      // Basic Shapes
      case "sphere":
        entity = new Sphere({
          name: `Sphere ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "box":
        entity = new Box({
          name: `Box ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "plane":
        entity = new Plane({
          name: `Plane ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: false,
          receiveShadow: true,
        });
        break;

      // Geometric Shapes
      case "cylinder":
        entity = new Cylinder({
          name: `Cylinder ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "cone":
        entity = new Cone({
          name: `Cone ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "torus":
        entity = new Torus({
          name: `Torus ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "capsule":
        entity = new Capsule({
          name: `Capsule ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "ring":
        entity = new Ring({
          name: `Ring ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;

      // Polyhedrons
      case "tetrahedron":
        entity = new Tetrahedron({
          name: `Tetrahedron ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "octahedron":
        entity = new Octahedron({
          name: `Octahedron ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "dodecahedron":
        entity = new Dodecahedron({
          name: `Dodecahedron ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;
        
      case "icosahedron":
        entity = new Icosahedron({
          name: `Icosahedron ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;

      // Terrain & Landscape
      case "heightfield":
        entity = new Heightfield({
          name: `Heightfield ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: false,
          receiveShadow: true,
        });
        break;
        
      case "custom-heightfield":
        entity = new CustomHeightfield({
          name: `Custom Heightfield ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: false,
          receiveShadow: true,
        });
        break;

      // Lighting
      case "ambient-light":
        entity = new AmbientLight({
          name: `Ambient Light ${this.entityCounter++}`,
          position: spawnPosition,
          color: 0x404040,
          intensity: 0.4,
        });
        break;
        
      case "directional-light":
        entity = new DirectionalLight({
          name: `Directional Light ${this.entityCounter++}`,
          position: new THREE.Vector3(5, 10, 5),
          color: 0xffffff,
          intensity: 1,
          castShadow: true,
        });
        break;
        
      case "point-light":
        entity = new PointLight({
          name: `Point Light ${this.entityCounter++}`,
          position: spawnPosition,
          color: 0xffffff,
          intensity: 1,
          distance: 0, // 0 means no distance limitation - light affects all objects
          castShadow: false, // Disable shadows initially for WebGPU compatibility
        });
        break;
        
      case "spot-light":
        entity = new SpotLight({
          name: `Spot Light ${this.entityCounter++}`,
          position: new THREE.Vector3(0, 5, 0),
          color: 0xffffff,
          intensity: 1,
          distance: 0, // 0 means no distance limitation - light affects all objects
          angle: Math.PI / 4,
          penumbra: 0.1,
          castShadow: false, // Disable shadows initially for WebGPU compatibility
        });
        break;

      // 3D Models
      case "mesh-3d":
        entity = new Mesh3D({
          name: `Mesh ${this.entityCounter++}`,
          position: spawnPosition,
          castShadow: true,
          receiveShadow: true,
        });
        break;

      // Cameras
      case "perspective-camera":
        entity = new PerspectiveCamera({
          name: `Perspective Camera ${this.entityCounter++}`,
          position: new THREE.Vector3(5, 5, 10),
          target: new THREE.Vector3(0, 0, 0),
          fov: 75,
          near: 0.1,
          far: 1000
        });
        break;
        
      case "orthographic-camera":
        entity = new OrthographicCamera({
          name: `Orthographic Camera ${this.entityCounter++}`,
          position: new THREE.Vector3(5, 5, 10),
          target: new THREE.Vector3(0, 0, 0),
          left: -10,
          right: 10,
          top: 10,
          bottom: -10,
          near: 0.1,
          far: 1000
        });
        break;
      
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    if (entity) {
      // Use GameWorld.createEntity to ensure proper setup (physics, script manager, interaction manager, etc.)
      gameWorld.createEntity(entity);
      
      // Special handling for camera entities - register their THREE.js camera with CameraManager
      if (entity.metadata.type === "camera") {
        const cameraEntity = entity as Camera;
        if (cameraEntity.camera) {
          const cameraManager = gameWorld.getCameraManager();
          cameraManager.addCamera(entity.entityId, entity.entityName, cameraEntity.camera);
          // Update available cameras in the UI
          gameWorldService.updateAvailableCameras();
        }
      }
      
      // Notify selection manager about the new entity
      const selectionManager = gameWorldService.getSelectionManager();
      selectionManager.onEntityAdded(entity);
      
      // Notify helper manager about the new entity
      const helperManager = gameWorldService.getHelperManager();
      helperManager.onEntityAdded(entity);
      
      return entity;
    }

    return null;
  }



  static async duplicateEntity(sourceEntity: Entity, gameWorldService: GameWorldService): Promise<Entity | null> {
    const gameWorld = gameWorldService.getGameWorld();
    if (!gameWorld) {
      throw new Error("Game world not initialized");
    }

    try {
      // Serialize the source entity to get all its properties
      const serializedData = sourceEntity.serialize();
      if (!serializedData) {
        throw new Error("Entity serialization failed");
      }

      // Create a modified EntityData with new ID and offset position
      const duplicatedEntityData: any = {
        ...serializedData,
        id: `${serializedData.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${sourceEntity.entityName} Copy`,
        transform: {
          position: {
            x: sourceEntity.position.x + 1,
            y: sourceEntity.position.y,
            z: sourceEntity.position.z + 1
          },
          rotation: {
            x: sourceEntity.rotation.x,
            y: sourceEntity.rotation.y,
            z: sourceEntity.rotation.z
          },
          scale: {
            x: sourceEntity.scale.x,
            y: sourceEntity.scale.y,
            z: sourceEntity.scale.z
          }
        }
      };

      // Handle material references - create a proper material clone
      let material: THREE.Material | undefined = undefined;
      if ('getMaterial' in sourceEntity && typeof sourceEntity.getMaterial === 'function') {
        const sourceMaterial = sourceEntity.getMaterial();
        if (sourceMaterial) {
          material = await this.deepCloneMaterialWithTextures(sourceMaterial);
        }
      }
      
      // CRITICAL FIX: Ensure proper segment defaults for geometries during duplication
      const baseConfig: any = {
        name: duplicatedEntityData.name,
        position: new THREE.Vector3(
          duplicatedEntityData.transform.position.x,
          duplicatedEntityData.transform.position.y,
          duplicatedEntityData.transform.position.z
        ),
        rotation: new THREE.Euler(
          duplicatedEntityData.transform.rotation.x,
          duplicatedEntityData.transform.rotation.y,
          duplicatedEntityData.transform.rotation.z
        ),
        scale: new THREE.Vector3(
          duplicatedEntityData.transform.scale.x,
          duplicatedEntityData.transform.scale.y,
          duplicatedEntityData.transform.scale.z
        ),
        material: material,
        castShadow: duplicatedEntityData.castShadow,
        receiveShadow: duplicatedEntityData.receiveShadow,
        ...duplicatedEntityData.properties
      };

      // Apply geometry parameters with proper defaults based on entity type
      const geometryParams = duplicatedEntityData.geometry?.parameters || {};
      let config: any = { ...baseConfig };

      // Add geometry-specific parameters with proper defaults
      if (duplicatedEntityData.type === 'box') {
        config = {
          ...baseConfig,
          width: geometryParams.width || 1,
          height: geometryParams.height || 1,
          depth: geometryParams.depth || 1,
          widthSegments: geometryParams.widthSegments || 1,
          heightSegments: geometryParams.heightSegments || 1,
          depthSegments: geometryParams.depthSegments || 1
        };
      } else if (duplicatedEntityData.type === 'sphere') {
        config = {
          ...baseConfig,
          radius: geometryParams.radius || 1,
          widthSegments: geometryParams.widthSegments || 32,
          heightSegments: geometryParams.heightSegments || 16
        };
      } else {
        // For other geometries, use the original approach but ensure we have geometry params
        config = {
          ...baseConfig,
          ...geometryParams
        };
      }

      // Create the appropriate entity type using the same switch as EntityLoader
      const entityType = duplicatedEntityData.type;
      let newEntity: Entity | null = null;
      switch (entityType) {
        case "box": newEntity = new Box(config); break;
        case "sphere": newEntity = new Sphere(config); break;
        case "cylinder": newEntity = new Cylinder(config); break;
        case "cone": newEntity = new Cone(config); break;
        case "torus": newEntity = new Torus(config); break;
        case "capsule": newEntity = new Capsule(config); break;
        case "ring": newEntity = new Ring(config); break;
        case "plane": newEntity = new Plane(config); break;
        case "heightfield": newEntity = new Heightfield(config); break;
        case "mesh3d": newEntity = new Mesh3D(config); break;
        case "ambient-light": newEntity = new AmbientLight(config); break;
        case "directional-light": newEntity = new DirectionalLight(config); break;
        case "point-light": newEntity = new PointLight(config); break;
        case "spot-light": newEntity = new SpotLight(config); break;
        default: throw new Error(`Unsupported entity type for duplication: ${entityType}`);
      }

      if (newEntity) {
        // Copy tags
        newEntity.metadata.tags = [...sourceEntity.metadata.tags];

        // Copy character controller config if present
        if (sourceEntity.characterControllerConfig) {
          newEntity.characterControllerConfig = { ...sourceEntity.characterControllerConfig };
          newEntity.hasCharacterController = sourceEntity.hasCharacterController;
        }

        // Use GameWorld.createEntity to ensure proper setup (physics manager, script manager, etc.)
        gameWorld.createEntity(newEntity);

        // CRITICAL FIX: Apply physics after entity is added to game world (like EntityLoader does)
        if (sourceEntity.physicsConfig && sourceEntity.hasPhysics()) {
          const physicsConfig = sourceEntity.physicsConfig;
          switch (physicsConfig.type) {
            case 'dynamic':
              newEntity.enableDynamicPhysics(
                physicsConfig.mass || 1,
                physicsConfig.restitution || 0.5,
                physicsConfig.friction || 0.7
              );
              break;
            case 'static':
              newEntity.enableStaticPhysics(
                physicsConfig.restitution || 0.5,
                physicsConfig.friction || 0.7
              );
              break;
            case 'kinematic':
              newEntity.enableKinematicPhysics();
              break;
          }
        }

        // Apply character controller if present in serialized data
        if (duplicatedEntityData.characterController) {
          const characterControllerConfig = { ...duplicatedEntityData.characterController } as any;
          if (characterControllerConfig.colliderOffset) {
            characterControllerConfig.colliderOffset = new THREE.Vector3(
              characterControllerConfig.colliderOffset.x,
              characterControllerConfig.colliderOffset.y,
              characterControllerConfig.colliderOffset.z
            );
          } else {
            characterControllerConfig.colliderOffset = new THREE.Vector3(0, 0, 0);
          }
          newEntity.enableCharacterController(characterControllerConfig);
        }

        // CRITICAL FIX: Handle Mesh3D model loading like EntityLoader does
        if (entityType === 'mesh3d' && duplicatedEntityData.properties?.modelPath) {
          const currentProject = useGameStudioStore.getState().currentProject;
          if (currentProject) {
            try {
                             // Set the AssetManager on the entity before loading (like EntityLoader)
               if ('setAssetManager' in newEntity && typeof newEntity.setAssetManager === 'function') {
                 // Access the assetManager from the GameWorldService instance
                 const assetManager = (gameWorldService as any).assetManager;
                 if (assetManager) {
                   newEntity.setAssetManager(assetManager);
                 }
               }
              
              // Load the model using the same approach as EntityLoader
              if ('loadFromPath' in newEntity && typeof newEntity.loadFromPath === 'function') {
                await newEntity.loadFromPath(currentProject.path, duplicatedEntityData.properties.modelPath);
              }
            } catch (error) {
              console.error(`Failed to load model for duplicated entity ${newEntity.entityId}:`, error);
              // Don't throw here - the entity should still be created even if model loading fails
            }
          }
        }

        // If the source entity has a parent (and it's not the scene), add the new entity to the same parent
        if (sourceEntity.parent && sourceEntity.parent !== gameWorld.getScene()) {
          sourceEntity.parent.add(newEntity);
        }

        // Duplicate children recursively
        const sourceChildren = sourceEntity.children.filter(child => child instanceof Entity) as Entity[];
        for (const childEntity of sourceChildren) {
          const duplicatedChild = await this.duplicateEntity(childEntity, gameWorldService);
          if (duplicatedChild) {
            newEntity.add(duplicatedChild);
          }
        }

        // Notify selection manager about the new entity
        const selectionManager = gameWorldService.getSelectionManager();
        selectionManager.onEntityAdded(newEntity);

        return newEntity;
      }
    } catch (error) {
      console.error("Failed to duplicate entity:", error);
      throw error;
    }

    return null;
  }

  /**
   * Deep clone a material including all textures to avoid WebGPU buffer conflicts
   */
  private static async deepCloneMaterialWithTextures(sourceMaterial: THREE.Material): Promise<THREE.Material> {
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
      console.error("Failed to deep clone material with textures:", error);
      // Fallback to standard clone if deep cloning fails
      const fallbackMaterial = sourceMaterial.clone();
      fallbackMaterial.needsUpdate = true;
      return fallbackMaterial;
    }
  }

  static resetCounter(): void {
    this.entityCounter = 1;
  }
} 