import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { PhysicsManager } from "../physics-manager";
import { CharacterControllerConfig } from "./types";
import { CharacterInputState } from "./character-input";
import { CharacterPhysics } from "./character-physics";

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

export class CharacterStateManager {
  private physicsManager: PhysicsManager;
  private character: Entity;
  private config: CharacterControllerConfig;
  private characterPhysics: CharacterPhysics;

  // State
  private state: CharacterState;
  private frameTime: number = 0;
  private lastAnimation: string | undefined;

  constructor(
    physicsManager: PhysicsManager,
    character: Entity,
    config: CharacterControllerConfig,
    characterPhysics: CharacterPhysics
  ) {
    this.physicsManager = physicsManager;
    this.character = character;
    this.config = config;
    this.characterPhysics = characterPhysics;
    
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
  }

  public getState(): Readonly<CharacterState> {
    return { ...this.state };
  }

  public getMutableState(): CharacterState {
    return this.state;
  }

  public updateStateTracking(deltaTime: number): void {
    this.frameTime = deltaTime;
    
    // Update air time
    if (this.state.isGrounded) {
      this.state.airTime = 0;
      this.state.lastGroundedTime = Date.now();
    } else {
      this.state.airTime += deltaTime;
    }
    
    // Update jumping state
    if (this.state.isJumping && this.state.velocity.y <= 0) {
      this.state.isJumping = false;
    }
  }

  public updateCrouchAndSlide(deltaTime: number, inputState: CharacterInputState): { wasCrouching: boolean; wasSliding: boolean } {
    const wasCrouching = this.state.isCrouching;
    const wasSliding = this.state.isSliding;
    
    // Handle crouching
    if (inputState.crouch && !this.state.isSliding) {
      if (!this.state.isCrouching) {
        this.state.isCrouching = true;
        
        // Check if we should start sliding
        if (this.state.isGrounded && this.state.currentSpeed >= this.config.slideMinSpeed) {
          this.state.isSliding = true;
          this.state.slideTimer = this.config.slideDuration;
          this.state.isCrouching = false; // Sliding overrides crouching
        }
      }
    } else {
      this.state.isCrouching = false;
    }
    
    // Handle sliding
    if (this.state.isSliding) {
      this.state.slideTimer -= deltaTime;
      
      if (this.state.slideTimer <= 0 || !this.state.isGrounded) {
        this.state.isSliding = false;
        this.state.slideTimer = 0;
      }
    }
    
    // Return info about state changes
    return { wasCrouching, wasSliding };
  }

  public updateGroundDetection(correctedMovement: THREE.Vector3, deltaTime: number): void {
    const rapierCharacterController = this.characterPhysics.getRapierCharacterController();
    if (!rapierCharacterController) return;

    // Check if grounded
    this.state.isGrounded = rapierCharacterController.computedGrounded();
    
    if (this.state.isGrounded) {
      // Update surface normal if available
      try {
        // Note: Surface normal detection needs to be implemented based on actual Rapier API
        this.state.surfaceNormal.set(0, 1, 0);
      } catch (error) {
        // Surface normal not available or error occurred
        this.state.surfaceNormal.set(0, 1, 0);
      }
    } else {
      // Reset surface normal when not grounded
      this.state.surfaceNormal.set(0, 1, 0);
    }
  }

  public updateCollisionResponse(correctedMovement: THREE.Vector3, deltaTime: number): void {
    // Handle wall collision for sliding
    if (this.state.isSliding) {
      const horizontalMovement = new THREE.Vector3(correctedMovement.x, 0, correctedMovement.z);
      const intendedHorizontalMovement = new THREE.Vector3(
        this.state.velocity.x * deltaTime,
        0,
        this.state.velocity.z * deltaTime
      );
      
      // If the horizontal movement was significantly reduced, we hit a wall
      if (horizontalMovement.length() < intendedHorizontalMovement.length() * 0.5) {
        // Stop sliding when hitting a wall
        this.state.isSliding = false;
        this.state.slideTimer = 0;
      }
    }
  }

  public updateAnimation(): void {
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
    } else if (!this.state.isGrounded && this.state.velocity.y < -2) {
      // Falling
      targetAnimation = this.config.fallAnimation;
    } else if (this.state.isJumping && this.state.velocity.y > 0) {
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

  public updateConfig(newConfig: Partial<CharacterControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 