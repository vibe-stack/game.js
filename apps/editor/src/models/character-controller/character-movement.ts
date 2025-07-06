import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { PhysicsManager } from "../physics-manager";
import { CharacterControllerConfig } from "./types";
import { CharacterState } from "./character-state";
import { CharacterInputState } from "./character-input";
import { CharacterPhysics } from "./character-physics";

export class CharacterMovement {
  private physicsManager: PhysicsManager;
  private character: Entity;
  private config: CharacterControllerConfig;
  private characterPhysics: CharacterPhysics;

  // Movement state
  private desiredVelocity: THREE.Vector3 = new THREE.Vector3();
  private verticalVelocity: number = 0;
  private currentVelocity: THREE.Vector3 = new THREE.Vector3();
  private currentColliderHalfHeight: number;

  // Jump mechanics
  private jumpBuffer: number = 0;
  private coyoteTime: number = 0;
  private readonly JUMP_BUFFER_TIME = 0.15; // 150ms jump buffer
  private readonly COYOTE_TIME = 0.1; // 100ms coyote time

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
    this.currentColliderHalfHeight = config.capsuleHalfHeight;
  }

  public updateMovement(
    deltaTime: number,
    state: CharacterState,
    inputState: CharacterInputState,
    cameraRotation: { pitch: number; yaw: number }
  ): void {
    // Update jump buffer and coyote time
    this.jumpBuffer = Math.max(0, this.jumpBuffer - deltaTime);
    this.coyoteTime = Math.max(0, this.coyoteTime - deltaTime);

    // Calculate input direction in world space
    const inputDirection = new THREE.Vector3();
    
    if (inputState.forward) inputDirection.z -= 1;
    if (inputState.backward) inputDirection.z += 1;
    if (inputState.left) inputDirection.x -= 1;
    if (inputState.right) inputDirection.x += 1;
    
    // Normalize to prevent diagonal movement from being faster
    if (inputDirection.length() > 0) {
      inputDirection.normalize();
    }

    // Rotate input direction by camera yaw for world-space movement
    const yawQuaternion = new THREE.Quaternion();
    yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
    inputDirection.applyQuaternion(yawQuaternion);

    // Update state
    state.inputDirection.copy(inputDirection);
    state.wishDirection.copy(inputDirection);

    // Apply movement
    if (state.isGrounded) {
      this.updateGroundMovement(deltaTime, state, inputState, inputDirection);
    } else {
      this.updateAirMovement(deltaTime, state, inputState, inputDirection);
    }

    // Apply velocity damping
    this.currentVelocity.multiplyScalar(this.config.velocityDamping);
    
    // Clamp maximum velocity
    const currentSpeed = this.currentVelocity.length();
    if (currentSpeed > this.config.maxVelocity) {
      this.currentVelocity.normalize().multiplyScalar(this.config.maxVelocity);
    }

    // Update state velocity
    state.velocity.copy(this.currentVelocity);
    state.currentSpeed = currentSpeed;
  }

  private updateGroundMovement(
    deltaTime: number,
    state: CharacterState,
    inputState: CharacterInputState,
    wishDirection: THREE.Vector3
  ): void {
    // Calculate movement speed based on state
    let moveSpeed = this.config.maxSpeed;
    
    if (state.isCrouching) {
      moveSpeed *= this.config.crouchSpeedMultiplier;
    } else if (state.isSliding) {
      moveSpeed *= this.config.slideSpeedMultiplier;
    } else if (inputState.sprint) {
      moveSpeed *= this.config.sprintMultiplier;
    }

    // Apply ground friction first
    this.applyGroundFriction(deltaTime, wishDirection);

    // Apply acceleration towards desired direction
    if (wishDirection.length() > 0) {
      const wishVelocity = wishDirection.clone().multiplyScalar(moveSpeed);
      const acceleration = this.config.acceleration;
      
      // Calculate velocity change
      const velocityChange = wishVelocity.clone().sub(this.currentVelocity);
      const accelerationStep = acceleration * deltaTime;
      
      // Limit acceleration to prevent overshooting
      if (velocityChange.length() > accelerationStep) {
        velocityChange.normalize().multiplyScalar(accelerationStep);
      }
      
      this.currentVelocity.add(velocityChange);
    }

    // Update state flags
    state.isMoving = wishDirection.length() > 0.1;
    state.isSprinting = inputState.sprint && state.isMoving;
  }

  private applyGroundFriction(deltaTime: number, wishDirection: THREE.Vector3): void {
    const speed = this.currentVelocity.length();
    if (speed < 0.01) return;

    const friction = this.config.groundFriction;
    const stopSpeed = this.config.stopSpeed;
    
    // Apply friction
    let newSpeed = speed;
    if (speed < stopSpeed) {
      newSpeed = 0;
    } else {
      const frictionAmount = Math.max(stopSpeed, speed * friction * deltaTime);
      newSpeed = Math.max(0, speed - frictionAmount);
    }

    // Only apply friction if not accelerating in the same direction
    if (wishDirection.length() === 0 || this.currentVelocity.clone().normalize().dot(wishDirection) < 0.9) {
      this.currentVelocity.multiplyScalar(newSpeed / speed);
    }
  }

  private updateAirMovement(
    deltaTime: number,
    state: CharacterState,
    inputState: CharacterInputState,
    wishDirection: THREE.Vector3
  ): void {
    // Apply air movement with different acceleration
    this.applyAirAcceleration(deltaTime, wishDirection);
    
    // Apply air friction
    this.applyFriction(this.config.airFriction, deltaTime);

    // Update state flags
    state.isMoving = wishDirection.length() > 0.1;
    state.isSprinting = inputState.sprint && state.isMoving;
  }

  private applyAirAcceleration(deltaTime: number, wishDirection: THREE.Vector3): void {
    if (wishDirection.length() === 0) return;

    const wishSpeed = this.config.airMaxSpeed;
    const wishVelocity = wishDirection.clone().multiplyScalar(wishSpeed);
    
    // Current velocity projected onto wish direction
    const currentSpeedInWishDirection = this.currentVelocity.dot(wishDirection);
    
    // How much speed we can add
    const addSpeed = wishSpeed - currentSpeedInWishDirection;
    if (addSpeed <= 0) return;

    // How much we can accelerate
    const accelerationStep = this.config.airAcceleration * deltaTime;
    const actualAcceleration = Math.min(addSpeed, accelerationStep);

    // Apply acceleration
    const accelerationVector = wishDirection.clone().multiplyScalar(actualAcceleration);
    this.currentVelocity.add(accelerationVector);
  }

  private applyFriction(friction: number, deltaTime: number): void {
    const speed = this.currentVelocity.length();
    if (speed < 0.01) return;

    const frictionAmount = friction * deltaTime;
    const newSpeed = Math.max(0, speed - frictionAmount);
    
    this.currentVelocity.multiplyScalar(newSpeed / speed);
  }

  public jump(): void {
    this.jumpBuffer = this.JUMP_BUFFER_TIME;
  }

  public updateVerticalMovement(deltaTime: number, state: CharacterState): void {
    if (state.isGrounded) {
      this.verticalVelocity = 0;
      this.coyoteTime = this.COYOTE_TIME;
      
      // Handle jump
      if (this.jumpBuffer > 0) {
        this.verticalVelocity = this.config.jumpForce;
        state.isJumping = true;
        state.lastJumpTime = Date.now();
        this.jumpBuffer = 0;
      }
    } else {
      // Apply gravity (negative for downward movement)
      this.verticalVelocity -= this.config.gravityScale * deltaTime;
      
      // Clamp fall speed
      this.verticalVelocity = Math.max(this.config.maxFallSpeed, this.verticalVelocity);
      
      // Coyote time jump
      if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
        this.verticalVelocity = this.config.jumpForce;
        state.isJumping = true;
        state.lastJumpTime = Date.now();
        this.jumpBuffer = 0;
        this.coyoteTime = 0;
      }
    }
  }

  public updateColliderHeight(state: CharacterState): void {
    let targetHeight = this.config.capsuleHalfHeight;
    
    if (state.isCrouching || state.isSliding) {
      targetHeight = this.config.capsuleHalfHeight - this.config.crouchHeightReduction;
    }
    
    // Smoothly adjust collider height
    const heightDiff = targetHeight - this.currentColliderHalfHeight;
    if (Math.abs(heightDiff) > 0.01) {
      this.currentColliderHalfHeight += heightDiff * 0.1; // Smooth transition
      
      // Update the actual collider
      const collider = this.characterPhysics.getCharacterCollider();
      if (collider) {
        try {
          const currentShape = collider.shape;
          if (currentShape.type === 2) { // Capsule shape
            const capsuleShape = currentShape as any;
            const currentRadius = capsuleShape.radius;
            
            // Create new capsule shape with updated height
            const world = this.physicsManager.getWorld();
            const rapier = this.physicsManager.getRapierModule();
            
            if (world && rapier) {
              const newCapsuleShape = new rapier.Capsule(this.currentColliderHalfHeight, currentRadius);
              collider.setShape(newCapsuleShape);
              
              // Adjust position to keep character grounded
              const rigidBody = this.characterPhysics.getCharacterRigidBody();
              if (rigidBody) {
                const currentTranslation = rigidBody.translation();
                const newTranslation = {
                  x: currentTranslation.x,
                  y: currentTranslation.y,
                  z: currentTranslation.z
                };
                rigidBody.setNextKinematicTranslation(newTranslation);
              }
            }
          }
        } catch (error) {
          console.warn("Failed to update collider height:", error);
        }
      }
    }
  }

  public computeColliderMovement(deltaTime: number, state: CharacterState): void {
    const rapierCharacterController = this.characterPhysics.getRapierCharacterController();
    const collider = this.characterPhysics.getCharacterCollider();
    
    if (!rapierCharacterController || !collider) return;

    // Add moving platform velocity and moving body push velocity to the current velocity
    const totalMovementVelocity = this.currentVelocity.clone();

    // Combine horizontal and vertical movement
    const desiredTranslation = new THREE.Vector3(
      totalMovementVelocity.x * deltaTime,
      this.verticalVelocity * deltaTime,
      totalMovementVelocity.z * deltaTime
    );

    // Use Rapier's character controller to compute movement
    try {
      rapierCharacterController.computeColliderMovement(collider, desiredTranslation);
      
      // Get the corrected movement from Rapier
      const correctedMovement = rapierCharacterController.computedMovement();
      
      // Apply the corrected movement to the kinematic body
      const rigidBody = this.characterPhysics.getCharacterRigidBody();
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
        
        // Update state velocity for external systems
        if (deltaTime > 0) {
          state.velocity.set(
            correctedMovement.x / deltaTime,
            correctedMovement.y / deltaTime,
            correctedMovement.z / deltaTime
          );
        }
        
        // Update ground detection and collision response
        this.updateGroundDetectionAndCollision(correctedMovementVec3, deltaTime, state);
      }
    } catch (error) {
      console.error("Error in character controller movement:", error);
    }
  }

  public getCurrentColliderHalfHeight(): number {
    return this.currentColliderHalfHeight;
  }

  private updateGroundDetectionAndCollision(correctedMovement: THREE.Vector3, deltaTime: number, state: CharacterState): void {
    const rapierCharacterController = this.characterPhysics.getRapierCharacterController();
    if (!rapierCharacterController) return;

    // Check if grounded
    state.isGrounded = rapierCharacterController.computedGrounded();
    
    if (state.isGrounded) {
      // Update surface normal if available
      try {
        // Note: Surface normal detection needs to be implemented based on actual Rapier API
        state.surfaceNormal.set(0, 1, 0);
      } catch (error) {
        // Surface normal not available or error occurred
        state.surfaceNormal.set(0, 1, 0);
      }
    } else {
      // Reset surface normal when not grounded
      state.surfaceNormal.set(0, 1, 0);
    }
    
    // Handle wall collision for sliding
    if (state.isSliding) {
      const horizontalMovement = new THREE.Vector3(correctedMovement.x, 0, correctedMovement.z);
      const intendedHorizontalMovement = new THREE.Vector3(
        state.velocity.x * deltaTime,
        0,
        state.velocity.z * deltaTime
      );
      
      // If the horizontal movement was significantly reduced, we hit a wall
      if (horizontalMovement.length() < intendedHorizontalMovement.length() * 0.5) {
        // Stop sliding when hitting a wall
        state.isSliding = false;
        state.slideTimer = 0;
      }
    }
  }

  public updateConfig(newConfig: Partial<CharacterControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 