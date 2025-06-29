import type { GameWorld } from "@/models/game-world";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import JSZip from "jszip";
import useGameStudioStore from "@/stores/game-studio-store";
import { SceneSerializer } from "@/models/scene-loader/scene-serializer";
import { ExportType, ExportOptions } from "@/pages/game-studio-page/components/export-modal/types";
import * as THREE from "three/webgpu";

export class ClientExportService {
  private readonly gameWorld: GameWorld;

  constructor(gameWorld: GameWorld) {
    this.gameWorld = gameWorld;
  }

  private safeCloneScene(scene: THREE.Scene): THREE.Scene {
    // Ensure all matrices are up to date
    scene.updateMatrixWorld(true);
    
    let clonedScene: THREE.Scene;
    
    try {
      // Try standard clone first
      clonedScene = scene.clone();
    } catch (cloneError) {
      console.warn("Standard scene clone failed, using manual clone:", cloneError);
      
      // Manual clone fallback
      clonedScene = new THREE.Scene();
      clonedScene.fog = scene.fog ? scene.fog.clone() : null;
      clonedScene.background = scene.background;
      clonedScene.environment = scene.environment;
      clonedScene.backgroundBlurriness = scene.backgroundBlurriness;
      clonedScene.backgroundIntensity = scene.backgroundIntensity;
      
      // Manually clone children
      const failedClones: string[] = [];
      
      scene.children.forEach((child, index) => {
        try {
          // Skip problematic objects
          if (!child || !child.visible) return;
          if (child.name && (
            child.name.includes("Debug") || 
            child.name.includes("Helper") ||
            child.name === "PhysicsDebugRenderer" ||
            child.name === "EditorCamera" ||
            child.name.includes("TransformControls")
          )) {
            return;
          }
          
          // Ensure child has updated matrices
          child.updateMatrixWorld(true);
          
          if (child.clone && typeof child.clone === 'function') {
            const clonedChild = child.clone();
            clonedScene.add(clonedChild);
          }
        } catch (childError) {
          const childInfo = `${child.name || `Child ${index}`} (${child.type})`;
          console.warn(`Failed to clone: ${childInfo}`, childError);
          failedClones.push(childInfo);
        }
      });
      
      if (failedClones.length > 0) {
        console.warn("Failed to clone the following objects:", failedClones);
      }
    }
    
    // Ensure cloned scene matrices are updated
    clonedScene.updateMatrixWorld(true);
    
    return clonedScene;
  }

  async exportAsGameJS(options: ExportOptions): Promise<Blob> {
    const serializer = new SceneSerializer();
    const currentSceneName = useGameStudioStore.getState().currentSceneName || "Untitled Scene";
    const sceneData = await serializer.serializeScene(this.gameWorld, currentSceneName);

    if (!options.includeAssets) {
      // Export just the JSON file
      const jsonString = JSON.stringify(sceneData, null, 2);
      return new Blob([jsonString], { type: "application/json" });
    }

    // Create ZIP file with assets
    const zip = new JSZip();

    // Add the scene JSON
    zip.file("scene.json", JSON.stringify(sceneData, null, 2));

    // Add package.json metadata
    const packageInfo = {
      name: sceneData.name.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      description: `GameJS Scene: ${sceneData.name}`,
      type: "gamejs-scene",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      exportOptions: options
    };
    zip.file("package.json", JSON.stringify(packageInfo, null, 2));

    // Create assets folder structure
    if (options.includeScripts) {
      // TODO: Add script files to assets/scripts/
      zip.folder("assets/scripts");
    }

    if (options.includeTextures) {
      // TODO: Add texture files to assets/textures/
      zip.folder("assets/textures");
    }

    if (options.includeMaterials) {
      // Add material definitions
      const materialsFolder = zip.folder("assets/materials");
      for (const asset of sceneData.assets) {
        if (asset.type === "material" && asset.metadata?.materialDefinition) {
          materialsFolder?.file(
            `${asset.id}.json`,
            JSON.stringify(asset.metadata.materialDefinition, null, 2)
          );
        }
      }
    }

    // Add README
    const readme = `# ${sceneData.name}

GameJS Scene Export

## Contents:
- scene.json: Main scene data
- package.json: Scene metadata
${options.includeScripts ? "- assets/scripts/: Entity scripts\n" : ""}${options.includeTextures ? "- assets/textures/: Texture files\n" : ""}${options.includeMaterials ? "- assets/materials/: Material definitions\n" : ""}

## Import Instructions:
1. Open GameJS Editor
2. Create a new project or open an existing one
3. Use File > Import Scene and select this ZIP file
`;
    zip.file("README.md", readme);

    return zip.generateAsync({ type: "blob" });
  }

  async exportAsThreeJSON(options: ExportOptions): Promise<Blob> {
    const threeScene = this.gameWorld.scene;
    if (!threeScene) {
      throw new Error("No Three.js scene available - viewport not initialized");
    }

    // Use safe cloning method
    const exportScene = this.safeCloneScene(threeScene);

    // Remove debug elements and helpers if not included
    if (!options.includeDebugElements && !options.includeHelpers) {
      this.removeDebugElements(exportScene);
    }

    // Export using Three.js toJSON method with error handling
    let result;
    try {
      result = exportScene.toJSON();
    } catch (error) {
      console.error("Error serializing scene to JSON:", error);
      throw new Error(`Failed to serialize scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Create ZIP file
    const zip = new JSZip();

    // Add the Three.js JSON
    zip.file("scene.json", JSON.stringify(result, null, 2));

    // Add README with warnings
    const readme = `# Three.js Scene Export

⚠️ **WARNING**: This is a Three.js scene export from GameJS Editor.

## Limitations:
- ❌ No physics data (colliders, rigid bodies)
- ❌ No GameJS scripts or behaviors
- ❌ No character controllers
- ❌ Cannot be re-imported into GameJS Editor
- ✅ Visual elements only (meshes, materials, lights)

## Files:
- scene.json: The main Three.js scene data

## Usage:
\`\`\`javascript
import * as THREE from 'three';

const loader = new THREE.ObjectLoader();
loader.load('scene.json', (scene) => {
  // Add the loaded scene to your Three.js application
  myScene.add(scene);
});
\`\`\`
`;
    zip.file("README.md", readme);

    return zip.generateAsync({ type: "blob" });
  }

  async exportAsGLB(options: ExportOptions): Promise<Blob> {
    const threeScene = this.gameWorld.scene;
    if (!threeScene) {
      throw new Error("No Three.js scene available - viewport not initialized");
    }

    // Use safe cloning method
    const exportScene = this.safeCloneScene(threeScene);

    // Remove debug elements and helpers if not included
    if (!options.includeDebugElements && !options.includeHelpers) {
      this.removeDebugElements(exportScene);
    }

    // Export using GLTFExporter
    const exporter = new GLTFExporter();
    
    return new Promise((resolve, reject) => {
      try {
        exporter.parse(
          exportScene,
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
            console.error("GLTFExporter error:", error);
            reject(new Error(`Failed to export GLB: ${error instanceof Error ? error.message : 'Unknown error'}`));
          },
          {
            binary: true,
            includeCustomExtensions: false,
            animations: []
          }
        );
      } catch (error) {
        console.error("Error initializing GLTFExporter:", error);
        reject(new Error(`Failed to initialize GLB export: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  private removeDebugElements(scene: THREE.Object3D): void {
    const objectsToRemove: THREE.Object3D[] = [];

    scene.traverse((object) => {
      // Skip if object is not valid
      if (!object) return;
      
      // Ensure object has a valid matrix
      if (!object.matrix || !object.matrixWorld) {
        console.warn("Object missing matrix properties:", object.name || object.type);
        objectsToRemove.push(object);
        return;
      }
      
      // Remove physics debug renderers
      if (object.name && (object.name.includes("debug") || object.name.includes("Debug") || object.name === "PhysicsDebugRenderer")) {
        objectsToRemove.push(object);
        return;
      }

      // Remove transform controls helpers
      if (object.name && object.name.includes("TransformControls")) {
        objectsToRemove.push(object);
        return;
      }

      // Remove editor camera
      if (object.name && object.name === "EditorCamera") {
        objectsToRemove.push(object);
        return;
      }

      // Remove helpers
      if (object instanceof THREE.AxesHelper ||
          object instanceof THREE.GridHelper ||
          object instanceof THREE.BoxHelper ||
          object.type === "DirectionalLightHelper" ||
          object.type === "SpotLightHelper" ||
          object.type === "PointLightHelper" ||
          object.type === "HemisphereLightHelper" ||
          object.type === "CameraHelper" ||
          (object.type === "Line" && object.name && object.name.includes("Helper"))) {
        objectsToRemove.push(object);
        return;
      }

      // Remove wireframe materials
      if ('material' in object && object.material) {
        const material = object.material as THREE.Material;
        if ('wireframe' in material && material.wireframe) {
          material.wireframe = false;
        }
      }
    });

    // Remove collected objects
    objectsToRemove.forEach(obj => {
      if (obj.parent) {
        obj.parent.remove(obj);
      }
    });
  }
}

// Export the main function used by the modal
export async function exportScene(type: ExportType, options: ExportOptions): Promise<void> {
  const gameWorldService = useGameStudioStore.getState().gameWorldService;
  if (!gameWorldService) {
    throw new Error("No game world service available");
  }
  
  const gameWorld = gameWorldService.getGameWorld();
  if (!gameWorld) {
    throw new Error("No game world available");
  }

  // Ensure the scene is properly initialized
  if (!gameWorld.scene) {
    throw new Error("Scene not initialized");
  }

  // Update world matrices before export
  gameWorld.scene.updateMatrixWorld(true);

  const exportService = new ClientExportService(gameWorld);
  let blob: Blob;
  let filename: string;

  switch (type) {
    case 'gamejs':
      blob = await exportService.exportAsGameJS(options);
      filename = options.includeAssets ? 'scene-export.zip' : 'scene.json';
      break;
    case 'threejs':
      blob = await exportService.exportAsThreeJSON(options);
      filename = 'threejs-scene.zip';
      break;
    case 'glb':
      blob = await exportService.exportAsGLB(options);
      filename = 'scene.glb';
      break;
  }

  // Download the file
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}