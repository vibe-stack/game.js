import * as THREE from "three/webgpu";
import { CharacterControllerConfig } from "../character-controller/types";

export class EntityCharacter {
  private entity: { entityId: string };
  private characterControllerConfig: CharacterControllerConfig | null = null;
  private hasCharacterController = false;
  private emitChange: () => void;

  constructor(
    entity: { entityId: string },
    emitChange: () => void
  ) {
    this.entity = entity;
    this.emitChange = emitChange;
  }

  public enableCharacterController(config: Partial<CharacterControllerConfig> = {}): boolean {
    // Set default character controller configuration
    const defaultConfig: CharacterControllerConfig = {
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
      
      // Advanced movement mechanics
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
    };

    this.characterControllerConfig = { ...defaultConfig, ...config };
    this.hasCharacterController = true;
    this.emitChange();
    return true;
  }

  public disableCharacterController(): boolean {
    this.characterControllerConfig = null;
    this.hasCharacterController = false;
    this.emitChange();
    return true;
  }

  public getCharacterControllerConfig(): CharacterControllerConfig | null {
    return this.characterControllerConfig;
  }

  public updateCharacterControllerConfig(newConfig: Partial<CharacterControllerConfig>): boolean {
    if (!this.hasCharacterController || !this.characterControllerConfig) {
      console.warn(`Cannot update character controller config: character controller not enabled on entity ${this.entity.entityId}`);
      return false;
    }

    // Deep merge the new config with existing config
    this.characterControllerConfig = {
      ...this.characterControllerConfig,
      ...newConfig
    };

    // Handle Vector3 properties specially to ensure they're proper Vector3 instances
    if (newConfig.colliderOffset) {
      if (newConfig.colliderOffset instanceof THREE.Vector3) {
        this.characterControllerConfig.colliderOffset = newConfig.colliderOffset.clone();
      } else if (typeof newConfig.colliderOffset === 'object' && 
                 'x' in newConfig.colliderOffset && 
                 'y' in newConfig.colliderOffset && 
                 'z' in newConfig.colliderOffset) {
        this.characterControllerConfig.colliderOffset = new THREE.Vector3(
          newConfig.colliderOffset.x,
          newConfig.colliderOffset.y,
          newConfig.colliderOffset.z
        );
      }
    }

    this.emitChange();
    return true;
  }

  public hasCharacterControllerEnabled(): boolean {
    return this.hasCharacterController;
  }

  public serializeCharacterController() {
    if (!this.hasCharacterController || !this.characterControllerConfig) return undefined;
    
    // Convert THREE.Vector3 to plain object for serialization
    const config = { ...this.characterControllerConfig };
    return {
      ...config,
      colliderOffset: {
        x: this.characterControllerConfig.colliderOffset.x,
        y: this.characterControllerConfig.colliderOffset.y,
        z: this.characterControllerConfig.colliderOffset.z
      }
    };
  }

  public getHasCharacterController(): boolean {
    return this.hasCharacterController;
  }

  public destroy(): void {
    this.disableCharacterController();
  }
} 