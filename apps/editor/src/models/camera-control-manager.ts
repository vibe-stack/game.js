import { Registry } from "./registry";
import { StateManager } from "./state-manager";
import * as THREE from "three/webgpu";

export interface CameraControlConfig {
  enabled?: boolean;
  autoUpdate?: boolean;
  [key: string]: any;
}

export interface CameraControlInfo {
  id: string;
  name: string;
  controls: any;
  enabled: boolean;
  autoUpdate: boolean;
  cameraId?: string;
}

export class CameraControlManager {
  private controls: Registry<any>;
  private stateManager: StateManager;
  private controlsInfo: Map<string, {
    enabled: boolean;
    autoUpdate: boolean;
    cameraId?: string;
    savedCameraState?: {
      position: THREE.Vector3;
      rotation: THREE.Euler;
      quaternion: THREE.Quaternion;
    };
  }> = new Map();

  constructor(
    controls: Registry<any>,
    stateManager: StateManager
  ) {
    this.controls = controls;
    this.stateManager = stateManager;
  }

  addControls(
    id: string,
    name: string,
    controls: any,
    config: CameraControlConfig = {}
  ): void {
    this.controls.add(id, name, controls);
    
    this.controlsInfo.set(id, {
      enabled: config.enabled ?? true,
      autoUpdate: config.autoUpdate ?? true,
      cameraId: undefined,
      savedCameraState: undefined
    });

    // Configure the controls
    if (controls.enabled !== undefined) {
      controls.enabled = config.enabled ?? true;
    }

    this.updateState();
  }

  removeControls(id: string): boolean {
    const removed = this.controls.remove(id);
    if (removed) {
      this.controlsInfo.delete(id);
      this.updateState();
    }
    return removed;
  }

  enableControls(id: string): boolean {
    const controls = this.controls.get(id);
    const info = this.controlsInfo.get(id);
    
    if (!controls || !info) return false;

    // Before enabling, save the current camera state if we have a saved state
    // This ensures we restore from the actual camera position, not the control's internal state
    if (info.savedCameraState && controls.object) {
      controls.object.position.copy(info.savedCameraState.position);
      controls.object.rotation.copy(info.savedCameraState.rotation);
      controls.object.quaternion.copy(info.savedCameraState.quaternion);
      
      // Reset the controls to match the camera state
      if (controls.reset) {
        controls.reset();
      } else if (controls.update) {
        // For orbit controls, we need to sync the internal state
        if (controls.target && controls.object) {
          // Calculate where the camera is looking
          const direction = new THREE.Vector3();
          controls.object.getWorldDirection(direction);
          controls.target.copy(controls.object.position).add(direction.multiplyScalar(10));
        }
        controls.update();
      }
      
      info.savedCameraState = undefined;
    }

    info.enabled = true;
    if (controls.enabled !== undefined) {
      controls.enabled = true;
    }

    this.updateState();
    return true;
  }

  disableControls(id: string): boolean {
    const controls = this.controls.get(id);
    const info = this.controlsInfo.get(id);
    
    if (!controls || !info) return false;

    // Save the current camera state before disabling
    if (controls.object) {
      info.savedCameraState = {
        position: controls.object.position.clone(),
        rotation: controls.object.rotation.clone(),
        quaternion: controls.object.quaternion.clone()
      };
      
      // For orbit controls specifically, ensure camera reflects its actual state
      if (controls.target !== undefined) {
        // Update the camera to its current position without control influences
        controls.object.updateMatrix();
        controls.object.updateMatrixWorld();
      }
    }

    info.enabled = false;
    if (controls.enabled !== undefined) {
      controls.enabled = false;
    }

    this.updateState();
    return true;
  }

  toggleControls(id: string): boolean {
    const info = this.controlsInfo.get(id);
    if (!info) return false;

    return info.enabled ? this.disableControls(id) : this.enableControls(id);
  }

  setAutoUpdate(id: string, autoUpdate: boolean): boolean {
    const info = this.controlsInfo.get(id);
    if (!info) return false;

    info.autoUpdate = autoUpdate;
    this.updateState();
    return true;
  }

  associateWithCamera(controlsId: string, cameraId: string): boolean {
    const info = this.controlsInfo.get(controlsId);
    if (!info) return false;

    info.cameraId = cameraId;
    this.updateState();
    return true;
  }

  disassociateFromCamera(controlsId: string): boolean {
    const info = this.controlsInfo.get(controlsId);
    if (!info) return false;

    info.cameraId = undefined;
    this.updateState();
    return true;
  }

  // Helper method to sync controls with camera state
  syncControlsWithCamera(controlsId: string, camera: THREE.Camera): boolean {
    const controls = this.controls.get(controlsId);
    const info = this.controlsInfo.get(controlsId);
    
    if (!controls || !info || !info.enabled) return false;

    // Update controls to match camera position
    if (controls.object && controls.object !== camera) {
      controls.object = camera;
    }

    // For orbit controls, sync the target based on camera direction
    if (controls.target && camera) {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const distance = controls.getDistance ? controls.getDistance() : 10;
      controls.target.copy(camera.position).add(direction.multiplyScalar(distance));
    }

    if (controls.update) {
      controls.update();
    }

    return true;
  }

  // Method to reset controls to camera's actual state
  resetControlsToCamera(controlsId: string): boolean {
    const controls = this.controls.get(controlsId);
    const info = this.controlsInfo.get(controlsId);
    
    if (!controls || !info) return false;

    if (controls.object) {
      // Store current camera state
      const currentState = {
        position: controls.object.position.clone(),
        rotation: controls.object.rotation.clone(),
        quaternion: controls.object.quaternion.clone()
      };

      // Reset controls if available
      if (controls.reset) {
        controls.reset();
      }

      // Restore camera to its actual position
      controls.object.position.copy(currentState.position);
      controls.object.rotation.copy(currentState.rotation);
      controls.object.quaternion.copy(currentState.quaternion);

      // Update controls to match
      if (controls.update) {
        controls.update();
      }
    }

    return true;
  }

  getControls(id: string): any {
    return this.controls.get(id);
  }

  getControlsByName(name: string): any {
    return this.controls.getByName(name);
  }

  getAllControls(): CameraControlInfo[] {
    return this.controls.getAllRegistryItems().map(item => {
      const info = this.controlsInfo.get(item.id);
      return {
        id: item.id,
        name: item.name,
        controls: item.item,
        enabled: info?.enabled ?? true,
        autoUpdate: info?.autoUpdate ?? true,
        cameraId: info?.cameraId
      };
    });
  }

  getEnabledControls(): CameraControlInfo[] {
    return this.getAllControls().filter(info => info.enabled);
  }

  getControlsForCamera(cameraId: string): CameraControlInfo[] {
    return this.getAllControls().filter(info => info.cameraId === cameraId);
  }

  isEnabled(id: string): boolean {
    const info = this.controlsInfo.get(id);
    return info?.enabled ?? false;
  }

  hasAutoUpdate(id: string): boolean {
    const info = this.controlsInfo.get(id);
    return info?.autoUpdate ?? false;
  }

  update(): void {
    this.controls.forEach((controls, id) => {
      const info = this.controlsInfo.get(id);
      
      if (info?.enabled && info?.autoUpdate && controls.update) {
        controls.update();
      }
    });
  }

  enableAll(): void {
    this.controlsInfo.forEach((_, id) => {
      this.enableControls(id);
    });
  }

  disableAll(): void {
    this.controlsInfo.forEach((_, id) => {
      this.disableControls(id);
    });
  }

  getControlIds(): string[] {
    return this.controls.getAllRegistryItems().map(item => item.id);
  }

  private updateState(): void {
    // Trigger state update in the main state manager
    // This will be called by the parent system
  }

  dispose(): void {
    // Dispose of all controls that have a dispose method
    this.controls.forEach((controls) => {
      if (controls.dispose) {
        controls.dispose();
      }
    });

    this.controls.clear();
    this.controlsInfo.clear();
  }
} 