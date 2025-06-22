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

    const scene = gameWorld.getScene();
    const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    
    if (!entitiesRegistry) {
      throw new Error("Entities registry not found");
    }

    let entity: Entity | null = null;
    const spawnPosition = new THREE.Vector3(0, 2, 0); // Spawn slightly above ground

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
      // Add entity to the scene
      scene.add(entity);
      
      // Register entity in the registry
      entitiesRegistry.add(entity.entityId, entity.entityName, entity, {
        tags: entity.metadata.tags,
        type: entity.metadata.type,
      });
      
      // Notify selection manager about the new entity
      const selectionManager = gameWorldService.getSelectionManager();
      selectionManager.onEntityAdded(entity);
      
      return entity;
    }

    return null;
  }

  static resetCounter(): void {
    this.entityCounter = 1;
  }
} 