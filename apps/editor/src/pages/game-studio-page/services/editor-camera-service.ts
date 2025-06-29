import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GameWorld } from "@/models";

export class EditorCameraService {
  private editorCamera: THREE.PerspectiveCamera | null = null;
  private orbitControls: OrbitControls | null = null;
  private gameWorld: GameWorld | null = null;
  private _isEditorCameraActive = false;
  
  public static readonly EDITOR_CAMERA_ID = "__editor_orbit_camera__";

  initialize(gameWorld: GameWorld, canvas: HTMLCanvasElement): void {
    this.gameWorld = gameWorld;
    
    // Create editor-only orbit camera
    this.editorCamera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    
    // Position it at a good default location
    this.editorCamera.position.set(10, 10, 10);
    this.editorCamera.lookAt(0, 0, 0);
    
    // Create orbit controls for the editor camera
    this.orbitControls = new OrbitControls(this.editorCamera, canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.enableZoom = true;
    this.orbitControls.enableRotate = true;
    this.orbitControls.enablePan = true;
    
    // Add the editor camera to the camera manager but mark it as special
    const cameraManager = gameWorld.getCameraManager();
    cameraManager.addCamera(
      EditorCameraService.EDITOR_CAMERA_ID,
      "Editor Camera",
      this.editorCamera
    );
  }

  switchToEditorCamera(): boolean {
    if (!this.gameWorld || !this.editorCamera) return false;
    
    const cameraManager = this.gameWorld.getCameraManager();
    const success = cameraManager.setActiveCamera(EditorCameraService.EDITOR_CAMERA_ID);
    
    if (success) {
      this._isEditorCameraActive = true;
      // Enable orbit controls when editor camera is active
      if (this.orbitControls) {
        this.orbitControls.enabled = true;
      }
    }
    
    return success;
  }

  switchToSceneCamera(cameraId: string): boolean {
    if (!this.gameWorld) return false;
    
    const cameraManager = this.gameWorld.getCameraManager();
    const success = cameraManager.setActiveCamera(cameraId);
    
    if (success) {
      this._isEditorCameraActive = false;
      // Disable orbit controls when scene camera is active
      if (this.orbitControls) {
        this.orbitControls.enabled = false;
      }
    }
    
    return success;
  }

  update(): void {
    if (this._isEditorCameraActive && this.orbitControls) {
      this.orbitControls.update();
    }
  }

  forceUpdate(): void {
    if (this.orbitControls) {
      this.orbitControls.update();
    }
  }

  resize(width: number, height: number): void {
    if (this.editorCamera) {
      this.editorCamera.aspect = width / height;
      this.editorCamera.updateProjectionMatrix();
    }
  }

  isEditorCameraActive(): boolean {
    return this._isEditorCameraActive;
  }

  getEditorCameraId(): string {
    return EditorCameraService.EDITOR_CAMERA_ID;
  }

  getOrbitControls(): OrbitControls | null {
    return this.orbitControls;
  }

  dispose(): void {
    if (this.orbitControls) {
      this.orbitControls.dispose();
      this.orbitControls = null;
    }
    
    // Remove editor camera from camera manager
    if (this.gameWorld) {
      const cameraManager = this.gameWorld.getCameraManager();
      cameraManager.removeCamera(EditorCameraService.EDITOR_CAMERA_ID);
    }
    
    this.editorCamera = null;
    this.gameWorld = null;
    this._isEditorCameraActive = false;
  }
} 