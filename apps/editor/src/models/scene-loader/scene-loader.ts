import { GameWorld } from "../game-world";
import { EntityLoader } from "./entity-loader";
import { CameraLoader } from "./camera-loader";
import { LightingLoader } from "./lighting-loader";
import { PhysicsLoader } from "./physics-loader";
import { SceneData, LoaderContext } from "./types";
import * as THREE from "three/webgpu";

export class SceneLoader {
  private entityLoader: EntityLoader;
  private cameraLoader: CameraLoader;
  private lightingLoader: LightingLoader;
  private physicsLoader: PhysicsLoader;

  constructor() {
    this.entityLoader = new EntityLoader();
    this.cameraLoader = new CameraLoader();
    this.lightingLoader = new LightingLoader();
    this.physicsLoader = new PhysicsLoader();
  }

  async loadScene(gameWorld: GameWorld, sceneData: SceneData): Promise<void> {
    console.log(`Loading scene: ${sceneData.name} (version ${sceneData.version})`);

    // Create loader context
    const context: LoaderContext = {
      gameWorld,
      materials: new Map(),
      geometries: new Map(),
      textures: new Map(),
    };

    try {
      // Clear any existing scene content first - following kitchen sink pattern
      console.log("Clearing existing scene content...");
      gameWorld.scene.clear();

      // Load in specific order to ensure dependencies are resolved
      console.log("Loading textures...");
      await this.loadTextures(context, sceneData.textures || []);
      
      console.log("Loading materials...");
      await this.loadMaterials(context, sceneData.materials || []);
      
      // Handle physics configuration first, before entities
      console.log("Configuring physics...");
      const physicsData = (sceneData as any).world?.physics || sceneData.physics;
      if (physicsData) {
        await this.loadPhysics(context, physicsData);
      }
      
      // Handle lighting setup early to ensure proper illumination
      console.log("Setting up lighting...");
      if (sceneData.lighting) {
        console.log("Loading from dedicated lighting property");
        await this.loadLighting(context, sceneData.lighting);
      }
      
      // Handle cameras setup
      console.log("Setting up cameras...");
      const entityData = sceneData.entities || [];
      const cameras = sceneData.cameras || entityData.filter((entity: any) => entity.type === 'camera');
      if (cameras.length > 0) {
        // Convert entity format to camera format if needed
        const cameraData = sceneData.cameras ? cameras : this.createCameraDataFromEntities(cameras);
        await this.loadCameras(context, cameraData);
      }
      
      // Finally, load all entities (including lights now) - physics colliders get created here
      console.log("Loading entities...");
      const allEntities = entityData.filter((entity: any) => 
        entity.type !== 'camera' // Keep lights, they're now handled as entities
      );
      await this.loadEntities(context, allEntities);

      console.log(`Scene "${sceneData.name}" loaded successfully with ${allEntities.length} entities`);
    } catch (error) {
      console.error(`Failed to load scene "${sceneData.name}":`, error);
      throw error;
    }
  }

  private async loadTextures(context: LoaderContext, textureData: any[]): Promise<void> {
    if (textureData.length === 0) {
      console.log("No textures to load");
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    
    for (const texData of textureData) {
      try {
        const texture = await textureLoader.loadAsync(texData.url);
        
        // Apply texture properties
        texture.wrapS = texData.wrapS || THREE.RepeatWrapping;
        texture.wrapT = texData.wrapT || THREE.RepeatWrapping;
        texture.magFilter = texData.magFilter || THREE.LinearFilter;
        texture.minFilter = texData.minFilter || THREE.LinearMipmapLinearFilter;
        texture.format = texData.format || THREE.RGBAFormat;
        texture.type = texData.type || THREE.UnsignedByteType;
        texture.anisotropy = texData.anisotropy || 1;
        texture.flipY = texData.flipY !== false;
        texture.generateMipmaps = texData.generateMipmaps !== false;

        context.textures.set(texData.id, texture);
        console.log(`Loaded texture: ${texData.name}`);
      } catch (error) {
        console.warn(`Failed to load texture ${texData.name} (${texData.url}):`, error);
      }
    }
  }

  private async loadMaterials(context: LoaderContext, materialData: any[]): Promise<void> {
    if (materialData.length === 0) {
      console.log("No materials to load");
      return;
    }

    for (const matData of materialData) {
      try {
        let material: THREE.Material;

        // Create material based on type
        switch (matData.type) {
          case "MeshStandardMaterial":
            material = new THREE.MeshStandardMaterial();
            break;
          case "MeshBasicMaterial":
            material = new THREE.MeshBasicMaterial();
            break;
          case "MeshPhysicalMaterial":
            material = new THREE.MeshPhysicalMaterial();
            break;
          case "MeshLambertMaterial":
            material = new THREE.MeshLambertMaterial();
            break;
          case "MeshPhongMaterial":
            material = new THREE.MeshPhongMaterial();
            break;
          default:
            material = new THREE.MeshStandardMaterial();
        }

        // Apply material properties
        Object.keys(matData.properties).forEach(key => {
          if (key in material) {
            (material as any)[key] = matData.properties[key];
          }
        });

        // Apply texture maps
        if (matData.maps) {
          Object.keys(matData.maps).forEach(mapType => {
            const textureId = matData.maps[mapType];
            const texture = context.textures.get(textureId);
            if (texture) {
              (material as any)[mapType] = texture;
            }
          });
        }

        material.name = matData.name;
        context.materials.set(matData.id, material);
        console.log(`Created material: ${matData.name}`);
      } catch (error) {
        console.warn(`Failed to create material ${matData.name}:`, error);
      }
    }
  }

  private async loadPhysics(context: LoaderContext, physicsData: any): Promise<void> {
    await this.physicsLoader.load(context, physicsData);
  }

  private async loadLighting(context: LoaderContext, lightingData: any): Promise<void> {
    await this.lightingLoader.load(context, lightingData);
  }

  private async loadCameras(context: LoaderContext, cameraData: any[]): Promise<void> {
    await this.cameraLoader.load(context, cameraData);
  }

  private async loadEntities(context: LoaderContext, entityData: any[]): Promise<void> {
    await this.entityLoader.load(context, entityData);
  }

  private createLightingDataFromEntities(lightEntities: any[]): any {
    const lightingData: any = {
      ambient: { color: 0x404040, intensity: 0.4 },
      directional: [],
      point: [],
      spot: []
    };

    lightEntities.forEach(entity => {
      const transform = entity.transform || {};
      const position = transform.position || { x: 0, y: 0, z: 0 };
      const props = entity.properties || {};
      
      switch (props.type) {
        case 'ambient':
          lightingData.ambient = {
            color: props.color || '#404040',
            intensity: props.intensity || 0.4
          };
          break;
        case 'directional':
          lightingData.directional.push({
            id: entity.id,
            name: entity.name,
            color: props.color || '#ffffff',
            intensity: props.intensity || 1.0,
            position: [position.x, position.y, position.z],
            castShadow: props.castShadow || false
          });
          break;
        case 'point':
          lightingData.point.push({
            id: entity.id,
            name: entity.name,
            color: props.color || '#ffffff',
            intensity: props.intensity || 1.0,
            distance: props.distance || 0,
            decay: props.decay || 1,
            position: [position.x, position.y, position.z],
            castShadow: props.castShadow || false
          });
          break;
        case 'spot':
          lightingData.spot.push({
            id: entity.id,
            name: entity.name,
            color: props.color || '#ffffff',
            intensity: props.intensity || 1.0,
            distance: props.distance || 0,
            angle: props.angle || Math.PI / 3,
            penumbra: props.penumbra || 0,
            decay: props.decay || 1,
            position: [position.x, position.y, position.z],
            target: props.target || [0, 0, 0],
            castShadow: props.castShadow || false
          });
          break;
      }
    });

    return lightingData;
  }

  private createCameraDataFromEntities(cameraEntities: any[]): any[] {
    return cameraEntities.map(entity => {
      const transform = entity.transform || {};
      const position = transform.position || { x: 0, y: 0, z: 0 };
      const rotation = transform.rotation || { x: 0, y: 0, z: 0 };
      const props = entity.properties || {};
      
      return {
        id: entity.id,
        name: entity.name,
        type: props.type || 'perspective',
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        active: props.isActive || false,
        properties: {
          fov: props.fov || 75,
          aspect: props.aspect || 1,
          near: props.near || 0.1,
          far: props.far || 1000,
          zoom: props.zoom || 1
        }
      };
    });
  }

  static validateSceneData(sceneData: any): sceneData is SceneData {
    console.log("Validating scene data:", sceneData);
    if (!sceneData || typeof sceneData !== 'object') {
      console.log("Scene data validation failed: not an object");
      return false;
    }

    // Accept the canonical JSON format - just need entities array
    const hasEntities = sceneData.entities && Array.isArray(sceneData.entities);
    
    if (!hasEntities) {
      console.log("Scene data validation failed: missing entities array");
      return false;
    }
    
    console.log(`Scene data validation passed: found ${sceneData.entities.length} entities`);
    return true;
  }

  static getDefaultSceneData(): SceneData {
    return {
      version: "1.0.0",
      name: "New Scene",
      metadata: {
        created: Date.now(),
        lastModified: Date.now(),
      },
      cameras: [{
        id: "default-camera",
        name: "Default Camera",
        type: "perspective",
        position: [0, 5, 10],
        rotation: [0, 0, 0],
        active: true,
        properties: {
          fov: 75,
          near: 0.1,
          far: 1000,
        },
      }],
      lighting: {
        ambient: {
          color: 0x404040,
          intensity: 0.4,
        },
        directional: [{
          id: "default-sun",
          name: "Sun Light",
          color: 0xffffff,
          intensity: 0.8,
          position: [10, 10, 10],
          castShadow: true,
          shadow: {
            mapSize: [2048, 2048],
            camera: {
              near: 0.1,
              far: 50,
              left: -20,
              right: 20,
              top: 20,
              bottom: -20,
            },
          },
        }],
        point: [],
        spot: [],
      },
      physics: {
        enabled: true,
        gravity: [0, -9.81, 0],
        debugRender: false,
        solver: {
          iterations: 10,
          timestep: 1/60,
        },
      },
      entities: [
        {
          id: "default-ground",
          name: "Ground",
          type: "plane",
          position: [0, 0, 0],
          rotation: [-Math.PI / 2, 0, 0],
          scale: [10, 10, 1],
          visible: true,
          castShadow: false,
          receiveShadow: true,
          layer: 0,
          tags: ["ground"],
          geometry: {
            type: "PlaneGeometry",
            parameters: {
              width: 10,
              height: 10,
            },
          },
          material: {
            type: "MeshStandardMaterial",
            properties: {
              color: 0x808080,
              roughness: 0.8,
              metalness: 0.1,
            },
          },
          physics: {
            enabled: true,
            type: "static",
            colliderShape: "box",
          },
          userData: {},
        },
        {
          id: "default-cube",
          name: "Cube",
          type: "box",
          position: [0, 8, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          castShadow: true,
          receiveShadow: true,
          layer: 0,
          tags: ["geometry"],
          geometry: {
            type: "BoxGeometry",
            parameters: {
              width: 1,
              height: 1,
              depth: 1,
            },
          },
          material: {
            type: "MeshStandardMaterial",
            properties: {
              color: 0x44aa88,
              roughness: 0.4,
              metalness: 0.1,
            },
          },
          physics: {
            enabled: true,
            type: "dynamic",
            colliderShape: "box",
          },
          userData: {},
        },
        {
          id: "default-sphere",
          name: "Sphere",
          type: "sphere",
          position: [0.2, 4, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          castShadow: true,
          receiveShadow: true,
          layer: 0,
          tags: ["geometry"],
          geometry: {
            type: "SphereGeometry",
            parameters: {
              radius: 0.5,
              widthSegments: 32,
              heightSegments: 16,
            },
          },
          material: {
            type: "MeshStandardMaterial",
            properties: {
              color: 0xaa4444,
              roughness: 0.3,
              metalness: 0.2,
            },
          },
          physics: {
            enabled: true,
            type: "dynamic",
            colliderShape: "sphere",
          },
          userData: {},
        },
      ],
      materials: [
        {
          id: "default-ground-material",
          name: "Ground Material",
          type: "MeshStandardMaterial",
          properties: {
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.1,
          },
        },
        {
          id: "default-cube-material", 
          name: "Cube Material",
          type: "MeshStandardMaterial",
          properties: {
            color: 0x44aa88,
            roughness: 0.4,
            metalness: 0.1,
          },
        },
        {
          id: "default-sphere-material",
          name: "Sphere Material", 
          type: "MeshStandardMaterial",
          properties: {
            color: 0xaa4444,
            roughness: 0.3,
            metalness: 0.2,
          },
        },
      ],
      textures: [],
    };
  }
} 