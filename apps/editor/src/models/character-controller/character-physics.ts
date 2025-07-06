import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { PhysicsManager } from "../physics-manager";
import type RapierType from "@dimforge/rapier3d-compat";
import { CharacterControllerConfig } from "./types";

export class CharacterPhysics {
  private physicsManager: PhysicsManager;
  private character: Entity;
  private config: CharacterControllerConfig;
  private rapierCharacterController: RapierType.KinematicCharacterController | null = null;

  constructor(
    character: Entity,
    physicsManager: PhysicsManager,
    config: CharacterControllerConfig
  ) {
    this.character = character;
    this.physicsManager = physicsManager;
    this.config = config;
  }

  public initialize(): void {
    this.setupCharacterPhysics();
    this.setupRapierCharacterController();
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

  public getCharacterRigidBody(): RapierType.RigidBody | undefined {
    const rigidBodyId = this.character["rigidBodyId"];
    if (rigidBodyId && this.physicsManager) {
      return this.physicsManager.getRigidBody(rigidBodyId);
    }
    return undefined;
  }

  public getCharacterCollider(): RapierType.Collider | undefined {
    const colliderId = this.character["colliderId"];
    if (colliderId && this.physicsManager) {
      return this.physicsManager.getCollider(colliderId);
    }
    return undefined;
  }

  public getRapierCharacterController(): RapierType.KinematicCharacterController | null {
    return this.rapierCharacterController;
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
  }
} 