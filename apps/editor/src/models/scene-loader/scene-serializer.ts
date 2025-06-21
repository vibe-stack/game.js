import { GameWorld } from "../game-world";
import { Entity } from "../entity";
import { SceneData } from "../../types/project";
import * as THREE from "three/webgpu";

export class SceneSerializer {
  async serializeScene(gameWorld: GameWorld, sceneName: string): Promise<SceneData> {
    console.log(`Serializing scene: ${sceneName}`);

    // For the snapshot, we'll create a minimal structure that matches SceneData
    const physicsManager = gameWorld.getPhysicsManager();
    const gravity = physicsManager.getGravity();

    // Get entities from the registry and serialize them
    const entities: any[] = [];
    const entityRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");

    if (entityRegistry) {
      for (const item of entityRegistry.getAllRegistryItems()) {
        if (typeof item.item.serialize === 'function') {
          const serialized = item.item.serialize();
          if (serialized) {
            entities.push(serialized);
          }
        }
      }
    }

    return {
      id: `scene_${Date.now()}`,
      name: sceneName,
      entities: entities,
      world: {
        gravity: { x: gravity.x, y: gravity.y, z: gravity.z },
        physics: {
          enabled: physicsManager.isEnabled(),
          timeStep: 1/60,
          maxSubSteps: 10,
        },
        rendering: {
          backgroundColor: "#87CEEB",
          environment: "",
          fog: {
            enabled: false,
            color: "#ffffff",
            near: 10,
            far: 100,
          },
          shadows: {
            enabled: true,
            type: "pcfsoft",
          },
          antialias: true,
          pixelRatio: 1,
        },
      },
      activeCamera: gameWorld.getCameraManager().getActiveCameraId() || undefined,
      assets: [],
      editor: {
        showGrid: true,
        gridSize: 1,
        showHelpers: true,
        showWireframe: false,
        debugPhysics: gameWorld.isPhysicsDebugRenderEnabled(),
      },
      metadata: {
        created: Date.now(),
        modified: Date.now(),
        version: "1.0.0",
      },
    };
  }
}