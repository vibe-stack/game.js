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
  Entity
} from "@/models";
import { GameWorldService } from "../../services/game-world-service";

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
          distance: 10,
          castShadow: true,
        });
        break;
        
      case "spot-light":
        entity = new SpotLight({
          name: `Spot Light ${this.entityCounter++}`,
          position: new THREE.Vector3(0, 5, 0),
          color: 0xffffff,
          intensity: 1,
          distance: 10,
          angle: Math.PI / 4,
          penumbra: 0.1,
          castShadow: true,
        });
        break;
      
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    if (entity) {
      // Use GameWorld.createEntity to ensure proper setup (physics, script manager, interaction manager, etc.)
      gameWorld.createEntity(entity);
      
      // Notify selection manager about the new entity
      const selectionManager = gameWorldService.getSelectionManager();
      selectionManager.onEntityAdded(entity);
      
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

      // Create new entity with duplicated data but new IDs
      const duplicatedConfig: any = {
        name: `${sourceEntity.entityName} Copy`,
        position: new THREE.Vector3().copy(sourceEntity.position).add(new THREE.Vector3(1, 0, 1)), // Offset slightly
        rotation: new THREE.Euler().copy(sourceEntity.rotation),
        scale: new THREE.Vector3().copy(sourceEntity.scale),
        castShadow: serializedData.castShadow,
        receiveShadow: serializedData.receiveShadow,
        // Copy physics config if present
        physics: sourceEntity.physicsConfig ? { ...sourceEntity.physicsConfig } : undefined,
        // Copy properties from serialized data
        ...serializedData.properties,
        // Copy geometry parameters if present
        ...(serializedData.geometry?.parameters || {})
      };

      let newEntity: Entity | null = null;

      // Create the appropriate entity type based on the serialized data type
      const entityType = serializedData.type;
      switch (entityType) {
        case "sphere":
          newEntity = new Sphere(duplicatedConfig);
          break;
        case "box":
          newEntity = new Box(duplicatedConfig);
          break;
        case "plane":
          newEntity = new Plane(duplicatedConfig);
          break;
        case "cylinder":
          newEntity = new Cylinder(duplicatedConfig);
          break;
        case "cone":
          newEntity = new Cone(duplicatedConfig);
          break;
        case "torus":
          newEntity = new Torus(duplicatedConfig);
          break;
        case "capsule":
          newEntity = new Capsule(duplicatedConfig);
          break;
        case "ring":
          newEntity = new Ring(duplicatedConfig);
          break;
        case "tetrahedron":
          newEntity = new Tetrahedron(duplicatedConfig);
          break;
        case "octahedron":
          newEntity = new Octahedron(duplicatedConfig);
          break;
        case "dodecahedron":
          newEntity = new Dodecahedron(duplicatedConfig);
          break;
        case "icosahedron":
          newEntity = new Icosahedron(duplicatedConfig);
          break;
        case "heightfield":
          newEntity = new Heightfield(duplicatedConfig);
          break;
        case "custom-heightfield":
          newEntity = new CustomHeightfield(duplicatedConfig);
          break;
        case "ambient-light":
          newEntity = new AmbientLight(duplicatedConfig);
          break;
        case "directional-light":
          newEntity = new DirectionalLight(duplicatedConfig);
          break;
        case "point-light":
          newEntity = new PointLight(duplicatedConfig);
          break;
        case "spot-light":
          newEntity = new SpotLight(duplicatedConfig);
          break;
        default:
          throw new Error(`Unsupported entity type for duplication: ${entityType}`);
      }

      if (newEntity) {
        // Copy material if the source entity has one
        if ('getMaterial' in sourceEntity && typeof sourceEntity.getMaterial === 'function') {
          const sourceMaterial = sourceEntity.getMaterial();
          if (sourceMaterial && 'setMaterial' in newEntity && typeof newEntity.setMaterial === 'function') {
            // Clone the material to avoid sharing the same instance
            const clonedMaterial = sourceMaterial.clone();
            newEntity.setMaterial(clonedMaterial);
          }
        }

        // Copy tags
        newEntity.metadata.tags = [...sourceEntity.metadata.tags];

        // Copy character controller config if present
        if (sourceEntity.characterControllerConfig) {
          newEntity.characterControllerConfig = { ...sourceEntity.characterControllerConfig };
          newEntity.hasCharacterController = sourceEntity.hasCharacterController;
        }

        // Use GameWorld.createEntity to ensure proper setup
        gameWorld.createEntity(newEntity);

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

  static resetCounter(): void {
    this.entityCounter = 1;
  }
} 