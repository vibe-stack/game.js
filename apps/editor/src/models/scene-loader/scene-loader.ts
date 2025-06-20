import { GameWorld } from "../game-world";
import { EntityLoader } from "./entity-loader";
import { PhysicsLoader } from "./physics-loader";
import { SceneData, LoaderContext } from "./types";
import * as THREE from "three/webgpu";

export class SceneLoader {
  private entityLoader: EntityLoader;
  private physicsLoader: PhysicsLoader;

  constructor() {
    this.entityLoader = new EntityLoader();
    this.physicsLoader = new PhysicsLoader();
  }

  async loadScene(gameWorld: GameWorld, sceneData: SceneData): Promise<void> {
    console.log(`Loading scene: ${sceneData.name} (version ${sceneData.metadata.version || 'unknown'})`);

    const context: LoaderContext = {
      gameWorld,
      materials: new Map(),
      geometries: new Map(),
      textures: new Map(),
    };

    try {
      gameWorld.scene.clear();
      
      const physicsData = sceneData.world.physics;
      if (physicsData) {
        await this.physicsLoader.load(context, physicsData);
      }
      console.log("Loading entities");
      await this.entityLoader.load(context, sceneData.entities);

      console.log(`Scene "${sceneData.name}" loaded with ${sceneData.entities.length} entities.`);
    } catch (error) {
      console.error(`Failed to load scene "${sceneData.name}":`, error);
      throw error;
    }
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
          backgroundColor: "#87CEEB", environment: "",
          fog: { enabled: false, color: "#ffffff", near: 10, far: 100 },
          shadows: { enabled: true, type: "pcfsoft" },
          antialias: true, pixelRatio: 1,
        },
      },
      activeCamera: "main-camera",
      assets: [],
      editor: { showGrid: true, gridSize: 1, showHelpers: true, showWireframe: false, debugPhysics: false },
      metadata: { created: now, modified: now, version: "1.0.0" },
    };
  }
}