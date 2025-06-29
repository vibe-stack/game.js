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
  
  // Collider positioning - offset from the entity's origin
  colliderOffset: THREE.Vector3;
  
  // Movement physics
  maxSpeed: number;
  acceleration: number;
  jumpForce: number;
  sprintMultiplier: number;
  
  // Crouch and Slide mechanics
  crouchSpeedMultiplier: number; // Speed reduction when crouching (0-1)
  slideSpeedMultiplier: number; // Speed boost when sliding (usually > 1)
  slideDuration: number; // Max time for sliding in seconds
  slideDeceleration: number; // How quickly slide speed decreases
  crouchHeightReduction: number; // How much to reduce capsule height when crouching (0-1)
  slideMinSpeed: number; // Minimum speed required to start sliding
  
  // Advanced movement mechanics (CS-like)
  airAcceleration: number; // Air strafe acceleration
  airMaxSpeed: number; // Maximum air strafe speed
  groundFriction: number; // Friction when on ground
  airFriction: number; // Air resistance
  stopSpeed: number; // Speed below which extra friction is applied
  slopeFriction: number; // Friction on slopes
  slideThreshold: number; // Angle at which sliding starts (radians)
  momentumPreservation: number; // How much momentum is preserved (0-1)
  strafeResponseiveness: number; // How responsive air strafing is
  
  // Velocity and physics
  maxVelocity: number; // Maximum allowed velocity magnitude
  velocityDamping: number; // General velocity damping factor
  bounceVelocityRetention: number; // How much velocity is kept after bouncing
  
  // Jump mechanics
  preSpeedBoost: number; // Speed boost before jumping
  jumpWhileSliding: boolean; // Allow jumping while sliding on slopes
  bunnyHopTolerance: number; // Time window for bunny hopping
  
  // Moving platform and collision response
  enableMovingPlatforms: boolean; // Whether to inherit velocity from moving platforms
  enableMovingBodyPush: boolean; // Whether moving static bodies can push the character
  movingPlatformMaxDistance: number; // Max distance to consider for moving platform detection
  movingBodyPushForce: number; // Multiplier for push force from moving bodies
  
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
  
  // Animation settings
  idleAnimation?: string;
  walkAnimation?: string;
  sprintAnimation?: string;
  jumpAnimation?: string;
  fallAnimation?: string;
  crouchAnimation?: string;
  slideAnimation?: string;
}

export interface CharacterState {
  isGrounded: boolean;
  isJumping: boolean;
  isSprinting: boolean;
  isMoving: boolean;
  isCrouching: boolean;
  isSliding: boolean;
  slideTimer: number; // Time remaining for current slide
  velocity: THREE.Vector3;
  inputDirection: THREE.Vector3;
  cameraRotation: { pitch: number; yaw: number };
  currentAnimation?: string;
  
  // Advanced movement state
  surfaceNormal: THREE.Vector3;
  lastGroundedTime: number;
  currentSpeed: number;
  airTime: number;
  lastJumpTime: number;
  wishDirection: THREE.Vector3;
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
  
  // Track current collider height for position adjustments
  private currentColliderHalfHeight: number;
  
  // Input tracking
  private inputState: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    sprint: boolean;
    crouch: boolean;
  };
  
  private previousInputState: {
    jump: boolean;
  };
  
  // Jump buffering for better responsiveness
  private jumpBuffer: number = 0;
  private coyoteTime: number = 0;
  private readonly JUMP_BUFFER_TIME = 0.15; // 150ms jump buffer
  private readonly COYOTE_TIME = 0.1; // 100ms coyote time
  
  // Camera
  private cameraId: string;
  private pointerLocked: boolean = false;
  private enabled: boolean = true;
  
  // Movement
  private desiredVelocity: THREE.Vector3 = new THREE.Vector3();
  private verticalVelocity: number = 0;
  
  // Advanced movement
  private currentVelocity: THREE.Vector3 = new THREE.Vector3();
  private mouseVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private lastMouseMovement: { x: number; y: number } = { x: 0, y: 0 };
  private frameTime: number = 0;
  
  // Animation state
  private lastAnimation: string | undefined;
  
  // Moving platform tracking
  private movingPlatformVelocity: THREE.Vector3 = new THREE.Vector3();
  private lastMovingPlatformId: string | null = null;
  private movingBodyPushVelocity: THREE.Vector3 = new THREE.Vector3();
  
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
      colliderOffset: new THREE.Vector3(0, 0, 0),
      maxSpeed: 8.0,
      acceleration: 50.0,
      jumpForce: 12.0,
      sprintMultiplier: 1.8,
      
      // Crouch and Slide mechanics
      crouchSpeedMultiplier: 0.5,
      slideSpeedMultiplier: 1.5,
      slideDuration: 1.0,
      slideDeceleration: 0.5,
      crouchHeightReduction: 0.2,
      slideMinSpeed: 5.0,
      
      // Advanced movement mechanics (CS-like defaults)
      airAcceleration: 40.0,
      airMaxSpeed: 30.0,
      groundFriction: 8.0,
      airFriction: 0.1,
      stopSpeed: 1.0,
      slopeFriction: 2.0,
      slideThreshold: Math.PI / 6, // 30 degrees
      momentumPreservation: 0.95,
      strafeResponseiveness: 1.0,
      
      // Velocity and physics
      maxVelocity: 50.0,
      velocityDamping: 0.99,
      bounceVelocityRetention: 0.8,
      
      // Jump mechanics
      preSpeedBoost: 1.2,
      jumpWhileSliding: true,
      bunnyHopTolerance: 0.1,
      
      // Moving platform and collision response
      enableMovingPlatforms: true,
      enableMovingBodyPush: true,
      movingPlatformMaxDistance: 0.5,
      movingBodyPushForce: 1.0,
      
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
      isCrouching: false,
      isSliding: false,
      slideTimer: 0,
      velocity: new THREE.Vector3(0, 0, 0),
      inputDirection: new THREE.Vector3(),
      cameraRotation: { pitch: 0, yaw: 0 },
      
      // Advanced movement state
      surfaceNormal: new THREE.Vector3(0, 1, 0),
      lastGroundedTime: 0,
      currentSpeed: 0,
      airTime: 0,
      lastJumpTime: 0,
      wishDirection: new THREE.Vector3()
    };
    
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
    
    // Initialize current collider height
    this.currentColliderHalfHeight = this.config.capsuleHalfHeight;
    
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
    // Remove the jump binding since we'll handle it directly in updateInputState
    
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

      // Track mouse movement for air strafing
      this.lastMouseMovement.x = event.movementX;
      this.lastMouseMovement.y = event.movementY;
      
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

    if (this.config.cameraMode === 'first-person') {
      // For FPS mode, apply rotation directly to the camera
      camera.rotation.order = 'YXZ';
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
      // For third-person mode, rotate the character to face the movement direction
      if (this.state.isMoving && this.state.wishDirection.lengthSq() > 0.01) {
        const targetYaw = Math.atan2(this.state.wishDirection.x, this.state.wishDirection.z);
        // Use a small lerp factor for smooth rotation. Use frameTime for frame-rate independence.
        const lerpFactor = Math.min(10 * this.frameTime, 1.0);
        const newYaw = THREE.MathUtils.lerp(this.character.rotation.y, targetYaw, lerpFactor);
        this.character.setRotation(this.character.rotation.x, newYaw, 0);
      }

      // Update camera follow offset based on rotation
      const followConfig = this.cameraManager.getCameraFollow(this.cameraId);
      if (followConfig) {
        const distance = Math.abs(this.config.cameraDistance);
        const height = this.config.cameraHeight;
        const yaw = this.state.cameraRotation.yaw;
        const pitch = this.state.cameraRotation.pitch;

        // Calculate camera offset to position it behind the character
        // Use negative distance values to position camera behind
        const offset = new THREE.Vector3(
          -Math.sin(yaw) * Math.cos(pitch) * distance,
          height + Math.sin(pitch) * distance,
          -Math.cos(yaw) * Math.cos(pitch) * distance,
        );

        followConfig.offset = offset;
        this._updateThirdPersonCameraCollision(followConfig);
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
  
  private updateMouseVelocity(deltaTime: number): void {
    if (deltaTime > 0) {
      this.mouseVelocity.x = this.lastMouseMovement.x / deltaTime;
      this.mouseVelocity.y = this.lastMouseMovement.y / deltaTime;
    }
    
    // Decay mouse movement for next frame
    this.lastMouseMovement.x *= 0.8;
    this.lastMouseMovement.y *= 0.8;
  }
  
  private updateStateTracking(deltaTime: number): void {
    // Update timing
    if (this.state.isGrounded) {
      this.state.lastGroundedTime = 0;
      this.state.airTime = 0;
    } else {
      this.state.lastGroundedTime += deltaTime;
      this.state.airTime += deltaTime;
    }
    
    // Update current speed
    this.state.currentSpeed = this.currentVelocity.length();
  }

  private updateCrouchAndSlide(deltaTime: number): void {
    const wasCrouching = this.state.isCrouching;
    const wasSliding = this.state.isSliding;

    const crouchPressed = this.inputState.crouch;

    // Handle sliding state
    if (this.state.isSliding) {
      this.state.slideTimer -= deltaTime;
      const slideDecel = this.config.slideDeceleration * deltaTime;
      const currentSpeed = this.currentVelocity.length();

      if (currentSpeed > slideDecel) {
        this.currentVelocity.multiplyScalar(1 - (slideDecel / currentSpeed));
      }

      // Conditions to stop sliding
      if (this.state.slideTimer <= 0 || !crouchPressed || currentSpeed < this.config.slideMinSpeed * 0.5) {
        this.state.isSliding = false;
      }
    }

    // Check for new slide start
    if (crouchPressed && this.state.isGrounded && !this.state.isSliding) {
      if (this.state.isMoving && this.state.currentSpeed >= this.config.slideMinSpeed) {
        this.state.isSliding = true;
        this.state.slideTimer = this.config.slideDuration;
      }
    }

    // Update crouching state: can crouch if pressing crouch, on ground, and not sliding.
    this.state.isCrouching = crouchPressed && this.state.isGrounded && !this.state.isSliding;
    
    // Update camera height based on crouch/slide state
    this.updateCameraHeight(wasCrouching, wasSliding);

    // Update collider height only when the crouch/slide state changes
    if (wasCrouching !== this.state.isCrouching || wasSliding !== this.state.isSliding) {
      this.updateColliderHeight();
    }
  }
  
  private updateCameraHeight(wasCrouching: boolean, wasSliding: boolean): void {
    const normalHeight = this.config.cameraHeight;
    let targetHeight = normalHeight;
    
    if (this.state.isCrouching || this.state.isSliding) {
      // Reduce camera height when crouching or sliding
      targetHeight = normalHeight * (1 - this.config.crouchHeightReduction);
    }
    
    // Smoothly interpolate camera height
    const followConfig = this.cameraManager.getCameraFollow(this.cameraId);
    if (followConfig && followConfig.offset) {
      const currentHeight = this.config.cameraMode === "first-person" ? 
        this.config.cameraHeight : followConfig.offset.y;
      const lerpFactor = Math.min(10 * this.frameTime, 1.0);
      const newHeight = THREE.MathUtils.lerp(currentHeight, targetHeight, lerpFactor);
      
      if (this.config.cameraMode === "first-person") {
        this.config.cameraHeight = newHeight;
      } else if (followConfig.offset) {
        followConfig.offset.y = newHeight;
        this.cameraManager.setCameraFollow(this.cameraId, followConfig);
      }
    }
  }
  
  private updateColliderHeight(): void {
    // Update the character controller's collider height
    const rigidBody = this.getCharacterRigidBody();
    const collider = this.getCharacterCollider();
    const world = this.physicsManager.getWorld();
    
    const colliderId = this.character["colliderId"];
    const rigidBodyId = this.character["rigidBodyId"];
    
    if (rigidBody && collider && world && colliderId && rigidBodyId) {
      const baseHalfHeight = this.config.capsuleHalfHeight;
      const oldHalfHeight = this.currentColliderHalfHeight; // Use tracked previous height
      let newHalfHeight = baseHalfHeight;
      
      if (this.state.isCrouching || this.state.isSliding) {
        newHalfHeight = baseHalfHeight * (1 - this.config.crouchHeightReduction);
      }
      
      // Only update if height actually changed
      if (Math.abs(newHalfHeight - oldHalfHeight) < 0.001) {
        return; // No meaningful change, skip update
      }
      
      // Calculate the height difference to adjust character position
      const heightDifference = oldHalfHeight - newHalfHeight;
      
      // Remove the old collider
      this.physicsManager.removeCollider(colliderId);
      
      // Create new capsule collider with updated height
      const updatedDimensions = new THREE.Vector3(
        this.config.capsuleRadius * 2, // Width (diameter)
        newHalfHeight * 2, // Height (full height, not half-height)
        this.config.capsuleRadius * 2  // Depth (diameter)
      );
      
      // Apply character scale to the collider dimensions
      if (this.character.scale) {
        updatedDimensions.x *= Math.max(this.character.scale.x, this.character.scale.z);
        updatedDimensions.y *= this.character.scale.y;
        updatedDimensions.z *= Math.max(this.character.scale.x, this.character.scale.z);
      }
      
      // Create the new collider with updated dimensions
      this.physicsManager.createCollider(
        colliderId,
        rigidBodyId,
        "capsule",
        updatedDimensions
      );
      
      // Adjust character position to keep the bottom of the capsule at ground level
      // When crouching (newHalfHeight < oldHalfHeight), heightDifference is positive, so we move down
      // When standing up (newHalfHeight > oldHalfHeight), heightDifference is negative, so we move up
      const currentTranslation = rigidBody.translation();
      const positionAdjustment = -heightDifference; // Negative because we want to keep bottom at same level
      
      const newTranslation = {
        x: currentTranslation.x,
        y: currentTranslation.y + positionAdjustment,
        z: currentTranslation.z
      };
      
      // Update the physics body position
      rigidBody.setNextKinematicTranslation(newTranslation);
      
      // Update the character visual position
      const visualPosition = new THREE.Vector3(newTranslation.x, newTranslation.y, newTranslation.z);
      if (this.config.colliderOffset) {
        visualPosition.sub(this.config.colliderOffset);
      }
      
      this.character.position.copy(visualPosition);
      (this.character as any).emitChange();
      
      // Update tracked height for next time
      this.currentColliderHalfHeight = newHalfHeight;
    }
  }

  private updateInputState(): void {
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
    
    // Calculate wish direction (what the player wants to do)
    this.state.wishDirection.set(0, 0, 0);
    
    const yaw = this.state.cameraRotation.yaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    
    if (this.inputState.forward) {
      this.state.wishDirection.add(forward);
    }
    if (this.inputState.backward) {
      this.state.wishDirection.sub(forward);
    }
    if (this.inputState.right) {
      this.state.wishDirection.sub(right);
    }
    if (this.inputState.left) {
      this.state.wishDirection.add(right);
    }
    
    if (this.state.wishDirection.length() > 0) {
      this.state.wishDirection.normalize();
    }
    
    // Legacy input direction for compatibility
    this.state.inputDirection.copy(this.state.wishDirection);
    
    this.state.isSprinting = this.inputState.sprint && !this.state.isCrouching && !this.state.isSliding;
    this.state.isMoving = this.state.wishDirection.length() > 0;
  }
  
  private updateGroundMovement(deltaTime: number): void {
    // Calculate base speed based on movement state
    let baseSpeed = this.config.maxSpeed;
    
    if (this.state.isSliding) {
      baseSpeed *= this.config.slideSpeedMultiplier;
    } else if (this.state.isCrouching) {
      baseSpeed *= this.config.crouchSpeedMultiplier;
    } else if (this.state.isSprinting) {
      baseSpeed *= this.config.sprintMultiplier;
    }
    
    const wishSpeed = baseSpeed;
    
    if (this.state.isMoving) {
      // CS-style ground acceleration - only apply friction to velocity components not in wish direction
      const currentSpeed = this.currentVelocity.dot(this.state.wishDirection);
      const addSpeed = wishSpeed - currentSpeed;
      
      if (addSpeed > 0) {
        const accelSpeed = Math.min(this.config.acceleration * deltaTime, addSpeed);
        this.currentVelocity.add(this.state.wishDirection.clone().multiplyScalar(accelSpeed));
      }
      
      // Apply friction only to velocity perpendicular to wish direction
      this.applyGroundFriction(deltaTime, this.state.wishDirection);
    } else {
      // Apply full friction when not trying to move
      this.applyFriction(this.config.groundFriction, deltaTime);
    }
  }
  
  private applyGroundFriction(deltaTime: number, wishDirection: THREE.Vector3): void {
    if (this.config.groundFriction <= 0) return;
    
    const speed = this.currentVelocity.length();
    if (speed < 0.01) return;
    
    // Decompose velocity into parallel and perpendicular components to wish direction
    const parallel = wishDirection.clone().multiplyScalar(this.currentVelocity.dot(wishDirection));
    const perpendicular = this.currentVelocity.clone().sub(parallel);
    
    // Apply friction only to perpendicular component (allows smooth direction changes)
    const perpSpeed = perpendicular.length();
    if (perpSpeed > 0.01) {
      const control = Math.max(perpSpeed, this.config.stopSpeed);
      const drop = control * this.config.groundFriction * deltaTime;
      
      const newPerpSpeed = Math.max(0, perpSpeed - drop);
      if (newPerpSpeed !== perpSpeed) {
        perpendicular.multiplyScalar(newPerpSpeed / perpSpeed);
      }
    }
    
    // Recombine velocity components
    this.currentVelocity.copy(parallel.add(perpendicular));
  }

  private updateAirMovement(deltaTime: number): void {
    // Air strafing - the key to CS-like movement
    this.applyAirAcceleration(deltaTime);
    
    // Air friction (much less than ground)
    this.applyFriction(this.config.airFriction, deltaTime);
  }
  
  private applyAirAcceleration(deltaTime: number): void {
    if (!this.state.isMoving) return;
    
    const wishSpeed = this.config.airMaxSpeed;
    const wishDirection = this.state.wishDirection.clone();
    
    // Add mouse influence to wish direction for air strafing
    if (Math.abs(this.mouseVelocity.x) > 0.1) {
      const mouseTurn = this.mouseVelocity.x * this.config.strafeResponseiveness * 0.001;
      
      // Create perpendicular direction for strafing
      const currentVel = new THREE.Vector3(this.currentVelocity.x, 0, this.currentVelocity.z).normalize();
      const perpendicular = new THREE.Vector3(-currentVel.z, 0, currentVel.x);
      
      // Add mouse turning influence
      wishDirection.add(perpendicular.multiplyScalar(mouseTurn));
      if (wishDirection.length() > 0) {
        wishDirection.normalize();
      }
    }
    
    // Calculate current velocity in wish direction
    const currentSpeed = this.currentVelocity.dot(wishDirection);
    const addSpeed = wishSpeed - currentSpeed;
    
    if (addSpeed > 0) {
      const accelSpeed = Math.min(this.config.airAcceleration * deltaTime, addSpeed);
      this.currentVelocity.add(wishDirection.multiplyScalar(accelSpeed));
    }
  }
  
  private applyFriction(friction: number, deltaTime: number): void {
    const speed = this.currentVelocity.length();
    if (speed < 0.01) return;
    
    const control = Math.max(speed, this.config.stopSpeed);
    const drop = control * friction * deltaTime;
    
    // Scale velocity to remove the drop amount
    let newSpeed = Math.max(0, speed - drop);
    if (newSpeed !== speed) {
      newSpeed /= speed;
      this.currentVelocity.multiplyScalar(newSpeed);
    }
  }
  
  private updateGroundDetection(correctedMovement: THREE.Vector3, deltaTime: number): void {
    const wasGrounded = this.state.isGrounded;
    
    // Use Rapier's computedGrounded method for reliable ground detection
    this.state.isGrounded = this.rapierCharacterController!.computedGrounded();

    // If we are grounded, find the surface normal of the ground
    if (this.state.isGrounded) {
        const surfaceNormal = new THREE.Vector3(0, 1, 0);
        for (let i = 0; i < this.rapierCharacterController!.numComputedCollisions(); i++) {
            const collision = this.rapierCharacterController!.computedCollision(i);
            // normal2 is the outward normal of the collider we're hitting. For ground, its y should be positive.
            if (collision && collision.normal2.y > 0.7) {
                surfaceNormal.set(collision.normal2.x, collision.normal2.y, collision.normal2.z);
                break;
            }
        }
        this.state.surfaceNormal.copy(surfaceNormal);
    }
    
    // Landing logic
    if (this.state.isGrounded && !wasGrounded) {
      this.verticalVelocity = 0;
      if (this.state.isJumping) {
        this.state.isJumping = false;
      }
      
      // Preserve momentum when landing on slopes (automatic slope slide)
      const slopeAngle = Math.acos(this.state.surfaceNormal.y);
      const isOnSlope = slopeAngle > this.config.slideThreshold;
      
      if (isOnSlope) {
        const horizontalVel = new THREE.Vector3(this.currentVelocity.x, 0, this.currentVelocity.z);
        const speed = horizontalVel.length() * this.config.momentumPreservation;
        if (speed > 0) {
          horizontalVel.normalize().multiplyScalar(speed);
          this.currentVelocity.x = horizontalVel.x;
          this.currentVelocity.z = horizontalVel.z;
        }
      }
    }
  }
  
  private updateCollisionResponse(correctedMovement: THREE.Vector3, deltaTime: number): void {
    // Handle velocity deflection on collision
    const originalMovement = new THREE.Vector3(
      this.currentVelocity.x * deltaTime,
      this.verticalVelocity * deltaTime,
      this.currentVelocity.z * deltaTime
    );
    
    // If movement was blocked significantly, deflect velocity
    const movementDiff = originalMovement.clone().sub(correctedMovement);
    if (movementDiff.length() > 0.01) {
      // Apply bounce/deflection
      for (let i = 0; i < this.rapierCharacterController!.numComputedCollisions(); i++) {
        const collision = this.rapierCharacterController!.computedCollision(i);
        if (collision) {
          const n = collision.normal2;
          const normal = new THREE.Vector3(n.x as number, n.y as number, n.z as number);
          
          // Deflect velocity based on surface normal
          const velocityLength = this.currentVelocity.length();
          if (velocityLength > 0) {
            const deflectedVel = this.currentVelocity.clone().reflect(normal);
            deflectedVel.multiplyScalar(this.config.bounceVelocityRetention);
            
            // Only apply deflection if it maintains/increases speed (surfing!)
            if (deflectedVel.length() >= velocityLength * 0.8) {
              this.currentVelocity.copy(deflectedVel);
            }
          }
        }
      }
    }
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
    
    this.frameTime = deltaTime;
    
    // Update mouse velocity for air strafing
    this.updateMouseVelocity(deltaTime);
    
    this.updateInputState();
    this.updateCrouchAndSlide(deltaTime);
    this.updateCameraRotation();
    this.updateAdvancedMovement(deltaTime);
    
    // Update third-person camera lookAt after camera follow system has updated position
    this.updateThirdPersonCameraLookAt();
    
    // Update animations based on character state
    this.updateAnimation();
    
    // Update state tracking
    this.updateStateTracking(deltaTime);
  }
  
  private updateAnimation(): void {
    // Check if the character has animation capabilities (e.g., Mesh3D with loaded model)
    const mesh3d = this.character as any;
    if (!mesh3d.playAnimation || !mesh3d.getAnimationNames) {
      return; // Not an animated entity
    }
    
    // Determine which animation should be playing based on state
    let targetAnimation: string | undefined;
    
    // Priority order: slide > crouch > air states > ground movement > idle
    if (this.state.isSliding && this.config.slideAnimation) {
      // Sliding
      targetAnimation = this.config.slideAnimation;
    } else if (this.state.isCrouching && this.config.crouchAnimation) {
      // Crouching (stationary or moving)
      targetAnimation = this.config.crouchAnimation;
    } else if (!this.state.isGrounded && this.verticalVelocity < -2) {
      // Falling
      targetAnimation = this.config.fallAnimation;
    } else if (this.state.isJumping && this.verticalVelocity > 0) {
      // Jumping (going up)
      targetAnimation = this.config.jumpAnimation;
    } else if (this.state.isMoving && this.state.isGrounded) {
      // Moving on ground
      if (this.state.isSprinting && this.config.sprintAnimation) {
        targetAnimation = this.config.sprintAnimation;
      } else if (this.config.walkAnimation) {
        targetAnimation = this.config.walkAnimation;
      }
    } else {
      // Standing still
      targetAnimation = this.config.idleAnimation;
    }
    
    // Play the animation if it's different from current
    if (targetAnimation && targetAnimation !== this.lastAnimation) {
      mesh3d.playAnimation(targetAnimation, 0.2); // 0.2s fade time
      this.lastAnimation = targetAnimation;
      this.state.currentAnimation = targetAnimation;
    }
  }
  
  private detectMovingPlatform(): void {
    if (!this.config.enableMovingPlatforms || !this.state.isGrounded) {
      this.movingPlatformVelocity.set(0, 0, 0);
      this.lastMovingPlatformId = null;
      return;
    }
    
    // Reset moving platform velocity
    this.movingPlatformVelocity.set(0, 0, 0);
    let currentMovingPlatformId: string | null = null;
    
    // Check collision data to find what we're standing on
    for (let i = 0; i < this.rapierCharacterController!.numComputedCollisions(); i++) {
      const collision = this.rapierCharacterController!.computedCollision(i);
      if (collision && collision.normal1.y > 0.7) { // Standing on this surface
        const colliderHandle = collision.collider;
        
        // Find the rigid body associated with this collider
        const world = this.physicsManager.getWorld();
        if (!world) continue;
        
        if (!colliderHandle) continue;
        const collider = world.getCollider(colliderHandle.handle);
        if (!collider) continue;
        
        const rigidBodyHandle = collider.parent();
        if (!rigidBodyHandle) continue;
        
        const rigidBody = world.getRigidBody(rigidBodyHandle.handle);
        if (!rigidBody) continue;
        
        // Check if this is a kinematic body (moving platform)
        const bodyType = rigidBody.bodyType();
        const rapierModule = this.physicsManager.getRapierModule();
        if (!rapierModule) continue;
        
        const isKinematic = bodyType === rapierModule.RigidBodyType.KinematicPositionBased ||
                          bodyType === rapierModule.RigidBodyType.KinematicVelocityBased;
        
        if (isKinematic) {
          // Get the velocity of the moving platform
          const linvel = rigidBody.linvel();
          const platformVelocity = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
          
          // Only inherit horizontal movement from platforms
          this.movingPlatformVelocity.set(platformVelocity.x, 0, platformVelocity.z);
          currentMovingPlatformId = colliderHandle.handle.toString();
          break;
        }
      }
    }
    
    this.lastMovingPlatformId = currentMovingPlatformId;
  }
  
  private detectMovingBodyCollisions(deltaTime: number): void {
    if (!this.config.enableMovingBodyPush) {
      this.movingBodyPushVelocity.set(0, 0, 0);
      return;
    }
    
    // Reset push velocity
    this.movingBodyPushVelocity.set(0, 0, 0);
    
    // Method 1: Check computed collisions from character controller movement
    for (let i = 0; i < this.rapierCharacterController!.numComputedCollisions(); i++) {
      const collision = this.rapierCharacterController!.computedCollision(i);
      if (!collision) continue;
      
      this.processMovingBodyCollision(collision.collider, collision.normal1, deltaTime);
    }
    
    // Method 2: Direct world collision query for when character is stationary
    // This handles cases where kinematic bodies move into the character
    this.queryWorldCollisions(deltaTime);
    
    // Limit the push velocity to prevent excessive forces
    const maxPushSpeed = this.config.maxSpeed * 2;
    if (this.movingBodyPushVelocity.length() > maxPushSpeed) {
      this.movingBodyPushVelocity.normalize().multiplyScalar(maxPushSpeed);
    }
  }
  
  private processMovingBodyCollision(colliderHandle: any, normal: any, deltaTime: number): void {
    const world = this.physicsManager.getWorld();
    if (!world || !colliderHandle) return;
    
    const collider = world.getCollider(colliderHandle.handle);
    if (!collider) return;
    
    const rigidBodyHandle = collider.parent();
    if (!rigidBodyHandle) return;
    
    const rigidBody = world.getRigidBody(rigidBodyHandle.handle);
    if (!rigidBody) return;
    
    // Check if this is a moving kinematic or dynamic body
    const bodyType = rigidBody.bodyType();
    const rapierModule = this.physicsManager.getRapierModule();
    if (!rapierModule) return;
    
    const isMovingBody = bodyType === rapierModule.RigidBodyType.KinematicPositionBased ||
                        bodyType === rapierModule.RigidBodyType.KinematicVelocityBased ||
                        bodyType === rapierModule.RigidBodyType.Dynamic;
    
    if (isMovingBody) {
      const linvel = rigidBody.linvel();
      const bodyVelocity = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
      
      // Only apply push if the body is moving fast enough
      if (bodyVelocity.length() > 0.05) {
        const normalVec = new THREE.Vector3(
          normal.x as number,
          normal.y as number,
          normal.z as number
        );
        
        // Calculate the component of body velocity in the direction of the collision normal
        const pushComponent = bodyVelocity.dot(normalVec);
        
        if (pushComponent > 0.01) { // Body is moving into the character
          // Apply push force in the direction of the normal
          const pushForce = normalVec.multiplyScalar(pushComponent * this.config.movingBodyPushForce);
          this.movingBodyPushVelocity.add(pushForce);
        }
      }
    }
  }
  
  private queryWorldCollisions(deltaTime: number): void {
    const world = this.physicsManager.getWorld();
    const characterCollider = this.getCharacterCollider();
    if (!world || !characterCollider) return;
    
    // Iterate through all contact pairs to find collisions with the character
    world.contactPairsWith(characterCollider, (otherCollider: RapierType.Collider) => {
      
      const rigidBodyHandle = otherCollider.parent();
      if (!rigidBodyHandle) return;
      
      const rigidBody = world.getRigidBody(rigidBodyHandle.handle);
      if (!rigidBody) return;
      
      // Check if this is a kinematic body
      const bodyType = rigidBody.bodyType();
      const rapierModule = this.physicsManager.getRapierModule();
      if (!rapierModule) return;
      
      const isKinematic = bodyType === rapierModule.RigidBodyType.KinematicPositionBased ||
                         bodyType === rapierModule.RigidBodyType.KinematicVelocityBased;
      
      if (isKinematic) {
        const linvel = rigidBody.linvel();
        const bodyVelocity = new THREE.Vector3(linvel.x, linvel.y, linvel.z);
        
        // Only process if the kinematic body is moving
        if (bodyVelocity.length() > 0.1) {
          // Get contact information
          const characterPos = characterCollider.translation();
          const otherPos = otherCollider.translation();
          
          // Calculate direction from other object to character
          const pushDirection = new THREE.Vector3(
            characterPos.x - otherPos.x,
            characterPos.y - otherPos.y,
            characterPos.z - otherPos.z
          );
          
          if (pushDirection.length() > 0) {
            pushDirection.normalize();
            
            // Calculate how much the kinematic body is moving toward the character
            const approachSpeed = -bodyVelocity.dot(pushDirection);
            
            if (approachSpeed > 0.01) {
              // Apply push force proportional to approach speed
              const pushForce = pushDirection.multiplyScalar(approachSpeed * this.config.movingBodyPushForce);
              this.movingBodyPushVelocity.add(pushForce);
            }
          }
        }
      }
    });
  }
  
  private updateAdvancedMovement(deltaTime: number): void {
    if (!this.rapierCharacterController) {
      console.warn("Rapier character controller not available");
      return;
    }

    const collider = this.getCharacterCollider();
    if (!collider) {
      console.warn("Character collider not found");
      return;
    }

    // Detect moving platforms and moving body collisions BEFORE processing movement
    this.detectMovingPlatform();
    this.detectMovingBodyCollisions(deltaTime);

    // Update jump buffer and coyote time
    if (this.inputState.jump && !this.previousInputState.jump) {
      this.jumpBuffer = this.JUMP_BUFFER_TIME;
    }
    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= deltaTime;
    }
    
    if (this.state.isGrounded) {
      this.coyoteTime = this.COYOTE_TIME;
    } else if (this.coyoteTime > 0) {
      this.coyoteTime -= deltaTime;
    }

    // CS-style jumping with pre-speed boost and sliding support
    const canJump = this.state.isGrounded || this.coyoteTime > 0 || 
                   (this.config.jumpWhileSliding && this.state.isSliding);
    const shouldJump = this.jumpBuffer > 0 && canJump && !this.state.isJumping;
    
    if (shouldJump) {
      // Apply pre-speed boost for better jumping
      if (this.state.isMoving) {
        const currentHorizontalSpeed = Math.sqrt(this.currentVelocity.x * this.currentVelocity.x + 
                                                this.currentVelocity.z * this.currentVelocity.z);
        const boostFactor = Math.max(1.0, this.config.preSpeedBoost);
        const boostedSpeed = currentHorizontalSpeed * boostFactor;
        
        if (boostedSpeed > currentHorizontalSpeed) {
          const horizontalDirection = new THREE.Vector3(this.currentVelocity.x, 0, this.currentVelocity.z).normalize();
          this.currentVelocity.x = horizontalDirection.x * boostedSpeed;
          this.currentVelocity.z = horizontalDirection.z * boostedSpeed;
        }
      }
      
      this.verticalVelocity = this.config.jumpForce;
      this.state.isJumping = true;
      this.state.lastJumpTime = 0;
      this.jumpBuffer = 0;
      this.coyoteTime = 0;
    }
    this.previousInputState.jump = this.inputState.jump;

    // Apply gravity
    this.verticalVelocity -= this.config.gravityScale * deltaTime;
    
    // Clamp fall speed
    if (this.verticalVelocity < this.config.maxFallSpeed) {
      this.verticalVelocity = this.config.maxFallSpeed;
    }

    // Advanced movement mechanics
    if (this.state.isGrounded) {
      this.updateGroundMovement(deltaTime);
    } else {
      this.updateAirMovement(deltaTime);
    }

    // Apply velocity damping
    this.currentVelocity.multiplyScalar(this.config.velocityDamping);
    
    // Clamp maximum velocity
    const currentSpeed = this.currentVelocity.length();
    if (currentSpeed > this.config.maxVelocity) {
      this.currentVelocity.normalize().multiplyScalar(this.config.maxVelocity);
    }

    // Add moving platform velocity and moving body push velocity to the current velocity
    const totalMovementVelocity = this.currentVelocity.clone()
      .add(this.movingPlatformVelocity)
      .add(this.movingBodyPushVelocity);

    // Combine horizontal and vertical movement
    const desiredTranslation = new THREE.Vector3(
      totalMovementVelocity.x * deltaTime,
      this.verticalVelocity * deltaTime,
      totalMovementVelocity.z * deltaTime
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
        const visualPosition = new THREE.Vector3(newTranslation.x, newTranslation.y, newTranslation.z);
        if (this.config.colliderOffset) {
          visualPosition.sub(this.config.colliderOffset);
        }
        
        this.character.position.copy(visualPosition);
        (this.character as any).emitChange();
        
        // Convert Rapier Vector to THREE.Vector3
        const correctedMovementVec3 = new THREE.Vector3(
          correctedMovement.x,
          correctedMovement.y,
          correctedMovement.z
        );
        
        this.updateGroundDetection(correctedMovementVec3, deltaTime);
        this.updateCollisionResponse(correctedMovementVec3, deltaTime);

        // Update state velocity for external systems
        if (deltaTime > 0) {
          this.state.velocity.set(
            correctedMovement.x / deltaTime,
            correctedMovement.y / deltaTime,
            correctedMovement.z / deltaTime
          );
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

  private _updateThirdPersonCameraCollision(followConfig: CameraFollowConfig): void {
    const world = this.physicsManager.getWorld();
    const rapier = this.physicsManager.getRapierModule();
    if (this.config.cameraMode !== 'third-person' || !world || !rapier) {
      return;
    }
  
    const characterCollider = this.getCharacterCollider();
    if (!characterCollider) return;
  
    // Start point of the raycast (e.g., character's head)
    const rayOriginPoint = this.character.position.clone();
    rayOriginPoint.y += this.config.cameraHeight * 0.7;
  
    // The calculated offset for the camera if there were no obstacles
    const idealOffset = followConfig.offset!.clone();
  
    // The ideal position of the camera in world space
    const idealCameraPosition = this.character.position.clone().add(idealOffset);
  
    // Vector from the character's head to the ideal camera position
    const cameraVector = idealCameraPosition.clone().sub(rayOriginPoint);
    const maxDistance = cameraVector.length();
    if (maxDistance < 0.01) return; // Avoid issues with zero-length vectors

    const rayDirection = cameraVector.normalize();
  
    const ray = new rapier.Ray(
      { x: rayOriginPoint.x, y: rayOriginPoint.y, z: rayOriginPoint.z },
      { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z }
    );
  
    const hit = world.castRay(
      ray,
      maxDistance,
      true, // solid
      undefined,
      undefined,
      characterCollider
    );
  
    if (hit) {
      // A wall or object is in the way.
      // Move the camera to the point of collision, with a small offset.
      const newDistance = Math.max(Math.abs(this.config.cameraMinDistance), (hit as any).timeOfImpact - 0.2);
  
      // The new camera position is along the cameraVector from the origin point.
      const newCameraPosition = rayOriginPoint.clone().add(rayDirection.multiplyScalar(newDistance));
  
      // We need to calculate the new offset from the character's origin
      const newOffset = newCameraPosition.sub(this.character.position);
      followConfig.offset = newOffset;
    }
  }
}

// Default configurations for common use cases
export const FPS_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
  cameraMode: "first-person",
  cameraDistance: 0,
  cameraHeight: 1.7,
  colliderOffset: new THREE.Vector3(0, 0, 0),
  maxSpeed: 10.0,
  acceleration: 80.0,
  jumpForce: 15.0,
  cameraSensitivity: 0.002,
  snapToGroundDistance: 0.05,
  
  // Crouch and Slide mechanics for FPS
  crouchSpeedMultiplier: 0.4,
  slideSpeedMultiplier: 1.8,
  slideDuration: 1.2,
  slideDeceleration: 0.8,
  crouchHeightReduction: 0.4,
  slideMinSpeed: 6.0,
  
  // CS-style movement for FPS
  airAcceleration: 50.0,
  airMaxSpeed: 35.0,
  groundFriction: 6.0,
  airFriction: 0.02,
  stopSpeed: 1.0,
  slopeFriction: 3.0,
  slideThreshold: Math.PI / 6,
  momentumPreservation: 0.98,
  strafeResponseiveness: 1.2,
  maxVelocity: 60.0,
  velocityDamping: 0.995,
  bounceVelocityRetention: 0.9,
  preSpeedBoost: 1.3,
  jumpWhileSliding: true,
  bunnyHopTolerance: 0.15,
};

export const THIRD_PERSON_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
  cameraMode: "third-person",
  cameraDistance: -8.0,
  cameraHeight: 2.0,
  colliderOffset: new THREE.Vector3(0, 0, 0),
  maxSpeed: 6.0,
  acceleration: 50.0,
  jumpForce: 12.0,
  cameraSensitivity: 0.002,
  
  // Crouch and Slide mechanics for third-person
  crouchSpeedMultiplier: 0.5,
  slideSpeedMultiplier: 1.5,
  slideDuration: 1.0,
  slideDeceleration: 0.6,
  crouchHeightReduction: 0.3,
  slideMinSpeed: 4.0,
  
  // CS-style movement for third-person
  airAcceleration: 40.0,
  airMaxSpeed: 25.0,
  groundFriction: 8.0,
  airFriction: 0.05,
  stopSpeed: 1.0,
  slopeFriction: 2.5,
  slideThreshold: Math.PI / 6,
  momentumPreservation: 0.95,
  strafeResponseiveness: 0.8,
  maxVelocity: 45.0,
  velocityDamping: 0.98,
  bounceVelocityRetention: 0.85,
  preSpeedBoost: 1.2,
  jumpWhileSliding: true,
  bunnyHopTolerance: 0.12,
};

export const PLATFORMER_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
  cameraMode: "third-person",
  cameraDistance: -12.0,
  cameraHeight: 3.0,
  colliderOffset: new THREE.Vector3(0, 0, 0),
  maxSpeed: 8.0,
  acceleration: 60.0,
  jumpForce: 18.0,
  cameraSensitivity: 0.0015,
  autoStepMaxHeight: 0.8,
  snapToGroundDistance: 0.5,
  
  // CS-style movement for platformer
  airAcceleration: 45.0,
  airMaxSpeed: 30.0,
  groundFriction: 5.0,
  airFriction: 0.01,
  stopSpeed: 1.0,
  slopeFriction: 1.5,
  slideThreshold: Math.PI / 6,
  momentumPreservation: 0.97,
  strafeResponseiveness: 0.9,
  maxVelocity: 50.0,
  velocityDamping: 0.99,
  bounceVelocityRetention: 0.9,
  preSpeedBoost: 1.4,
  jumpWhileSliding: true,
  bunnyHopTolerance: 0.18,
};

export const CS_SURF_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
  cameraMode: "first-person",
  cameraDistance: 0,
  cameraHeight: 1.7,
  colliderOffset: new THREE.Vector3(0, 0, 0),
  maxSpeed: 12.0,
  acceleration: 60.0,
  jumpForce: 18.0,
  cameraSensitivity: 0.0025,
  snapToGroundDistance: 0.02,
  
  // Optimized for surfing and air strafing
  airAcceleration: 100.0,
  airMaxSpeed: 80.0,
  groundFriction: 4.0,
  airFriction: 0.001,
  stopSpeed: 0.5,
  slopeFriction: 0.5, // Very low for smooth sliding
  slideThreshold: Math.PI / 8, // 22.5 degrees - allows sliding on gentler slopes
  momentumPreservation: 0.99,
  strafeResponseiveness: 2.0, // High for precise air control
  maxVelocity: 120.0,
  velocityDamping: 0.998,
  bounceVelocityRetention: 0.95,
  preSpeedBoost: 1.5,
  jumpWhileSliding: true,
  bunnyHopTolerance: 0.2,
};