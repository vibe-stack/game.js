import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { CameraManager } from "../camera-manager";
import { PhysicsManager } from "../physics-manager";
import { InputManager } from "../input-manager";
import { CharacterControllerConfig } from "./types";
import { CharacterPhysics } from "./character-physics";
import { CharacterInput } from "./character-input";
import { CharacterCamera } from "./character-camera";
import { CharacterMovement } from "./character-movement";
import { CharacterStateManager, CharacterState } from "./character-state";
import { CharacterPlatforms } from "./character-platforms";

export * from "./types";
export * from "./defaults";
export * from "./character-state";

export class CharacterController {
  private config: CharacterControllerConfig;
  private character: Entity;
  private cameraId: string;
  private enabled: boolean = true;
  
  // Module instances
  private characterPhysics: CharacterPhysics;
  private characterInput: CharacterInput;
  private characterCamera: CharacterCamera;
  private characterMovement: CharacterMovement;
  private characterState: CharacterStateManager;
  private characterPlatforms: CharacterPlatforms;
  
  constructor(
    character: Entity,
    cameraManager: CameraManager,
    physicsManager: PhysicsManager,
    inputManager: InputManager,
    config: Partial<CharacterControllerConfig> = {}
  ) {
    this.character = character;
    
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
    
    // Generate unique camera ID for this controller instance
    this.cameraId = `character-camera-${character.entityId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize modules
    this.characterPhysics = new CharacterPhysics(character, physicsManager, this.config);
    this.characterInput = new CharacterInput(inputManager, cameraManager, this.config, this.cameraId);
    this.characterCamera = new CharacterCamera(cameraManager, physicsManager, character, this.config, this.cameraId);
    this.characterMovement = new CharacterMovement(physicsManager, character, this.config, this.characterPhysics);
    this.characterState = new CharacterStateManager(physicsManager, character, this.config, this.characterPhysics);
    this.characterPlatforms = new CharacterPlatforms(physicsManager, character, this.config, this.characterPhysics);
    
    // Initialize all modules
    this.characterPhysics.initialize();
    this.characterCamera.initialize();
    
    // Set input system as active
    this.characterInput.setActive(true);
  }

  public jump(): void {
    this.characterMovement.jump();
  }

  public update(deltaTime: number): void {
    if (!this.isActive()) return;

    const state = this.characterState.getMutableState();
    
    // Update input
    this.characterInput.updateInputState();
    const inputState = this.characterInput.getInputState();
    const previousInputState = this.characterInput.getPreviousInputState();
    const cameraRotation = this.characterInput.getCameraRotation();
    
    // Handle jump input (detect jump key press edge)
    if (inputState.jump && !previousInputState.jump) {
      this.characterMovement.jump();
    }
    
    // Update state tracking
    this.characterState.updateStateTracking(deltaTime);
    
    // Update crouch and slide
    const { wasCrouching, wasSliding } = this.characterState.updateCrouchAndSlide(deltaTime, inputState);
    
    // Update camera rotation
    this.characterCamera.updateCameraRotation(cameraRotation);
    this.characterCamera.updateMouseVelocity(deltaTime, this.characterInput.getLastMouseMovement());
    
    // Update collider height based on crouch/slide state
    this.characterMovement.updateColliderHeight(state);
    const currentColliderHalfHeight = this.characterMovement.getCurrentColliderHalfHeight();
    
    // Update camera height
    this.characterCamera.updateCameraHeight(wasCrouching, wasSliding, currentColliderHalfHeight);
    
    // Update vertical movement (gravity and jumping)
    this.characterMovement.updateVerticalMovement(deltaTime, state);
    
    // Update movement
    this.characterMovement.updateMovement(deltaTime, state, inputState, cameraRotation);
    
    // Detect platforms and moving bodies
    this.characterPlatforms.detectMovingPlatform(state);
    this.characterPlatforms.detectMovingBodyCollisions(deltaTime, state);
    this.characterPlatforms.queryWorldCollisions(deltaTime, state);
    
    // Compute final movement with physics
    this.characterMovement.computeColliderMovement(deltaTime, state);
    
    // Update animation based on current state
    this.characterState.updateAnimation();
    
    // Make sure entity syncs with physics
    this.character.syncVisualsFromPhysics();
  }
  
  public activateCamera(): void {
    this.characterCamera.activateCamera();
    this.enabled = true;
    this.characterInput.setActive(true);
  }
  
  public deactivate(): void {
    this.enabled = false;
    this.characterInput.setActive(false);
    // Exit pointer lock if active
    if (this.characterInput.isPointerLocked() && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
  
  public isActive(): boolean {
    return this.enabled && this.characterCamera.isActive();
  }
  
  public getState(): Readonly<CharacterState> {
    return this.characterState.getState();
  }
  
  public getConfig(): Readonly<CharacterControllerConfig> {
    return { ...this.config };
  }
  
  public updateConfig(newConfig: Partial<CharacterControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update all modules with new config
    this.characterPhysics.updateConfig(newConfig);
    this.characterInput.updateConfig(newConfig);
    this.characterCamera.updateConfig(newConfig);
    this.characterMovement.updateConfig(newConfig);
    this.characterState.updateConfig(newConfig);
    this.characterPlatforms.updateConfig(newConfig);
  }
  
  public getCameraRotation(): { pitch: number; yaw: number } {
    return this.characterInput.getCameraRotation();
  }
  
  public getCameraId(): string {
    return this.cameraId;
  }
  
  public dispose(): void {
    // Dispose all modules
    this.characterPhysics.dispose();
    this.characterInput.dispose();
    this.characterCamera.dispose();
  }
}
