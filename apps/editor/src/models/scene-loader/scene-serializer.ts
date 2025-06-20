import { GameWorld } from "../game-world";
import { Entity } from "../entity";
import { SceneData, EntityData, CameraData, LightingData, PhysicsData, MaterialData, TextureData } from "./types";
import * as THREE from "three/webgpu";

export class SceneSerializer {
  async serializeScene(gameWorld: GameWorld, sceneName: string): Promise<SceneData> {
    console.log(`Serializing scene: ${sceneName}`);

    try {
      const sceneData: SceneData = {
        version: "1.0.0",
        name: sceneName,
        metadata: {
          created: Date.now(),
          lastModified: Date.now(),
        },
        cameras: await this.serializeCameras(gameWorld),
        lighting: this.serializeLighting(gameWorld),
        physics: this.serializePhysics(gameWorld),
        entities: await this.serializeEntities(gameWorld),
        materials: this.serializeMaterials(gameWorld),
        textures: this.serializeTextures(gameWorld),
      };

      console.log(`Scene "${sceneName}" serialized successfully`);
      return sceneData;
    } catch (error) {
      console.error(`Failed to serialize scene "${sceneName}":`, error);
      throw error;
    }
  }

  private async serializeCameras(gameWorld: GameWorld): Promise<CameraData[]> {
    const cameraManager = gameWorld.getCameraManager();
    const controlManager = gameWorld.getCameraControlManager();
    const cameras: CameraData[] = [];

    // Get all cameras from the registry
    const cameraRegistry = cameraManager.getCameraRegistry();
    cameraRegistry.getAll().forEach((item) => {
      const camera = item.object;
      const controls = controlManager.getControls(item.id);

      const cameraData: CameraData = {
        id: item.id,
        name: item.name,
        type: camera instanceof THREE.OrthographicCamera ? "orthographic" : "perspective",
        position: [camera.position.x, camera.position.y, camera.position.z],
        rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
        active: cameraManager.getActiveCamera() === camera,
        properties: this.serializeCameraProperties(camera),
      };

      if (controls) {
        cameraData.controls = this.serializeCameraControls(controls);
      }

      cameras.push(cameraData);
    });

    return cameras;
  }

  private serializeCameraProperties(camera: THREE.Camera): any {
    if (camera instanceof THREE.PerspectiveCamera) {
      return {
        fov: camera.fov,
        aspect: camera.aspect,
        near: camera.near,
        far: camera.far,
        zoom: camera.zoom,
      };
    } else if (camera instanceof THREE.OrthographicCamera) {
      return {
        left: camera.left,
        right: camera.right,
        top: camera.top,
        bottom: camera.bottom,
        near: camera.near,
        far: camera.far,
        zoom: camera.zoom,
      };
    }

    return {
      near: camera.near,
      far: camera.far,
    };
  }

  private serializeCameraControls(controls: any): any {
    // Detect controls type
    let controlsType = "unknown";
    if (controls.constructor.name === "OrbitControls") {
      controlsType = "orbit";
    }

    const controlsData: any = {
      type: controlsType,
      enabled: controls.enabled !== undefined ? controls.enabled : true,
      properties: {},
    };

    // Serialize OrbitControls properties
    if (controlsType === "orbit") {
      const props = controlsData.properties;
      if (controls.target) {
        props.target = [controls.target.x, controls.target.y, controls.target.z];
      }
      if (controls.enableDamping !== undefined) props.enableDamping = controls.enableDamping;
      if (controls.dampingFactor !== undefined) props.dampingFactor = controls.dampingFactor;
      if (controls.enableZoom !== undefined) props.enableZoom = controls.enableZoom;
      if (controls.zoomSpeed !== undefined) props.zoomSpeed = controls.zoomSpeed;
      if (controls.enableRotate !== undefined) props.enableRotate = controls.enableRotate;
      if (controls.rotateSpeed !== undefined) props.rotateSpeed = controls.rotateSpeed;
      if (controls.enablePan !== undefined) props.enablePan = controls.enablePan;
      if (controls.panSpeed !== undefined) props.panSpeed = controls.panSpeed;
      if (controls.autoRotate !== undefined) props.autoRotate = controls.autoRotate;
      if (controls.autoRotateSpeed !== undefined) props.autoRotateSpeed = controls.autoRotateSpeed;
      if (controls.minDistance !== undefined) props.minDistance = controls.minDistance;
      if (controls.maxDistance !== undefined) props.maxDistance = controls.maxDistance;
      if (controls.minPolarAngle !== undefined) props.minPolarAngle = controls.minPolarAngle;
      if (controls.maxPolarAngle !== undefined) props.maxPolarAngle = controls.maxPolarAngle;
      if (controls.minAzimuthAngle !== undefined) props.minAzimuthAngle = controls.minAzimuthAngle;
      if (controls.maxAzimuthAngle !== undefined) props.maxAzimuthAngle = controls.maxAzimuthAngle;
    }

    return controlsData;
  }

  private serializeLighting(gameWorld: GameWorld): LightingData {
    const lightingData: LightingData = {
      ambient: { color: 0x404040, intensity: 0.4 },
      directional: [],
      point: [],
      spot: [],
    };

    gameWorld.scene.traverse((child) => {
      if (child instanceof THREE.AmbientLight) {
        lightingData.ambient = {
          color: child.color.getHex(),
          intensity: child.intensity,
        };
      } else if (child instanceof THREE.DirectionalLight) {
        const lightData: any = {
          id: child.uuid,
          name: child.name || "Directional Light",
          color: child.color.getHex(),
          intensity: child.intensity,
          position: [child.position.x, child.position.y, child.position.z],
          castShadow: child.castShadow,
        };

        if (child.target && child.target !== child) {
          lightData.target = [child.target.position.x, child.target.position.y, child.target.position.z];
        }

        if (child.castShadow) {
          lightData.shadow = {
            mapSize: [child.shadow.mapSize.width, child.shadow.mapSize.height],
            camera: {
              near: child.shadow.camera.near,
              far: child.shadow.camera.far,
              left: (child.shadow.camera as THREE.OrthographicCamera).left,
              right: (child.shadow.camera as THREE.OrthographicCamera).right,
              top: (child.shadow.camera as THREE.OrthographicCamera).top,
              bottom: (child.shadow.camera as THREE.OrthographicCamera).bottom,
            },
          };
        }

        lightingData.directional.push(lightData);
      } else if (child instanceof THREE.PointLight) {
        const lightData: any = {
          id: child.uuid,
          name: child.name || "Point Light",
          color: child.color.getHex(),
          intensity: child.intensity,
          distance: child.distance,
          decay: child.decay,
          position: [child.position.x, child.position.y, child.position.z],
          castShadow: child.castShadow,
        };

        if (child.castShadow) {
          lightData.shadow = {
            mapSize: [child.shadow.mapSize.width, child.shadow.mapSize.height],
            camera: {
              near: child.shadow.camera.near,
              far: child.shadow.camera.far,
            },
          };
        }

        lightingData.point.push(lightData);
      } else if (child instanceof THREE.SpotLight) {
        const lightData: any = {
          id: child.uuid,
          name: child.name || "Spot Light",
          color: child.color.getHex(),
          intensity: child.intensity,
          distance: child.distance,
          angle: child.angle,
          penumbra: child.penumbra,
          decay: child.decay,
          position: [child.position.x, child.position.y, child.position.z],
          target: [child.target.position.x, child.target.position.y, child.target.position.z],
          castShadow: child.castShadow,
        };

        if (child.castShadow) {
          lightData.shadow = {
            mapSize: [child.shadow.mapSize.width, child.shadow.mapSize.height],
            camera: {
              near: child.shadow.camera.near,
              far: child.shadow.camera.far,
              fov: (child.shadow.camera as THREE.PerspectiveCamera).fov,
            },
          };
        }

        lightingData.spot.push(lightData);
      }
    });

    return lightingData;
  }

  private serializePhysics(gameWorld: GameWorld): PhysicsData {
    const physicsManager = gameWorld.getPhysicsManager();
    
    return {
      enabled: true, // Assume enabled if physics manager exists
      gravity: [0, -9.81, 0], // Default gravity - you might want to get this from physics manager
      debugRender: gameWorld.isPhysicsDebugRenderEnabled(),
      solver: {
        iterations: 10, // Default values - you might want to get these from physics manager
        timestep: 1/60,
      },
    };
  }

  private async serializeEntities(gameWorld: GameWorld): Promise<EntityData[]> {
    const entities: EntityData[] = [];
    const entityRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");

    entityRegistry.getAll().forEach((item) => {
      const entity = item.object;
      const entityData = this.serializeEntity(entity);
      if (entityData) {
        entities.push(entityData);
      }
    });

    return entities;
  }

  private serializeEntity(entity: Entity): EntityData | null {
    try {
      const entityData: EntityData = {
        id: entity.entityId,
        name: entity.entityName,
        type: this.getEntityType(entity),
        position: [entity.position.x, entity.position.y, entity.position.z],
        rotation: [entity.rotation.x, entity.rotation.y, entity.rotation.z],
        scale: [entity.scale.x, entity.scale.y, entity.scale.z],
        visible: entity.visible,
        castShadow: entity.castShadow,
        receiveShadow: entity.receiveShadow,
        userData: { ...entity.userData },
        tags: [...entity.metadata.tags],
        layer: entity.metadata.layer,
      };

      // Serialize geometry if entity is a mesh
      if (entity instanceof THREE.Mesh && entity.geometry) {
        entityData.geometry = this.serializeGeometry(entity.geometry);
      }

      // Serialize material if entity is a mesh
      if (entity instanceof THREE.Mesh && entity.material) {
        entityData.material = this.serializeMaterial(entity.material);
      }

      // Serialize physics properties
      if (entity.rigidBodyId) {
        entityData.physics = {
          enabled: true,
          type: "dynamic", // You might want to get this from the physics manager
          // Add other physics properties as needed
        };
      }

      // Serialize children
      if (entity.children.length > 0) {
        entityData.children = [];
        entity.children.forEach((child) => {
          if (child instanceof Entity) {
            const childData = this.serializeEntity(child);
            if (childData) {
              entityData.children!.push(childData);
            }
          }
        });
      }

      return entityData;
    } catch (error) {
      console.error(`Failed to serialize entity ${entity.entityName}:`, error);
      return null;
    }
  }

  private getEntityType(entity: Entity): string {
    // Try to determine entity type from constructor name or other properties
    const constructorName = entity.constructor.name.toLowerCase();
    
    if (constructorName.includes('sphere')) return 'sphere';
    if (constructorName.includes('box')) return 'box';
    if (constructorName.includes('cylinder')) return 'cylinder';
    if (constructorName.includes('cone')) return 'cone';
    if (constructorName.includes('torus')) return 'torus';
    if (constructorName.includes('capsule')) return 'capsule';
    if (constructorName.includes('ring')) return 'ring';
    if (constructorName.includes('mesh3d')) return 'mesh';
    
    return 'entity'; // Generic entity type
  }

  private serializeGeometry(geometry: THREE.BufferGeometry): any {
    // This is a simplified geometry serialization
    // You might want to enhance this based on your specific geometry types
    return {
      type: geometry.constructor.name,
      parameters: {}, // You might want to extract geometry parameters here
    };
  }

  private serializeMaterial(material: THREE.Material | THREE.Material[]): any {
    if (Array.isArray(material)) {
      // Handle multiple materials
      return {
        type: "MultiMaterial",
        properties: {
          materials: material.map(mat => this.serializeMaterial(mat)),
        },
      };
    }

    return {
      type: material.constructor.name,
      properties: {
        // Extract common material properties
        color: (material as any).color?.getHex?.() || 0xffffff,
        transparent: (material as any).transparent || false,
        opacity: (material as any).opacity || 1,
        metalness: (material as any).metalness || 0,
        roughness: (material as any).roughness || 1,
        // Add more properties as needed
      },
    };
  }

  private serializeMaterials(gameWorld: GameWorld): MaterialData[] {
    // This would collect all unique materials used in the scene
    // For now, return empty array - you can enhance this as needed
    return [];
  }

  private serializeTextures(gameWorld: GameWorld): TextureData[] {
    // This would collect all unique textures used in the scene
    // For now, return empty array - you can enhance this as needed
    return [];
  }
} 