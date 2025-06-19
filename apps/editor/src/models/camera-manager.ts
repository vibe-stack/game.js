import * as THREE from "three/webgpu";
import { Registry } from "./registry";
import { StateManager } from "./state-manager";

export interface CameraConfig {
  position?: THREE.Vector3;
  target?: THREE.Vector3;
  fov?: number;
  near?: number;
  far?: number;
  aspect?: number;
}

export interface CameraTransitionConfig {
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
}

export interface CameraFollowConfig {
  target: THREE.Object3D | (() => THREE.Object3D | null);
  offset?: THREE.Vector3;
  followPosition?: boolean;
  followRotation?: boolean;
  rotationOffset?: THREE.Euler;
  smoothing?: number; // 0 = instant, 1 = very smooth
}

export class CameraManager {
  private cameras: Registry<THREE.Camera>;
  private stateManager: StateManager;
  private activeCamera: THREE.Camera | null = null;
  private activeCameraId: string = "";
  private scene: THREE.Scene;
  private defaultAspect: number;

  // Transition system
  private isTransitioning = false;
  private transitionStartTime = 0;
  private transitionDuration = 1000;
  private transitionEasing = (t: number) => t * t * (3.0 - 2.0 * t); // smoothstep
  private onTransitionComplete?: () => void;
  
  // Camera states for transition
  private fromCameraState: {
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null = null;
  
  private toCameraState: {
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null = null;

  // Camera following system
  private followConfigs = new Map<string, CameraFollowConfig>();

  constructor(
    cameras: Registry<THREE.Camera>,
    stateManager: StateManager,
    scene: THREE.Scene,
    defaultAspect: number = 16 / 9
  ) {
    this.cameras = cameras;
    this.stateManager = stateManager;
    this.scene = scene;
    this.defaultAspect = defaultAspect;
  }

  createPerspectiveCamera(
    id: string,
    name: string,
    config: CameraConfig = {}
  ): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      config.fov ?? 75,
      config.aspect ?? this.defaultAspect,
      config.near ?? 0.1,
      config.far ?? 1000
    );

    const originalPosition = config.position ? config.position.clone() : new THREE.Vector3(0, 0, 10);
    const originalTarget = config.target ? config.target.clone() : new THREE.Vector3(0, 0, 0);

    camera.position.copy(originalPosition);
    if (config.target) {
      camera.lookAt(config.target);
    }

    // Store original configuration as metadata
    const metadata = {
      originalPosition,
      originalTarget,
      cameraType: 'perspective',
      config: { ...config }
    };

    this.addCameraWithMetadata(id, name, camera, metadata);
    return camera;
  }

  createOrthographicCamera(
    id: string,
    name: string,
    left: number = -10,
    right: number = 10,
    top: number = 10,
    bottom: number = -10,
    near: number = 0.1,
    far: number = 1000
  ): THREE.OrthographicCamera {
    const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
    
    // Store original configuration as metadata
    const metadata = {
      originalPosition: camera.position.clone(),
      originalTarget: new THREE.Vector3(0, 0, 0),
      cameraType: 'orthographic',
      config: { left, right, top, bottom, near, far }
    };

    this.addCameraWithMetadata(id, name, camera, metadata);
    return camera;
  }

  private addCameraWithMetadata(id: string, name: string, camera: THREE.Camera, metadata: any): void {
    this.cameras.add(id, name, camera, metadata);
    
    // Set as active if it's the first camera
    if (!this.activeCamera) {
      this.setActiveCamera(id);
    }
    
    this.updateState();
  }

  removeCamera(id: string): boolean {
    if (id === this.activeCameraId) {
      // If removing active camera, switch to another one
      const allCameras = this.cameras.getAllRegistryItems();
      const otherCamera = allCameras.find(item => item.id !== id);
      if (otherCamera) {
        this.setActiveCamera(otherCamera.id);
      } else {
        this.activeCamera = null;
        this.activeCameraId = "";
      }
    }
    
    const removed = this.cameras.remove(id);
    if (removed) {
      this.updateState();
    }
    return removed;
  }

  setActiveCamera(id: string, transition?: CameraTransitionConfig): boolean {
    const camera = this.cameras.get(id);
    if (!camera) return false;

    if (transition && this.activeCamera) {
      return this.transitionToCamera(id, transition);
    }

    // Only reset to original position if not following something
    if (!this.followConfigs.has(id)) {
      this.resetCameraToOriginal(id);
    }

    this.activeCamera = camera;
    this.activeCameraId = id;
    this.updateState();
    return true;
  }

  transitionToCamera(
    id: string,
    config: CameraTransitionConfig = {}
  ): boolean {
    const targetCamera = this.cameras.get(id);
    if (!targetCamera || !this.activeCamera || this.isTransitioning) {
      return false;
    }

    // Store transition config
    this.transitionDuration = config.duration ?? 1000;
    this.transitionEasing = config.easing ?? this.transitionEasing;
    this.onTransitionComplete = config.onComplete;

    // Store current camera state (from)
    this.fromCameraState = {
      position: this.activeCamera.position.clone(),
      target: new THREE.Vector3().copy(this.getWorldDirection(this.activeCamera)).add(this.activeCamera.position)
    };

    // Use the original camera state for the target
    const originalState = this.getOriginalCameraState(id);
    if (originalState) {
      this.toCameraState = {
        position: originalState.position,
        target: originalState.target
      };
    } else {
      // Fallback to current target camera state
      this.toCameraState = {
        position: targetCamera.position.clone(),
        target: new THREE.Vector3().copy(this.getWorldDirection(targetCamera)).add(targetCamera.position)
      };
    }

    // Start transition
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
    
    return true;
  }

  private getWorldDirection(camera: THREE.Camera): THREE.Vector3 {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    return direction;
  }

  update(): void {
    // Update camera following first
    this.updateCameraFollowing();

    if (this.isTransitioning && this.activeCamera && this.fromCameraState && this.toCameraState) {
      const elapsed = performance.now() - this.transitionStartTime;
      const progress = Math.min(elapsed / this.transitionDuration, 1);
      const easedProgress = this.transitionEasing(progress);

      // Interpolate position
      this.activeCamera.position.lerpVectors(
        this.fromCameraState.position,
        this.toCameraState.position,
        easedProgress
      );

      // Interpolate look target
      const currentTarget = new THREE.Vector3().lerpVectors(
        this.fromCameraState.target,
        this.toCameraState.target,
        easedProgress
      );
      this.activeCamera.lookAt(currentTarget);

      if (progress >= 1) {
        // Transition complete - ensure camera is in final position
        this.activeCamera.position.copy(this.toCameraState.position);
        this.activeCamera.lookAt(this.toCameraState.target);
        this.activeCamera.updateMatrix();
        this.activeCamera.updateMatrixWorld();
        
        this.isTransitioning = false;
        this.fromCameraState = null;
        this.toCameraState = null;
        
        if (this.onTransitionComplete) {
          this.onTransitionComplete();
          this.onTransitionComplete = undefined;
        }
      }
    }
  }

  getActiveCamera(): THREE.Camera | null {
    return this.activeCamera;
  }

  getActiveCameraId(): string {
    return this.activeCameraId;
  }

  getCamera(id: string): THREE.Camera | undefined {
    return this.cameras.get(id);
  }

  getCameraByName(name: string): THREE.Camera | undefined {
    return this.cameras.getByName(name);
  }

  getAllCameras(): { id: string; name: string; camera: THREE.Camera }[] {
    return this.cameras.getAllRegistryItems().map(item => ({
      id: item.id,
      name: item.name,
      camera: item.item
    }));
  }

  getCameraIds(): string[] {
    return this.cameras.getAllRegistryItems().map(item => item.id);
  }

  isTransitionInProgress(): boolean {
    return this.isTransitioning;
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    this.defaultAspect = aspect;

    this.cameras.forEach((camera) => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera) {
        // For orthographic cameras, maintain the same vertical size and adjust horizontal
        const verticalSize = (camera.top - camera.bottom) / 2;
        const horizontalSize = verticalSize * aspect;
        camera.left = -horizontalSize;
        camera.right = horizontalSize;
        camera.updateProjectionMatrix();
      }
    });
  }

  private updateState(): void {
    // Trigger state update in the main state manager
    // This will be called by the parent system
  }

  dispose(): void {
    this.cameras.clear();
    this.activeCamera = null;
    this.activeCameraId = "";
    this.isTransitioning = false;
    this.fromCameraState = null;
    this.toCameraState = null;
  }

  // Method to reset a camera to its original position
  resetCameraToOriginal(id: string): boolean {
    const camera = this.cameras.get(id);
    const cameraInfo = this.cameras.getAllRegistryItems().find(item => item.id === id);
    
    if (!camera || !cameraInfo?.metadata?.originalPosition) {
      return false;
    }

    camera.position.copy(cameraInfo.metadata.originalPosition);
    if (cameraInfo.metadata.originalTarget) {
      camera.lookAt(cameraInfo.metadata.originalTarget);
    }

    camera.updateMatrix();
    camera.updateMatrixWorld();
    
    return true;
  }

  // Method to get original camera state
  getOriginalCameraState(id: string): { position: THREE.Vector3; target: THREE.Vector3 } | null {
    const cameraInfo = this.cameras.getAllRegistryItems().find(item => item.id === id);
    
    if (!cameraInfo?.metadata?.originalPosition) {
      return null;
    }

    return {
      position: cameraInfo.metadata.originalPosition.clone(),
      target: cameraInfo.metadata.originalTarget?.clone() || new THREE.Vector3(0, 0, 0)
    };
  }

  addCamera(id: string, name: string, camera: THREE.Camera): void {
    // Create default metadata for cameras added without explicit metadata
    const metadata = {
      originalPosition: camera.position.clone(),
      originalTarget: new THREE.Vector3(0, 0, -1).add(camera.position), // Default forward direction
      cameraType: camera instanceof THREE.PerspectiveCamera ? 'perspective' : 'orthographic',
      config: {}
    };

    this.addCameraWithMetadata(id, name, camera, metadata);
  }

  // Camera following methods
  setCameraFollow(cameraId: string, config: CameraFollowConfig): boolean {
    const camera = this.cameras.get(cameraId);
    if (!camera) return false;

    this.followConfigs.set(cameraId, {
      target: config.target,
      offset: config.offset ?? new THREE.Vector3(0, 1.8, 0),
      followPosition: config.followPosition ?? true,
      followRotation: config.followRotation ?? false,
      rotationOffset: config.rotationOffset ?? new THREE.Euler(0, 0, 0),
      smoothing: config.smoothing ?? 0
    });

    return true;
  }

  removeCameraFollow(cameraId: string): boolean {
    return this.followConfigs.delete(cameraId);
  }

  getCameraFollow(cameraId: string): CameraFollowConfig | undefined {
    return this.followConfigs.get(cameraId);
  }

  private updateCameraFollowing(): void {
    // Only update following for the currently active camera
    if (this.activeCameraId && this.followConfigs.has(this.activeCameraId)) {
      const config = this.followConfigs.get(this.activeCameraId)!;
      const camera = this.cameras.get(this.activeCameraId);
      
      if (!camera) return;

      // Get target object
      const target = typeof config.target === 'function' 
        ? config.target() 
        : config.target;
      
      if (!target) return;

      if (config.followPosition) {
        const targetPosition = target.position.clone().add(config.offset!);
        
        if (config.smoothing! > 0) {
          camera.position.lerp(targetPosition, 1 - config.smoothing!);
        } else {
          camera.position.copy(targetPosition);
        }
      }

      if (config.followRotation) {
        const targetRotation = target.rotation.clone();
        targetRotation.x += config.rotationOffset!.x;
        targetRotation.y += config.rotationOffset!.y;
        targetRotation.z += config.rotationOffset!.z;

        if (config.smoothing! > 0) {
          // Smooth rotation interpolation
          const targetQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);
          camera.quaternion.slerp(targetQuaternion, 1 - config.smoothing!);
        } else {
          camera.rotation.copy(targetRotation);
        }
      }
    }
  }
} 