import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { CameraManager, type CameraFollowConfig } from "../camera-manager";
import { PhysicsManager } from "../physics-manager";
import { CharacterControllerConfig } from "./types";

export class CharacterCamera {
  private cameraManager: CameraManager;
  private physicsManager: PhysicsManager;
  private character: Entity;
  private config: CharacterControllerConfig;
  private cameraId: string;
  private enabled: boolean = true;
  
  // Camera collision
  private mouseVelocity: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    cameraManager: CameraManager,
    physicsManager: PhysicsManager,
    character: Entity,
    config: CharacterControllerConfig,
    cameraId: string
  ) {
    this.cameraManager = cameraManager;
    this.physicsManager = physicsManager;
    this.character = character;
    this.config = config;
    this.cameraId = cameraId;
  }

  public initialize(): void {
    this.setupCamera();
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

  public updateCameraRotation(cameraRotation: { pitch: number; yaw: number }): void {
    const camera = this.cameraManager.getCamera(this.cameraId);
    if (!camera) {
      return;
    }

    if (this.config.cameraMode === 'first-person') {
      // For FPS mode, apply rotation directly to the camera
      camera.rotation.order = 'YXZ';
      camera.rotation.y = cameraRotation.yaw;
      camera.rotation.x = cameraRotation.pitch;

      // Update the camera follow offset for first-person (camera at character eye level)
      const followConfig = this.cameraManager.getCameraFollow(this.cameraId);
      if (followConfig) {
        followConfig.offset = new THREE.Vector3(0, this.config.cameraHeight, 0);
        this.cameraManager.setCameraFollow(this.cameraId, followConfig);
      }

      // Also rotate the character body to match camera yaw for movement direction
      // Only if movement rotation is disabled
      if (!this.config.enableMovementRotation) {
        this.character.setRotation(0, cameraRotation.yaw, 0);
      }
    } else {
      // For third-person, apply rotation to the camera follow offset
      const followConfig = this.cameraManager.getCameraFollow(this.cameraId);
      if (followConfig) {
        // Calculate the camera position relative to the character
        const distance = Math.abs(this.config.cameraDistance);
        
        // Calculate spherical coordinates for proper pitch and yaw
        const horizontalDistance = distance * Math.cos(cameraRotation.pitch);
        const verticalDistance = distance * Math.sin(cameraRotation.pitch);
        
        const offset = new THREE.Vector3(
          Math.sin(cameraRotation.yaw) * horizontalDistance,
          this.config.cameraHeight + verticalDistance,
          Math.cos(cameraRotation.yaw) * horizontalDistance
        );
        
        followConfig.offset = offset;
        this.cameraManager.setCameraFollow(this.cameraId, followConfig);
        
        // Make camera look at character (with height offset)
        this.updateThirdPersonCameraLookAt();
        
        // Update camera collision for third-person
        this.updateThirdPersonCameraCollision(followConfig);
        
        // Make player face away from camera
        this.updatePlayerRotation(cameraRotation.yaw);
      }
    }
  }

  private updateThirdPersonCameraLookAt(): void {
    const camera = this.cameraManager.getCamera(this.cameraId);
    if (!camera) return;

    // Always look at the character with a height offset
    const lookAtTarget = this.character.position.clone();
    lookAtTarget.y += this.config.cameraHeight * 0.7; // Look at character's upper body/head
    camera.lookAt(lookAtTarget);
  }

  private updatePlayerRotation(cameraYaw: number): void {
    // Only update player rotation if movement rotation is disabled
    // If movement rotation is enabled, the character controller will handle rotation
    if (!this.config.enableMovementRotation) {
      // Make player face away from camera in third-person mode
      // The player should face the opposite direction of the camera
      const playerYaw = cameraYaw + Math.PI; // Add 180 degrees to face away from camera
      this.character.setRotation(0, playerYaw, 0);
    }
  }

  public updateMouseVelocity(deltaTime: number, lastMouseMovement: { x: number; y: number }): void {
    // Update mouse velocity for smooth camera movement
    this.mouseVelocity.x = lastMouseMovement.x / (deltaTime * 1000);
    this.mouseVelocity.y = lastMouseMovement.y / (deltaTime * 1000);
  }

  public updateCameraHeight(wasCrouching: boolean, wasSliding: boolean, currentColliderHalfHeight: number): void {
    // Update camera height based on current collider height
    const newCameraHeight = currentColliderHalfHeight + 0.8; // Eye level is usually 0.8 above collider center
    
    if (this.config.cameraMode === "first-person") {
      const followConfig = this.cameraManager.getCameraFollow(this.cameraId);
      if (followConfig && followConfig.offset) {
        // Smoothly adjust camera height for first-person
        const heightDiff = newCameraHeight - followConfig.offset.y;
        if (Math.abs(heightDiff) > 0.01) {
          followConfig.offset.y += heightDiff * 0.1; // Smooth transition
          this.cameraManager.setCameraFollow(this.cameraId, followConfig);
        }
      }
    } else {
      // For third-person, DON'T override the offset.y if it was set by pitch calculations
      // Only update the base camera height, but preserve any pitch-based adjustments
      const followConfig = this.cameraManager.getCameraFollow(this.cameraId);
      if (followConfig && followConfig.offset) {
        // Store the difference between current offset.y and base camera height
        const currentVerticalOffset = followConfig.offset.y - this.config.cameraHeight;
        
        // Update config camera height
        this.config.cameraHeight = newCameraHeight;
        
        // Preserve the pitch-based vertical offset by adding it to the new base height
        // This way the spherical coordinate calculation from updateCameraRotation is preserved
        // Note: We don't directly modify followConfig.offset.y here as it should be handled by updateCameraRotation
      }
    }
  }

  private updateThirdPersonCameraCollision(followConfig: CameraFollowConfig): void {
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

  private getCharacterCollider(): any {
    const colliderId = this.character["colliderId"];
    if (colliderId && this.physicsManager) {
      return this.physicsManager.getCollider(colliderId);
    }
    return undefined;
  }

  public activateCamera(): void {
    const success = this.cameraManager.setActiveCamera(this.cameraId);
    if (success) {
      this.enabled = true;
    }
  }

  public deactivate(): void {
    this.enabled = false;
    // Remove this camera from the camera manager if it's currently active
    // This will automatically switch to another camera or clear the active camera
    if (this.cameraManager.getActiveCameraId() === this.cameraId) {
      this.cameraManager.removeCamera(this.cameraId);
    }
  }

  public isActive(): boolean {
    return this.enabled && this.cameraManager.getActiveCameraId() === this.cameraId;
  }

  public updateConfig(newConfig: Partial<CharacterControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public dispose(): void {
    // Remove the camera from camera manager if it still exists
    try {
      // Only remove if the camera still exists in the manager
      if (this.cameraManager.getCamera(this.cameraId)) {
        this.cameraManager.removeCamera(this.cameraId);
      }
    } catch (error) {
      console.warn(`Failed to remove camera ${this.cameraId}:`, error);
    }
  }
} 