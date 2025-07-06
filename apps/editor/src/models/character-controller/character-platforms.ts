import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { PhysicsManager } from "../physics-manager";
import { CharacterControllerConfig } from "./types";
import { CharacterState } from "./character-state";
import { CharacterPhysics } from "./character-physics";

export class CharacterPlatforms {
  private physicsManager: PhysicsManager;
  private character: Entity;
  private config: CharacterControllerConfig;
  private characterPhysics: CharacterPhysics;

  // Moving platform tracking
  private movingPlatformVelocity: THREE.Vector3 = new THREE.Vector3();
  private lastMovingPlatformId: string | null = null;
  private movingBodyPushVelocity: THREE.Vector3 = new THREE.Vector3();

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
  }

  public detectMovingPlatform(state: CharacterState): void {
    if (!this.config.enableMovingPlatforms) return;

    const rapierCharacterController = this.characterPhysics.getRapierCharacterController();
    if (!rapierCharacterController) return;

    // Reset moving platform velocity
    this.movingPlatformVelocity.set(0, 0, 0);

    if (state.isGrounded) {
      try {
        // Note: Using simplified detection for moving platforms
        // The actual implementation would need to be adapted based on the available Rapier API
        console.warn("Moving platform detection not yet implemented");
      } catch (error) {
        console.warn("Error detecting moving platform:", error);
      }
    } else {
      this.lastMovingPlatformId = null;
    }
  }

  public detectMovingBodyCollisions(deltaTime: number, state: CharacterState): void {
    if (!this.config.enableMovingBodyPush) return;

    // Reset moving body push velocity
    this.movingBodyPushVelocity.set(0, 0, 0);

    const rapierCharacterController = this.characterPhysics.getRapierCharacterController();
    if (!rapierCharacterController) return;

    try {
      // Note: Using simplified detection for moving body collisions
      // The actual implementation would need to be adapted based on the available Rapier API
      console.warn("Moving body collision detection not yet implemented");
    } catch (error) {
      console.warn("Error detecting moving body collisions:", error);
    }
  }

  private processMovingBodyCollision(colliderHandle: any, normal: any, deltaTime: number): void {
    // Note: This method needs to be implemented based on the actual PhysicsManager API
    console.warn("Moving body collision processing not yet implemented");
  }

  public queryWorldCollisions(deltaTime: number, state: CharacterState): void {
    const world = this.physicsManager.getWorld();
    const rapier = this.physicsManager.getRapierModule();
    
    if (!world || !rapier) return;

    const characterCollider = this.characterPhysics.getCharacterCollider();
    if (!characterCollider) return;

    // Query for nearby colliders
    const characterPosition = this.character.position;
    const queryRadius = 2.0; // 2 meter radius

    // Note: World collision queries need to be implemented based on the actual PhysicsManager API
    console.warn("World collision queries not yet implemented");
  }

  public getMovingPlatformVelocity(): THREE.Vector3 {
    return this.movingPlatformVelocity.clone();
  }

  public getMovingBodyPushVelocity(): THREE.Vector3 {
    return this.movingBodyPushVelocity.clone();
  }

  public updateConfig(newConfig: Partial<CharacterControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 