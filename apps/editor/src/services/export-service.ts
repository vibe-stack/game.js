import type { GameWorld } from "./game-world";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import JSZip from "jszip";
import useEditorStore from "@/stores/editor-store";

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

    const currentProject = useEditorStore.getState().currentProject;
    if (!currentProject) {
      throw new Error("No project loaded");
    }

    // Create ZIP file
    const zip = new JSZip();

    // Add the scene JSON
    const sceneData = JSON.stringify(scene, null, 2);
    zip.file("scene.json", sceneData);

    // Bundle all referenced assets
    await this.bundleAssets(zip, scene, currentProject.path);

    // Add package.json with metadata
    const packageInfo = {
      name: scene.name.toLowerCase().replace(/\s+/g, "-"),
      version: scene.metadata.version,
      description: `Exported scene: ${scene.name}`,
      type: "gamejs-scene",
      created: scene.metadata.created,
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

    const gameScene = this.gameWorld.getScene();
    if (!gameScene) {
      throw new Error("No scene loaded");
    }

    const currentProject = useEditorStore.getState().currentProject;
    if (!currentProject) {
      throw new Error("No project loaded");
    }

    // Export using Three.js toJSON method - uses the actual rendered scene!
    const result = threeScene.toJSON();

    // Create ZIP file
    const zip = new JSZip();

    // Add the Three.js JSON
    zip.file("scene.json", JSON.stringify(result, null, 2));

    // Bundle assets that Three.js can use
    await this.bundleAssets(zip, gameScene, currentProject.path, ["texture", "model"]);

    // Add README
    const readme = `# Three.js Scene Export

This is a Three.js scene exported from GameJS Editor.

## Files:
- scene.json: The main Three.js scene data
- assets/: Referenced textures and models

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

  private async bundleAssets(
    zip: JSZip, 
    scene: GameScene, 
    projectPath: string, 
    assetTypeFilter?: string[]
  ): Promise<void> {
    // Collect all referenced assets
    const referencedAssets = new Set<string>();
    
    // Recursively collect asset references from objects
    const collectAssetRefs = (objects: GameObject[]) => {
      objects.forEach(obj => {
        obj.components.forEach(comp => {
          // Check for model assets
          if (comp.type === "Mesh" && comp.properties.geometryProps?.assetId) {
            referencedAssets.add(comp.properties.geometryProps.assetId);
          }
          
          // Check for texture assets in material properties - only for Mesh components
          if (comp.type === "Mesh" && comp.properties.materialProps) {
            Object.values(comp.properties.materialProps).forEach((value: any) => {
              if (typeof value === "string" && value.startsWith("asset_")) {
                referencedAssets.add(value);
              }
            });
          }
        });
        
        if (obj.children) {
          collectAssetRefs(obj.children);
        }
      });
    };

    collectAssetRefs(scene.objects);

    // Add scene-level assets
    scene.assets.forEach(asset => referencedAssets.add(asset.id));

    // Bundle all referenced assets
    const assets = useEditorStore.getState().assets;
    for (const assetId of referencedAssets) {
      const asset = assets.find(a => a.id === assetId);
      if (asset && (!assetTypeFilter || assetTypeFilter.includes(asset.type))) {
        try {
          const assetData = await window.projectAPI.getAssetDataUrl(
            projectPath,
            asset.path
          );
          if (assetData) {
            // Convert data URL to buffer
            const base64Data = assetData.split(",")[1];
            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            zip.file(`assets/${asset.path.split("/").pop()}`, buffer);
          }
        } catch (error) {
          console.warn(`Failed to bundle asset ${assetId}:`, error);
        }
      }
    }
  }
}