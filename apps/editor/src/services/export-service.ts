import type { GameWorld } from "./game-world";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import JSZip from "jszip";
import useGameStudioStore from "@/stores/game-studio-store";
import { GameScene, GameObject } from "@/types/project";

export class ClientExportService {
  private readonly gameWorld: GameWorld;

  constructor(gameWorld: GameWorld) {
    this.gameWorld = gameWorld;
  }

  async exportAsJSON(): Promise<Blob> {
    const scene = this.gameWorld.getScene();
    if (!scene) {
      throw new Error("No scene loaded");
    }

    const currentProject = useGameStudioStore.getState().currentProject;
    if (!currentProject) {
      throw new Error("No project loaded");
    }

    // Create ZIP file
    const zip = new JSZip();

    // Add the scene JSON
    const sceneData = JSON.stringify(scene, null, 2);
    zip.file("scene.json", sceneData);

    // Add package.json with metadata
    const packageInfo = {
      name: scene.name ? scene.name.toLowerCase().replace(/\s+/g, "-") : "exported-scene",
      version: "1.0.0",
      description: `Exported scene: ${scene.name || "Unknown"}`,
      type: "gamejs-scene",
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
    zip.file("package.json", JSON.stringify(packageInfo, null, 2));

    return zip.generateAsync({ type: "blob" });
  }

  async exportAsThreeJSON(): Promise<Blob> {
    const threeScene = this.gameWorld.getThreeScene();
    if (!threeScene) {
      throw new Error("No Three.js scene available - viewport not initialized");
    }

    // Export using Three.js toJSON method - uses the actual rendered scene!
    const result = threeScene.toJSON();

    // Create ZIP file
    const zip = new JSZip();

    // Add the Three.js JSON
    zip.file("scene.json", JSON.stringify(result, null, 2));

    // Add README
    const readme = `# Three.js Scene Export

This is a Three.js scene exported from GameJS Editor.

## Files:
- scene.json: The main Three.js scene data

## Usage:
Load the scene.json file using THREE.ObjectLoader in your Three.js application.
`;
    zip.file("README.md", readme);

    return zip.generateAsync({ type: "blob" });
  }

  async exportAsGLB(): Promise<Blob> {
    const threeScene = this.gameWorld.getThreeScene();
    if (!threeScene) {
      throw new Error("No Three.js scene available - viewport not initialized");
    }

    // Export using GLTFExporter directly from the rendered scene!
    const exporter = new GLTFExporter();
    
    return new Promise((resolve, reject) => {
      exporter.parse(
        threeScene,
        (result: any) => {
          if (result instanceof ArrayBuffer) {
            resolve(new Blob([result], { type: "model/gltf-binary" }));
          } else {
            // Convert JSON to GLB
            const json = JSON.stringify(result);
            const blob = new Blob([json], { type: "model/gltf+json" });
            resolve(blob);
          }
        },
        (error: any) => {
          reject(error);
        },
        {
          binary: true,
          includeCustomExtensions: true,
          animations: []
        }
      );
    });
  }
}