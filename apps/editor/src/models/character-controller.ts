import * as THREE from "three/webgpu";
import { Entity } from "./entity";
import { CameraManager, type CameraFollowConfig } from "./camera-manager";
import { PhysicsManager } from "./physics-manager";
import { InputManager, type InputBinding, type InputState } from "./input-manager";
import type RapierType from "@dimforge/rapier3d-compat";

export interface CharacterControllerConfig {
  // Capsule collider setup
  capsuleHalfHeight: number;
  capsuleRadius: number;
  
  // Movement physics
  maxSpeed: number;
  acceleration: number;
  jumpForce: number;
  sprintMultiplier: number;
  
  // Character controller settings
  offset: number; // Gap between character and environment
  maxSlopeClimbAngle: number; // in radians
  minSlopeSlideAngle: number; // in radians
  autoStepMaxHeight: number;
  autoStepMinWidth: number;
  autoStepIncludeDynamic: boolean;
  snapToGroundDistance: number;
  
  // Physics forces
  gravityScale: number;
  maxFallSpeed: number;
  
  // Camera settings
  cameraMode: "first-person" | "third-person";
  cameraDistance: number;
  cameraHeight: number;
  cameraMinDistance: number;
  cameraMaxDistance: number;
  cameraUpLimit: number; // in radians
  cameraDownLimit: number; // in radians
  cameraSensitivity: number;
}

export interface CharacterState {
  isGrounded: boolean;
  isJumping: boolean;
  isSprinting: boolean;
  isMoving: boolean;
  velocity: THREE.Vector3;
  inputDirection: THREE.Vector3;
  cameraRotation: { pitch: number; yaw: number };
}

export class CharacterController {
  private config: CharacterControllerConfig;
  private character: Entity;
  private cameraManager: CameraManager;
  private physicsManager: PhysicsManager;
  private inputManager: InputManager;
  
  // Rapier character controller
  private rapierCharacterController: RapierType.KinematicCharacterController | null = null;
  
  // State
  private state: CharacterState;
  
  // Input tracking
  private inputState: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    sprint: boolean;
  };
  
  private previousInputState: {
    jump: boolean;
  };
  
  // Camera
  private cameraId: string;
  private pointerLocked: boolean = false;
  private enabled: boolean = true;
  
  // Movement
  private desiredVelocity: THREE.Vector3 = new THREE.Vector3();
  private verticalVelocity: number = 0;
  
  constructor(
    character: Entity,
    cameraManager: CameraManager,
    physicsManager: PhysicsManager,
    inputManager: InputManager,
    config: Partial<CharacterControllerConfig> = {}
  ) {
    this.character = character;
    this.cameraManager = cameraManager;
    this.physicsManager = physicsManager;
    this.inputManager = inputManager;
    
    // Set default config
    this.config = {
      capsuleHalfHeight: 0.9,
      capsuleRadius: 0.4,
      maxSpeed: 8.0,
      acceleration: 50.0,
      jumpForce: 12.0,
      sprintMultiplier: 1.8,
      offset: 0.01,
      maxSlopeClimbAngle: Math.PI / 4, // 45 degrees
      minSlopeSlideAngle: Math.PI / 6, // 30 degrees
      autoStepMaxHeight: 0.5,
      autoStepMinWidth: 0.2,
      autoStepIncludeDynamic: true,
      snapToGroundDistance: 0.3,
      gravityScale: 20.0,
      maxFallSpeed: -25.0,
      cameraMode: "first-person",
      cameraDistance: -5.0,
      cameraHeight: 1.7,
      cameraMinDistance: -1.0,
      cameraMaxDistance: -10.0,
      cameraUpLimit: Math.PI / 3,
      cameraDownLimit: -Math.PI / 3,
      cameraSensitivity: 0.002,
      ...config
    };
    
    // Initialize state
    this.state = {
      isGrounded: false,
      isJumping: false,
      isSprinting: false,
      isMoving: false,
      velocity: new THREE.Vector3(0, 0, 0),
      inputDirection: new THREE.Vector3(),
      cameraRotation: { pitch: 0, yaw: 0 }
    };
    
    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false
    };
    
    this.previousInputState = {
      jump: false
    };
    
    // Generate unique camera ID for this controller instance
    this.cameraId = `character-camera-${character.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.setupCharacterPhysics();
    this.setupRapierCharacterController();
    this.setupCamera();
    this.setupInput();
  }
  
  private setupCharacterPhysics(): void {
    // Use kinematic physics for character controller
    if (!this.character["rigidBodyId"]) {
      this.character.enableKinematicPhysics();
    }
    
    // Verify physics setup
    const rigidBody = this.getCharacterRigidBody();
    if (!rigidBody) {
      console.error("Failed to create character physics body for:", this.character.entityId);
    }
  }

  private setupRapierCharacterController(): void {
    const world = this.physicsManager.getWorld();
    if (!world) {
      console.error("Physics world not available for character controller");
      return;
    }

    try {
      // Create Rapier's character controller
      this.rapierCharacterController = world.createCharacterController(this.config.offset);
      
      // Configure the character controller
      this.rapierCharacterController.setMaxSlopeClimbAngle(this.config.maxSlopeClimbAngle);
      this.rapierCharacterController.setMinSlopeSlideAngle(this.config.minSlopeSlideAngle);
      
      // Enable auto-stepping for stairs and small obstacles
      this.rapierCharacterController.enableAutostep(
        this.config.autoStepMaxHeight,
        this.config.autoStepMinWidth,
        this.config.autoStepIncludeDynamic
      );

      this.rapierCharacterController.setApplyImpulsesToDynamicBodies(true);
      
      // Enable snap-to-ground for smooth movement on slopes
      this.rapierCharacterController.enableSnapToGround(this.config.snapToGroundDistance);
      
    } catch (error) {
      console.error("Failed to create Rapier character controller:", error);
      throw error;
    }
  }

  private getCharacterRigidBody(): RapierType.RigidBody | undefined {
    const rigidBodyId = this.character["rigidBodyId"];
    if (rigidBodyId && this.physicsManager) {
      return this.physicsManager.getRigidBody(rigidBodyId);
    }
    return undefined;
  }

  private getCharacterCollider(): RapierType.Collider | undefined {
    const colliderId = this.character["colliderId"];
    if (colliderId && this.physicsManager) {
      return this.physicsManager.getCollider(colliderId);
    }
    return undefined;
  }
  
  private setupCamera(): void {
    const cameraConfig = {
      position: new THREE.Vector3(0, this.config.cameraHeight, this.config.cameraDistance),
      target: new THREE.Vector3(0, this.config.cameraHeight, 0),
      fov: 75
    };
    
    if (this.config.cameraMode === "first-person") {
      cameraConfig.position.set(0, this.config.cameraHeight, 0);
      cameraConfig.target.set(0, this.config.cameraHeight, 1);
    }
    
    const camera = this.cameraManager.createPerspectiveCamera(
      this.cameraId,
      "Character Camera",
      cameraConfig
    );
    
    // Setup camera following
    const followConfig: CameraFollowConfig = {
      target: () => this.character,
      offset: new THREE.Vector3(0, this.config.cameraHeight, this.config.cameraDistance),
      followPosition: true,
      followRotation: false, // Never follow rotation - we handle it manually for all modes
      smoothing: this.config.cameraMode === "first-person" ? 0 : 0.3
    };
    
    this.cameraManager.setCameraFollow(this.cameraId, followConfig);
  }
  
  private setupInput(): void {
    // Only register jump binding, movement is handled by direct keyboard state reading
    const bindings: InputBinding[] = [
      {
        id: `character-jump-${this.cameraId}`,
        name: "Jump",
        inputs: [{ type: "keyboard", key: "Space" }],
        callback: () => {
          // Only trigger if this controller is active
          if (this.enabled && this.cameraManager.getActiveCameraId() === this.cameraId) {
            this.jump();
          }
        }
      }
    ];
    
    bindings.forEach(binding => this.inputManager.addBinding(binding));
    
    // Setup mouse look for all camera modes
    this.setupMouseLook();
  }
  
  private setupMouseLook(): void {
    // Handle pointer lock for ALL camera modes
    const canvas = this.inputManager['domElement'] as HTMLCanvasElement;
    
    // Click to lock pointer for all character modes
    canvas.addEventListener('click', () => {
      if (this.enabled && this.cameraManager.getActiveCameraId() === this.cameraId) {
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
      if (!this.enabled || 
          this.cameraManager.getActiveCameraId() !== this.cameraId || 
          !this.pointerLocked) return;

      // Apply mouse movement to camera rotation
      this.state.cameraRotation.yaw -= event.movementX * this.config.cameraSensitivity;
      
      // Fix Y-axis inversion: for first-person, invert Y axis to match standard FPS controls
      if (this.config.cameraMode === "first-person") {
        this.state.cameraRotation.pitch -= event.movementY * this.config.cameraSensitivity;
      } else {
        // Third-person and platformer - use normal Y axis
        this.state.cameraRotation.pitch += event.movementY * this.config.cameraSensitivity;
      }
      
      // Clamp pitch to prevent camera flipping
      this.state.cameraRotation.pitch = Math.max(
        this.config.cameraDownLimit,
        Math.min(this.config.cameraUpLimit, this.state.cameraRotation.pitch)
      );
      
      // Force immediate camera rotation update
      this.updateCameraRotation();
    });

    // Escape key to exit pointer lock
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.pointerLocked) {
        document.exitPointerLock();
      }
    });
  }
  
  private updateCameraRotation(): void {
    const camera = this.cameraManager.getCamera(this.cameraId);
    if (!camera) {
      return;
    }
    
    if (this.config.cameraMode === "first-person") {
      // For FPS mode, apply rotation directly to the camera
      camera.rotation.order = 'YXZ';
      camera.rotation.z = 0;
      camera.rotation.y = this.state.cameraRotation.yaw;
      camera.rotation.x = this.state.cameraRotation.pitch;
      
      // Update the camera follow offset for first-person (camera at character eye level)
      const followConfig = this.cameraManager.getCameraFollow(this.cameraId);
      if (followConfig) {
        followConfig.offset = new THREE.Vector3(0, this.config.cameraHeight, 0);
        this.cameraManager.setCameraFollow(this.cameraId, followConfig);
      }
      
      // Also rotate the character body to match camera yaw for movement direction
      this.character.setRotation(0, this.state.cameraRotation.yaw, 0);
    } else {
      // For third-person mode, rotate the character
      this.character.setRotation(0, this.state.cameraRotation.yaw, 0);
      
      // Update camera follow offset based on rotation
      const followConfig = this.cameraManager.getCameraFollow(this.cameraId);
      if (followConfig) {
        const distance = Math.abs(this.config.cameraDistance);
        const height = this.config.cameraHeight;
        const yaw = this.state.cameraRotation.yaw;
        const pitch = this.state.cameraRotation.pitch;
        
        // Calculate camera offset based on spherical coordinates
        const offset = new THREE.Vector3(
          Math.sin(yaw) * Math.cos(pitch) * distance,
          height + Math.sin(pitch) * distance,
          Math.cos(yaw) * Math.cos(pitch) * distance
        );
        
        followConfig.offset = offset;
        this.cameraManager.setCameraFollow(this.cameraId, followConfig);
      }
      
      // Don't call lookAt here - let updateThirdPersonCameraLookAt handle it
      // after the camera follow system has updated
    }
  }
  
  private updateThirdPersonCameraLookAt(): void {
    if (this.config.cameraMode === "first-person") {
      return; // Only for third-person cameras
    }
    
    const camera = this.cameraManager.getCamera(this.cameraId);
    if (!camera) {
      return;
    }
    
    // For third-person cameras, smoothly look at the character
    const characterPos = this.character.position.clone();
    characterPos.y += this.config.cameraHeight * 0.7; // Look at upper torso, not feet
    
    // Use smooth interpolation for lookAt to reduce choppiness
    const currentTarget = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    currentTarget.copy(camera.position).add(cameraDirection);
    
    // Lerp between current look target and desired character position
    const smoothing = this.config.cameraMode === "third-person" ? 0.15 : 0.1; // Adjust smoothing based on mode
    currentTarget.lerp(characterPos, smoothing);
    
    camera.lookAt(currentTarget);
  }
  
  private updateInputState(): void {
    const inputState = this.inputManager.getInputState();
    
    this.inputState.forward = inputState.keyboard.get("KeyW") || false;
    this.inputState.backward = inputState.keyboard.get("KeyS") || false;
    this.inputState.left = inputState.keyboard.get("KeyA") || false;
    this.inputState.right = inputState.keyboard.get("KeyD") || false;
    this.inputState.jump = inputState.keyboard.get("Space") || false;
    this.inputState.sprint = inputState.keyboard.get("ShiftLeft") || false;
    
    // Calculate input direction based on camera yaw (consistent for all modes)
    this.state.inputDirection.set(0, 0, 0);
    
    const yaw = this.state.cameraRotation.yaw;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    
    if (this.inputState.forward) this.state.inputDirection.add(forward);
    if (this.inputState.backward) this.state.inputDirection.sub(forward);
    if (this.inputState.right) this.state.inputDirection.add(right);
    if (this.inputState.left) this.state.inputDirection.sub(right);
    
    if (this.state.inputDirection.length() > 0) {
      this.state.inputDirection.normalize();
    }
    
    this.state.isSprinting = this.inputState.sprint;
    this.state.isMoving = this.state.inputDirection.length() > 0;
  }
  
  public jump(): void {
    if (this.state.isGrounded && !this.state.isJumping) {
      this.verticalVelocity = this.config.jumpForce;
      this.state.isJumping = true;
    }
  }
  
  public update(deltaTime: number): void {
    // Only update if this controller is enabled and its camera is active
    if (!this.enabled || this.cameraManager.getActiveCameraId() !== this.cameraId) {
      return;
    }
    
    this.updateInputState();
    this.updateCharacterMovement(deltaTime);
    this.updateCameraRotation();
    
    // Update third-person camera lookAt after camera follow system has updated position
    this.updateThirdPersonCameraLookAt();
  }
  
  private updateCharacterMovement(deltaTime: number): void {
    if (!this.rapierCharacterController) {
      console.warn("Rapier character controller not available");
      return;
    }

    const collider = this.getCharacterCollider();
    if (!collider) {
      console.warn("Character collider not found");
      return;
    }

    // Handle jump input
    const jumpPressed = this.inputState.jump && !this.previousInputState.jump;
    if (jumpPressed && this.state.isGrounded) {
      this.verticalVelocity = this.config.jumpForce;
      this.state.isJumping = true;
    }
    this.previousInputState.jump = this.inputState.jump;

    // Apply gravity
    this.verticalVelocity -= this.config.gravityScale * deltaTime;
    
    // Clamp fall speed
    if (this.verticalVelocity < this.config.maxFallSpeed) {
      this.verticalVelocity = this.config.maxFallSpeed;
    }

    // Calculate horizontal movement
    const targetSpeed = this.config.maxSpeed * (this.state.isSprinting ? this.config.sprintMultiplier : 1.0);
    
    if (this.state.isMoving) {
      // Lerp towards target velocity for smooth acceleration
      this.desiredVelocity.lerp(
        this.state.inputDirection.clone().multiplyScalar(targetSpeed),
        Math.min(1.0, this.config.acceleration * deltaTime)
      );
    } else {
      // Decelerate when no input
      this.desiredVelocity.lerp(
        new THREE.Vector3(0, 0, 0),
        Math.min(1.0, this.config.acceleration * 2.0 * deltaTime)
      );
    }

    // Combine horizontal and vertical movement
    const desiredTranslation = new THREE.Vector3(
      this.desiredVelocity.x * deltaTime,
      this.verticalVelocity * deltaTime,
      this.desiredVelocity.z * deltaTime
    );

    // Use Rapier's character controller to compute movement
    try {
      this.rapierCharacterController.computeColliderMovement(collider, desiredTranslation);
      
      // Get the corrected movement from Rapier
      const correctedMovement = this.rapierCharacterController.computedMovement();
      
      // Apply the corrected movement to the kinematic body
      const rigidBody = this.getCharacterRigidBody();
      if (rigidBody) {
        const currentTranslation = rigidBody.translation();
        const newTranslation = {
          x: currentTranslation.x + correctedMovement.x,
          y: currentTranslation.y + correctedMovement.y,
          z: currentTranslation.z + correctedMovement.z
        };
        
        rigidBody.setNextKinematicTranslation(newTranslation);
        
        // Update character visual position
        this.character.setPosition(newTranslation.x, newTranslation.y, newTranslation.z);
        
        // Check if we're grounded based on vertical movement
        const verticalMovement = correctedMovement.y;
        const expectedVerticalMovement = this.verticalVelocity * deltaTime;
        
        // If we didn't fall as much as expected, we're probably grounded
        if (this.verticalVelocity <= 0 && Math.abs(verticalMovement) < Math.abs(expectedVerticalMovement * 0.1)) {
          this.state.isGrounded = true;
          this.verticalVelocity = 0;
          if (this.state.isJumping) {
            this.state.isJumping = false;
          }
        } else {
          this.state.isGrounded = false;
        }

        // Update state velocity for external systems
        if (deltaTime > 0) {
          this.state.velocity.set(
            correctedMovement.x / deltaTime,
            correctedMovement.y / deltaTime,
            correctedMovement.z / deltaTime
          );
        }

        // Check for collisions with dynamic bodies
        for (let i = 0; i < this.rapierCharacterController.numComputedCollisions(); i++) {
          const collision = this.rapierCharacterController.computedCollision(i);
          // Handle collision events if needed (e.g., sound effects, damage, etc.)
          // console.log("Character collision detected:", collision);
        }
        
      }
    } catch (error) {
      console.error("Error in character controller movement:", error);
    }
  }
  
  public getState(): Readonly<CharacterState> {
    return { ...this.state };
  }
  
  public getConfig(): Readonly<CharacterControllerConfig> {
    return { ...this.config };
  }
  
  public updateConfig(newConfig: Partial<CharacterControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update Rapier character controller settings if they changed
    if (this.rapierCharacterController) {
      if (newConfig.maxSlopeClimbAngle !== undefined) {
        this.rapierCharacterController.setMaxSlopeClimbAngle(this.config.maxSlopeClimbAngle);
      }
      if (newConfig.minSlopeSlideAngle !== undefined) {
        this.rapierCharacterController.setMinSlopeSlideAngle(this.config.minSlopeSlideAngle);
      }
      if (newConfig.autoStepMaxHeight !== undefined || 
          newConfig.autoStepMinWidth !== undefined || 
          newConfig.autoStepIncludeDynamic !== undefined) {
        this.rapierCharacterController.enableAutostep(
          this.config.autoStepMaxHeight,
          this.config.autoStepMinWidth,
          this.config.autoStepIncludeDynamic
        );
      }
      if (newConfig.snapToGroundDistance !== undefined) {
        this.rapierCharacterController.enableSnapToGround(this.config.snapToGroundDistance);
      }
    }
  }
  
  public activateCamera(): void {
    this.cameraManager.setActiveCamera(this.cameraId);
    this.enabled = true;
  }
  
  public deactivate(): void {
    this.enabled = false;
    // Exit pointer lock if active
    if (this.pointerLocked && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
  
  public dispose(): void {
    // Clean up Rapier character controller
    if (this.rapierCharacterController) {
      const world = this.physicsManager.getWorld();
      if (world) {
        try {
          world.removeCharacterController(this.rapierCharacterController);
        } catch (error) {
          console.warn("Failed to remove Rapier character controller:", error);
        }
      }
      this.rapierCharacterController = null;
    }
    
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
    
    // Remove the camera from camera manager
    try {
      this.cameraManager.removeCamera(this.cameraId);
    } catch (error) {
      console.warn(`Failed to remove camera ${this.cameraId}:`, error);
    }
  }
}

// Default configurations for common use cases
export const FPS_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
  cameraMode: "first-person",
  cameraDistance: 0,
  cameraHeight: 1.7,
  maxSpeed: 10.0,
  acceleration: 80.0,
  jumpForce: 15.0,
  cameraSensitivity: 0.002,
  snapToGroundDistance: 0.05,
};

export const THIRD_PERSON_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
  cameraMode: "third-person",
  cameraDistance: -8.0,
  cameraHeight: 2.0,
  maxSpeed: 6.0,
  acceleration: 50.0,
  jumpForce: 12.0,
  cameraSensitivity: 0.002,
};

export const PLATFORMER_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
  cameraMode: "third-person",
  cameraDistance: -12.0,
  cameraHeight: 3.0,
  maxSpeed: 8.0,
  acceleration: 60.0,
  jumpForce: 18.0,
  cameraSensitivity: 0.0015,
  autoStepMaxHeight: 0.8,
  snapToGroundDistance: 0.5,
};