import * as THREE from "three/webgpu";
import { InputManager } from "../input-manager";
import { CameraManager } from "../camera-manager";
import { CharacterControllerConfig } from "./types";

export interface CharacterInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
}

export interface CharacterInputPreviousState {
  jump: boolean;
}

export class CharacterInput {
  private inputManager: InputManager;
  private cameraManager: CameraManager;
  private config: CharacterControllerConfig;
  private cameraId: string;
  
  private inputState: CharacterInputState;
  private previousInputState: CharacterInputPreviousState;
  private pointerLocked: boolean = false;
  private isActive: boolean = false;

  // Mouse tracking
  private lastMouseMovement: { x: number; y: number } = { x: 0, y: 0 };
  private cameraRotation: { pitch: number; yaw: number } = { pitch: 0, yaw: 0 };

  constructor(
    inputManager: InputManager,
    cameraManager: CameraManager,
    config: CharacterControllerConfig,
    cameraId: string
  ) {
    this.inputManager = inputManager;
    this.cameraManager = cameraManager;
    this.config = config;
    this.cameraId = cameraId;
    
    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      crouch: false
    };
    
    this.previousInputState = {
      jump: false
    };

    this.setupMouseLook();
  }

  private setupMouseLook(): void {
    // Handle pointer lock for ALL camera modes
    const canvas = this.inputManager['domElement'] as HTMLCanvasElement;
    
    // Click to lock pointer for all character modes
    canvas.addEventListener('click', () => {
      if (this.isActive) {
        canvas.requestPointerLock();
      }
    });

    // Pointer lock change event
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      
      // Show/hide cursor based on pointer lock state
      if (this.pointerLocked) {
        canvas.style.cursor = 'none';
      } else {
        canvas.style.cursor = 'default';
      }
    });

    // Mouse move for camera look
    document.addEventListener('mousemove', (event: MouseEvent) => {
      if (!this.isActive || !this.pointerLocked) return;

      // Track mouse movement for air strafing
      this.lastMouseMovement.x = event.movementX;
      this.lastMouseMovement.y = event.movementY;
      
      // Apply mouse movement to camera rotation
      this.cameraRotation.yaw -= event.movementX * this.config.cameraSensitivity;
      
      // Fix Y-axis inversion: for first-person, invert Y axis to match standard FPS controls
      if (this.config.cameraMode === "first-person") {
        this.cameraRotation.pitch -= event.movementY * this.config.cameraSensitivity;
      } else {
        // Third-person and platformer - use normal Y axis
        this.cameraRotation.pitch += event.movementY * this.config.cameraSensitivity;
      }
      
      // Clamp pitch to prevent camera flipping
      this.cameraRotation.pitch = Math.max(
        this.config.cameraDownLimit,
        Math.min(this.config.cameraUpLimit, this.cameraRotation.pitch)
      );
    });

    // Escape key to exit pointer lock
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.pointerLocked) {
        document.exitPointerLock();
      }
    });
  }

  public updateInputState(): void {
    // Store previous state for edge detection
    this.previousInputState.jump = this.inputState.jump;
    
    // Get the input state from the input manager
    const inputState = this.inputManager.getInputState();
    
    // Support multiple keys for movement (including arrow keys) to handle keyboard ghosting
    this.inputState.forward = inputState.keyboard.get("KeyW") || inputState.keyboard.get("ArrowUp") || false;
    this.inputState.backward = inputState.keyboard.get("KeyS") || inputState.keyboard.get("ArrowDown") || false;
    this.inputState.left = inputState.keyboard.get("KeyA") || inputState.keyboard.get("ArrowLeft") || false;
    this.inputState.right = inputState.keyboard.get("KeyD") || inputState.keyboard.get("ArrowRight") || false;
    
    // Support multiple keys for jumping, sprinting, and crouching
    this.inputState.jump = inputState.keyboard.get("Space") || inputState.keyboard.get("KeyJ") || false;
    this.inputState.sprint = inputState.keyboard.get("ShiftLeft") || inputState.keyboard.get("ShiftRight") || inputState.keyboard.get("KeyX") || false;
    this.inputState.crouch = inputState.keyboard.get("ControlLeft") || inputState.keyboard.get("ControlRight") || inputState.keyboard.get("KeyC") || false;
  }

  public getInputState(): CharacterInputState {
    return { ...this.inputState };
  }

  public getPreviousInputState(): CharacterInputPreviousState {
    return { ...this.previousInputState };
  }

  public getCameraRotation(): { pitch: number; yaw: number } {
    return { ...this.cameraRotation };
  }

  public getLastMouseMovement(): { x: number; y: number } {
    return { ...this.lastMouseMovement };
  }

  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  public setActive(active: boolean): void {
    this.isActive = active;
  }

  public updateConfig(newConfig: Partial<CharacterControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public dispose(): void {
    // Clean up input binding
    try {
      this.inputManager.removeBinding(`character-jump-${this.cameraId}`);
    } catch (error) {
      console.warn(`Failed to remove binding character-jump-${this.cameraId}:`, error);
    }
    
    // Exit pointer lock
    if (this.pointerLocked && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
} 