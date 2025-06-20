import { GameWorld } from "../game-world";
import { Entity } from "../entity";
import { SceneData, EntityData, CameraData, LightingData, PhysicsData } from "./types";
import * as THREE from "three/webgpu";

export class SceneSerializer {
  async serializeScene(gameWorld: GameWorld, sceneName: string): Promise<SceneData> {
    console.log(`Serializing scene: ${sceneName}`);

    const entities: EntityData[] = [];
    const entityRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");

    if (entityRegistry) {
      for (const item of entityRegistry.getAllRegistryItems()) {
        const entityData = this.serializeEntity(item.item);
        if (entityData) {
          entities.push(entityData);
        }
      }
    }

    return {
      version: "1.0.0",
      name: sceneName,
      metadata: {
        created: Date.now(),
        modified: Date.now(),
        version: "1.0.0",
      },
      // Note: In the new architecture, these are derived from entities,
      // but for a complete scene file, we serialize them separately.
      cameras: this.serializeCameras(gameWorld),
      lighting: this.serializeLighting(gameWorld),
      physics: this.serializePhysics(gameWorld),
      entities: entities,
      materials: [], // TODO: Implement material serialization
      textures: [],  // TODO: Implement texture serialization
    };
  }

  private serializeEntity(entity: Entity): EntityData | null {
    if (typeof entity.serialize === 'function') {
      return entity.serialize();
    }

    // Fallback for generic entities
    const entityData: EntityData = {
      id: entity.entityId,
      name: entity.entityName,
      type: 'entity',
      transform: {
        position: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
        rotation: { x: entity.rotation.x, y: entity.rotation.y, z: entity.rotation.z },
        scale: { x: entity.scale.x, y: entity.scale.y, z: entity.scale.z },
      },
      visible: entity.visible,
      castShadow: entity.castShadow,
      receiveShadow: entity.receiveShadow,
      userData: { ...entity.userData },
      tags: [...entity.metadata.tags],
      layer: entity.metadata.layer,
    };

    return entityData;
  }

  private serializeCameras(gameWorld: GameWorld): CameraData[] {
    const cameras: CameraData[] = [];
    const cameraEntities = gameWorld.getEntitiesByTag("camera");

    for (const entity of cameraEntities) {
      if ('camera' in entity) {
        const camera = (entity as any).camera as THREE.Camera;

        const cameraData: CameraData = {
          id: entity.entityId,
          name: entity.entityName,
          type: camera instanceof THREE.OrthographicCamera ? "orthographic" : "perspective",
          position: [entity.position.x, entity.position.y, entity.position.z],
          rotation: [entity.rotation.x, entity.rotation.y, entity.rotation.z],
          active: gameWorld.getCameraManager().getActiveCameraId() === entity.entityId,
          properties: this.serializeCameraProperties(camera),
        };

        cameras.push(cameraData);
      }
    }
    return cameras;
  }

  private serializeCameraProperties(camera: THREE.Camera): any {
    if (camera instanceof THREE.PerspectiveCamera) {
      return { fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, zoom: camera.zoom };
    } else if (camera instanceof THREE.OrthographicCamera) {
      return { left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom, near: camera.near, far: camera.far, zoom: camera.zoom };
    }
    return {};
  }

  private serializeLighting(gameWorld: GameWorld): LightingData {
    const lightingData: LightingData = {
      ambient: { color: 0x404040, intensity: 0.4 },
      directional: [],
      point: [],
      spot: [],
    };

    const lightEntities = gameWorld.getEntitiesByTag("light");
    for (const entity of lightEntities) {
      const light = (entity as any).light as THREE.Light;
      const lightProps = {
        id: entity.entityId,
        name: entity.entityName,
        color: light.color.getHex(),
        intensity: light.intensity,
        position: [entity.position.x, entity.position.y, entity.position.z],
        castShadow: (light as any).castShadow || false,
      };

      if (light instanceof THREE.AmbientLight) {
        lightingData.ambient = { color: light.color.getHex(), intensity: light.intensity };
      } else if (light instanceof THREE.DirectionalLight) {
        lightingData.directional.push({ ...lightProps, target: [light.target.position.x, light.target.position.y, light.target.position.z] });
      } else if (light instanceof THREE.PointLight) {
        lightingData.point.push({ ...lightProps, distance: light.distance, decay: light.decay });
      } else if (light instanceof THREE.SpotLight) {
        lightingData.spot.push({ ...lightProps, distance: light.distance, decay: light.decay, angle: light.angle, penumbra: light.penumbra, target: [light.target.position.x, light.target.position.y, light.target.position.z] });
      }
    }

    return lightingData;
  }

  private serializePhysics(gameWorld: GameWorld): PhysicsData {
    const physicsManager = gameWorld.getPhysicsManager();
    const gravity = physicsManager.getGravity();
    return {
      enabled: physicsManager.isEnabled(),
      gravity: [gravity.x, gravity.y, gravity.z],
      debugRender: gameWorld.isPhysicsDebugRenderEnabled(),
      solver: { iterations: 10, timestep: 1 / 60 },
    };
  }
}