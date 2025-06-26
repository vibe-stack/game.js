import * as THREE from "three/webgpu";
import { GameWorld } from "@/models/game-world";
import { Entity } from "@/models/entity";
import { Light } from "@/models/primitives/light";

export class HelperManager {
  private gameWorld: GameWorld | null = null;
  private helpers: Map<string, THREE.Object3D> = new Map();
  private isEnabled = true;
  private isVisible = true; // Controls visibility based on game state

  constructor() {}

  initialize(gameWorld: GameWorld): void {
    this.gameWorld = gameWorld;
    this.refreshHelpers();
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled && this.isVisible) {
      this.showAllHelpers();
      this.refreshHelpers();
    } else {
      this.hideAllHelpers();
    }
  }

  isHelpersEnabled(): boolean {
    return this.isEnabled;
  }

  // Called when game state changes (playing/not playing)
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.isEnabled) {
      if (visible) {
        this.showAllHelpers();
      } else {
        this.hideAllHelpers();
      }
    }
  }

  // Refresh all helpers (called when entities change)
  refreshHelpers(): void {
    if (!this.gameWorld || !this.isEnabled || !this.isVisible) return;

    // Clear existing helpers
    this.clearAllHelpers();

    // Create helpers for cameras
    this.createCameraHelpers();

    // Create helpers for lights
    this.createLightHelpers();
  }

  private createCameraHelpers(): void {
    if (!this.gameWorld) return;

    const cameraManager = this.gameWorld.getCameraManager();
    const cameras = cameraManager.getAllCameras();

    cameras.forEach(({ id, camera }) => {
      // Skip the currently active camera (don't show helper for the camera we're looking through)
      if (id === cameraManager.getActiveCameraId()) return;

      let helper: THREE.Object3D | null = null;

      if (camera instanceof THREE.PerspectiveCamera) {
        helper = new THREE.CameraHelper(camera);
      } else if (camera instanceof THREE.OrthographicCamera) {
        helper = new THREE.CameraHelper(camera);
      }

      if (helper && this.gameWorld) {
        helper.name = `camera-helper-${id}`;
        this.helpers.set(`camera-${id}`, helper);
        this.gameWorld.getScene().add(helper);
      }
    });
  }

  private createLightHelpers(): void {
    if (!this.gameWorld) return;

    const entitiesRegistry = this.gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) return;

    entitiesRegistry.getAllItems().forEach((entity: Entity) => {
      if (entity instanceof Light) {
        this.createLightHelper(entity);
      }
    });
  }

  private createLightHelper(lightEntity: Light): void {
    if (!this.gameWorld) return;

    let helper: THREE.Object3D | null = null;
    const light = lightEntity.light;

    if (light instanceof THREE.DirectionalLight) {
      helper = new THREE.DirectionalLightHelper(light, 1);
    } else if (light instanceof THREE.PointLight) {
      helper = new THREE.PointLightHelper(light, 0.5);
    } else if (light instanceof THREE.SpotLight) {
      helper = new THREE.SpotLightHelper(light);
    } else if (light instanceof THREE.HemisphereLight) {
      helper = new THREE.HemisphereLightHelper(light, 1);
    }
    // Note: AmbientLight doesn't have a visible helper

    if (helper) {
      helper.name = `light-helper-${lightEntity.entityId}`;
      this.helpers.set(`light-${lightEntity.entityId}`, helper);
      this.gameWorld.getScene().add(helper);
    }
  }

  // Called when an entity is added
  onEntityAdded(entity: Entity): void {
    if (!this.isEnabled || !this.isVisible) return;

    if (entity instanceof Light) {
      this.createLightHelper(entity);
    }
  }

  // Called when an entity is removed
  onEntityRemoved(entityId: string): void {
    const helperKey = `light-${entityId}`;
    this.removeHelper(helperKey);
  }

  // Called when cameras change
  onCamerasChanged(): void {
    if (!this.isEnabled || !this.isVisible) return;
    
    // Remove existing camera helpers
    this.helpers.forEach((helper, key) => {
      if (key.startsWith('camera-')) {
        this.removeHelper(key);
      }
    });

    // Recreate camera helpers
    this.createCameraHelpers();
  }

  private removeHelper(key: string): void {
    const helper = this.helpers.get(key);
    if (helper && this.gameWorld) {
      try {
        this.gameWorld.getScene().remove(helper);
        this.disposeHelper(helper);
      } catch (error) {
        console.warn(`Error removing helper ${key}:`, error);
      } finally {
        this.helpers.delete(key);
      }
    }
  }

  private hideAllHelpers(): void {
    this.helpers.forEach((helper) => {
      helper.visible = false;
    });
  }

  private showAllHelpers(): void {
    this.helpers.forEach((helper) => {
      helper.visible = true;
    });
  }

  private clearAllHelpers(): void {
    if (!this.gameWorld) return;

    this.helpers.forEach((helper, key) => {
      try {
        this.gameWorld!.getScene().remove(helper);
        this.disposeHelper(helper);
      } catch (error) {
        console.warn(`Error disposing helper ${key}:`, error);
      }
    });
    this.helpers.clear();
  }

  private disposeHelper(helper: THREE.Object3D): void {
    try {
      // Handle different types of helpers
      if (helper instanceof THREE.CameraHelper) {
        // CameraHelper doesn't need explicit disposal
        return;
      }
      
      if (helper instanceof THREE.DirectionalLightHelper) {
        // DirectionalLightHelper has specific disposal needs
        if (helper.lightPlane) {
          this.disposeGeometryAndMaterial(helper.lightPlane);
        }
        if (helper.targetLine) {
          this.disposeGeometryAndMaterial(helper.targetLine);
        }
        return;
      }
      
      if (helper instanceof THREE.PointLightHelper || 
          helper instanceof THREE.SpotLightHelper || 
          helper instanceof THREE.HemisphereLightHelper) {
        // These helpers have geometry and material that should be disposed
        this.disposeGeometryAndMaterial(helper);
        return;
      }
      
      // Generic disposal for other objects
      this.disposeGeometryAndMaterial(helper);
    } catch (error) {
      console.warn('Error in helper disposal:', error);
    }
  }

  private disposeGeometryAndMaterial(object: THREE.Object3D): void {
    if ('geometry' in object && object.geometry) {
      (object.geometry as THREE.BufferGeometry).dispose();
    }
    
    if ('material' in object && object.material) {
      const material = object.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material)) {
        material.forEach(mat => mat.dispose());
      } else {
        material.dispose();
      }
    }
    
    // Recursively dispose children
    object.children.forEach(child => {
      this.disposeGeometryAndMaterial(child);
    });
  }

  // Update helpers (called in animation loop if needed)
  update(): void {
    if (!this.isEnabled || !this.isVisible) return;

    // Update spot light helpers as they need to be updated each frame
    this.helpers.forEach((helper, key) => {
      if (key.startsWith('light-') && helper instanceof THREE.SpotLightHelper) {
        helper.update();
      }
    });
  }

  dispose(): void {
    this.clearAllHelpers();
    this.gameWorld = null;
  }
} 