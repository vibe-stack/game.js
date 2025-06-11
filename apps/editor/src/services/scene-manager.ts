import fs from "fs/promises";
import path from "path";
import { ProjectManager } from "./project-manager";

export class SceneManager {
  constructor(private projectManager: ProjectManager) {}

  async loadScene(projectPath: string, sceneName: string): Promise<GameScene> {
    const scenePath = path.join(projectPath, "scenes", `${sceneName}.json`);
    const sceneContent = await fs.readFile(scenePath, "utf-8");
    return JSON.parse(sceneContent) as GameScene;
  }

  async saveScene(projectPath: string, scene: GameScene): Promise<void> {
    const scenePath = path.join(projectPath, "scenes", `${scene.id}.json`);
    scene.metadata.modified = new Date();
    const sceneData = JSON.stringify(scene, null, 2);
    await fs.writeFile(scenePath, sceneData, "utf-8");
  }

  async createScene(
    projectPath: string,
    sceneName: string,
  ): Promise<GameScene> {
    const sluggedName = sceneName.toLowerCase().replace(/\s+/g, "-");
    const scenePath = path.join(projectPath, "scenes", `${sluggedName}.json`);

    // Check if scene already exists
    try {
      await fs.access(scenePath);
      throw new Error(`Scene "${sceneName}" already exists`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const now = new Date();

    // Create minimal scene with a cube at 0,0,0
    const scene: GameScene = {
      id: sluggedName,
      name: sceneName,
      objects: [
        {
          id: "main-camera",
          name: "Main Camera",
          transform: {
            position: { x: 0, y: 5, z: 10 },
            rotation: { x: -0.2, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          components: [
            {
              id: "camera-component",
              type: "PerspectiveCamera",
              enabled: true,
              properties: {
                fov: 75,
                near: 0.1,
                far: 1000,
                isMain: true,
              },
            },
          ],
          children: [],
          visible: true,
          tags: ["camera"],
          layer: 0,
        },
        {
          id: "directional-light",
          name: "Directional Light",
          transform: {
            position: { x: 5, y: 10, z: 5 },
            rotation: { x: -1, y: 0.5, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          components: [
            {
              id: "light-component",
              type: "DirectionalLight",
              enabled: true,
              properties: {
                color: "#ffffff",
                intensity: 1,
                castShadow: true,
                shadowMapSize: 1024,
                shadowCameraNear: 0.5,
                shadowCameraFar: 50,
                shadowCameraLeft: -10,
                shadowCameraRight: 10,
                shadowCameraTop: 10,
                shadowCameraBottom: -10,
              },
            },
          ],
          children: [],
          visible: true,
          tags: ["light"],
          layer: 0,
        },
        {
          id: "cube",
          name: "Cube",
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          components: [
            {
              id: "mesh-component",
              type: "Mesh",
              enabled: true,
              properties: {
                geometry: "box",
                material: "standard",
                geometryProps: {
                  width: 1,
                  height: 1,
                  depth: 1,
                  widthSegments: 1,
                  heightSegments: 1,
                  depthSegments: 1,
                },
                materialProps: {
                  color: "#ffffff",
                  metalness: 0.1,
                  roughness: 0.3,
                },
                castShadow: true,
                receiveShadow: true,
              },
            },
          ],
          children: [],
          visible: true,
          tags: ["geometry"],
          layer: 0,
        },
      ],
      materials: [],
      editorConfig: {
        showHelperGrid: true,
        gridSize: 1,
        backgroundColor: "#2a2a2a",
        renderType: "solid",
        showLights: true,
        showCameras: true,
        enableFog: false,
        fogColor: "#ffffff",
        fogNear: 1,
        fogFar: 100,
      },
      runtimeConfig: {
        backgroundColor: "#87CEEB",
        environment: "none",
        shadowsEnabled: true,
        shadowType: "pcf",
        antialias: true,
        physicallyCorrectLights: true,
        toneMapping: "aces",
        exposure: 1,
      },
      physicsWorld: {
        gravity: { x: 0, y: -9.81, z: 0 },
        integrationParameters: {
          dt: 1 / 60,
          minCcdDt: 1 / 60 / 100,
          erp: 0.8,
          damping: 0.99,
          jointErp: 1.0,
          jointDamping: 1.0,
          allowedLinearError: 0.001,
          allowedAngularError: 0.0087,
          maxVelocityIterations: 4,
          maxVelocityFrictionIterations: 8,
          maxStabilizationIterations: 1,
          interleaveRestitutionAndFrictionResolution: true,
          minIslandSize: 128,
          maxCcdSubsteps: 1,
        },
        collisionDetection: {
          predictionDistance: 0.002,
          allowedLinearError: 0.001,
        },
        debugRender: {
          enabled: false,
          renderBodies: true,
          renderShapes: true,
          renderJoints: true,
          renderMultibodyJoints: false,
          renderContacts: false,
          renderCollisionEvents: false,
          contactPointLength: 0.1,
          contactNormalLength: 0.1,
        },
      },
      assets: [],
      activeCamera: "main-camera",
      lightingSetup: {},
      metadata: {
        created: now,
        modified: now,
        version: "1.0.0",
      },
    };

    await this.saveScene(projectPath, scene);

    // Update project's scenes list
    const project = await this.projectManager.openProject(projectPath);
    if (!project.scenes.includes(sluggedName)) {
      project.scenes.push(sluggedName);
      await this.projectManager.saveProject(project);
    }

    return scene;
  }

  async listScenes(projectPath: string): Promise<string[]> {
    const scenesDir = path.join(projectPath, "scenes");
    try {
      const files = await fs.readdir(scenesDir);
      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""));
    } catch {
      return [];
    }
  }

  createDefaultScene(): GameScene {
    const now = new Date();

    return {
      id: "main-scene",
      name: "Main Scene",
      objects: [
        {
          id: "main-camera",
          name: "Main Camera",
          transform: {
            position: { x: 0, y: 5, z: 10 },
            rotation: { x: -0.2, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          components: [
            {
              id: "camera-component",
              type: "PerspectiveCamera",
              enabled: true,
              properties: {
                fov: 75,
                near: 0.1,
                far: 1000,
                isMain: true,
              },
            },
          ],
          children: [],
          visible: true,
          tags: ["camera"],
          layer: 0,
        },
        {
          id: "directional-light",
          name: "Directional Light",
          transform: {
            position: { x: 5, y: 10, z: 5 },
            rotation: { x: -1, y: 0.5, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          components: [
            {
              id: "light-component",
              type: "DirectionalLight",
              enabled: true,
              properties: {
                color: "#ffffff",
                intensity: 1,
                castShadow: true,
                shadowMapSize: 1024,
                shadowCameraNear: 0.5,
                shadowCameraFar: 50,
                shadowCameraLeft: -10,
                shadowCameraRight: 10,
                shadowCameraTop: 10,
                shadowCameraBottom: -10,
              },
            },
          ],
          children: [],
          visible: true,
          tags: ["light"],
          layer: 0,
        },
      ],
      materials: [],
      editorConfig: {
        showHelperGrid: true,
        gridSize: 1,
        backgroundColor: "#2a2a2a",
        renderType: "solid",
        showLights: true,
        showCameras: true,
        enableFog: false,
        fogColor: "#ffffff",
        fogNear: 1,
        fogFar: 100,
      },
      runtimeConfig: {
        backgroundColor: "#87CEEB",
        environment: "none",
        shadowsEnabled: true,
        shadowType: "pcf",
        antialias: true,
        physicallyCorrectLights: true,
        toneMapping: "aces",
        exposure: 1,
      },
      physicsWorld: {
        gravity: { x: 0, y: -9.81, z: 0 },
        integrationParameters: {
          dt: 1 / 60,
          minCcdDt: 1 / 60 / 100,
          erp: 0.8,
          damping: 0.99,
          jointErp: 1.0,
          jointDamping: 1.0,
          allowedLinearError: 0.001,
          allowedAngularError: 0.0087,
          maxVelocityIterations: 4,
          maxVelocityFrictionIterations: 8,
          maxStabilizationIterations: 1,
          interleaveRestitutionAndFrictionResolution: true,
          minIslandSize: 128,
          maxCcdSubsteps: 1,
        },
        collisionDetection: {
          predictionDistance: 0.002,
          allowedLinearError: 0.001,
        },
        debugRender: {
          enabled: false,
          renderBodies: true,
          renderShapes: true,
          renderJoints: true,
          renderMultibodyJoints: false,
          renderContacts: false,
          renderCollisionEvents: false,
          contactPointLength: 0.1,
          contactNormalLength: 0.1,
        },
      },
      assets: [],
      activeCamera: "main-camera",
      lightingSetup: {},
      metadata: {
        created: now,
        modified: now,
        version: "1.0.0",
      },
    };
  }
} 