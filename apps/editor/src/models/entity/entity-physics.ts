import * as THREE from "three/webgpu";
import { PhysicsManager } from "../physics-manager";
import { PhysicsConfig, PhysicsMode, ColliderConfig } from "../types";

export class EntityPhysics {
  private entity: THREE.Object3D;
  private physicsManager: PhysicsManager | null = null;
  private rigidBodyId: string | null = null;
  private colliderId: string | null = null;
  private colliderIds: string[] = []; // Support multiple colliders in advanced mode
  private physicsConfig: PhysicsConfig | null = null;
  
  // Change notification
  private emitChange: () => void;

  constructor(
    entity: THREE.Object3D & { entityId: string; hasCharacterController?: boolean; characterControllerConfig?: any },
    emitChange: () => void
  ) {
    this.entity = entity;
    this.emitChange = emitChange;
  }

  public setPhysicsManager(physicsManager: PhysicsManager): void {
    this.physicsManager = physicsManager;
  }

  public updatePhysicsConfig(config: PhysicsConfig): void {
    if (!this.physicsManager) return;

    // If a rigid body already exists, remove it before creating a new one.
    if (this.rigidBodyId) {
      this.physicsManager.removeRigidBody(this.rigidBodyId);
      this.rigidBodyId = null;
    }
    
    // Remove all existing colliders
    if (this.colliderId) {
      this.physicsManager.removeCollider(this.colliderId);
      this.colliderId = null;
    }
    this.colliderIds.forEach(id => this.physicsManager!.removeCollider(id));
    this.colliderIds = [];

    this.setupPhysics(config);

    if (this.physicsConfig) {
      this.physicsConfig = { ...this.physicsConfig, ...config };
    } else {
      this.physicsConfig = config;
    }

    this.emitChange();
  }

  public enableDynamicPhysics(mass = 1, restitution = 0.5, friction = 0.7): void {
    const config: PhysicsConfig = { 
      type: "dynamic" as const, 
      mass, 
      restitution, 
      friction,
      mode: PhysicsMode.Simple 
    };
    this.updatePhysicsConfig(config);
  }

  public enableStaticPhysics(restitution = 0.5, friction = 0.7): void {
    const config: PhysicsConfig = { 
      type: "static" as const, 
      restitution, 
      friction,
      mode: PhysicsMode.Simple 
    };
    this.updatePhysicsConfig(config);
  }

  public enableKinematicPhysics(): void {
    const config: PhysicsConfig = { 
      type: "kinematic" as const,
      mode: PhysicsMode.Simple 
    };
    this.updatePhysicsConfig(config);
  }

  public enableAdvancedPhysics(config: PhysicsConfig): void {
    const advancedConfig: PhysicsConfig = {
      ...config,
      mode: PhysicsMode.Advanced
    };
    this.updatePhysicsConfig(advancedConfig);
  }

  public disablePhysics(): void {
    if (this.physicsManager) {
      if (this.rigidBodyId) {
        this.physicsManager.removeRigidBody(this.rigidBodyId);
        this.rigidBodyId = null;
      }
      if (this.colliderId) {
        this.physicsManager.removeCollider(this.colliderId);
        this.colliderId = null;
      }
    }
    this.physicsConfig = null;
    this.emitChange();
  }

  public getPhysicsConfig(): PhysicsConfig | null {
    return this.physicsConfig ? this.physicsConfig : null;
  }

  public hasPhysics(): boolean {
    return this.physicsConfig !== null && this.rigidBodyId !== null;
  }

  public updateMass(mass: number): void {
    if (!this.hasPhysics() || !this.physicsConfig || this.physicsConfig.type !== 'dynamic') return;
    
    // Always update the config for UI consistency
    this.physicsConfig.mass = mass;
    
    // Try to update the physics manager if available
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.updateMass(this.rigidBodyId, mass);
    }
    
    // Always emit change to update UI
    this.emitChange();
  }

  public updateRestitution(restitution: number): void {
    if (!this.hasPhysics() || !this.physicsConfig) return;
    
    // Always update the config for UI consistency
    this.physicsConfig.restitution = restitution;
    
    // Try to update the physics manager if available
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.updateRestitution(this.rigidBodyId, restitution);
    }
    
    // Always emit change to update UI
    this.emitChange();
  }

  public updateFriction(friction: number): void {
    if (!this.hasPhysics() || !this.physicsConfig) return;
    
    // Always update the config for UI consistency
    this.physicsConfig.friction = friction;
    
    // Try to update the physics manager if available
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.updateFriction(this.rigidBodyId, friction);
    }
    
    // Always emit change to update UI
    this.emitChange();
  }

  public updatePhysicsType(type: "static" | "dynamic" | "kinematic"): void {
    if (!this.hasPhysics() || !this.physicsConfig) return;
    
    // Always update the config for UI consistency
    this.physicsConfig.type = type;
    // Clear mass for non-dynamic bodies
    if (type !== 'dynamic') {
      delete this.physicsConfig.mass;
    }
    
    // Try to update the physics manager if available
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.updatePhysicsType(this.rigidBodyId, type);
    }
    
    // Always emit change to update UI
    this.emitChange();
  }

  private setupPhysics(config: PhysicsConfig): void {
    if (!this.physicsManager) return;
    this.rigidBodyId = `${(this.entity as any).entityId}_body`;
    
    // Update world matrix to ensure we get correct world transforms
    this.entity.updateMatrixWorld(true);
    
    // Use world position and quaternion for physics bodies
    const worldPosition = new THREE.Vector3();
    this.entity.getWorldPosition(worldPosition);
    
    const worldQuaternion = new THREE.Quaternion();
    this.entity.getWorldQuaternion(worldQuaternion);
    
    // Calculate physics body position with collider offset for character controllers
    const physicsPosition = worldPosition.clone();
    if ((this.entity as any).hasCharacterController && (this.entity as any).characterControllerConfig) {
      physicsPosition.add((this.entity as any).characterControllerConfig.colliderOffset);
    }
    
    const rigidBody = this.physicsManager.createRigidBody(this.rigidBodyId, config, physicsPosition, worldQuaternion);
    if (rigidBody) {
      if (config.mode === PhysicsMode.Advanced && config.colliders) {
        // Advanced mode: create multiple colliders
        this.colliderIds = this.physicsManager.createCollidersFromConfig(
          this.rigidBodyId,
          config.colliders
        );
      } else {
        // Simple mode: create single collider
        this.colliderId = `${(this.entity as any).entityId}_collider`;
        // Note: createCollider method needs to be implemented by specific entity types
      }
    }
  }

  public updatePhysicsTransform(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;

    this.entity.updateMatrixWorld(true);
    
    const worldPosition = new THREE.Vector3();
    this.entity.getWorldPosition(worldPosition);
    
    const worldQuaternion = new THREE.Quaternion();
    this.entity.getWorldQuaternion(worldQuaternion);
    
    // Calculate physics body position with collider offset
    const physicsPosition = worldPosition.clone();
    if ((this.entity as any).hasCharacterController && (this.entity as any).characterControllerConfig) {
      physicsPosition.add((this.entity as any).characterControllerConfig.colliderOffset);
    }
    
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (rigidBody) {
      rigidBody.setTranslation(physicsPosition, true);
      rigidBody.setRotation(worldQuaternion, true);
    }
  }

  public syncVisualsFromPhysics(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;

    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (!rigidBody) return;
    
    const rigidBodyPosition = rigidBody.translation();
    const rigidBodyQuaternion = rigidBody.rotation() as THREE.Quaternion;

    // Calculate visual position by removing collider offset
    const visualPosition = new THREE.Vector3(rigidBodyPosition.x, rigidBodyPosition.y, rigidBodyPosition.z);
    if ((this.entity as any).hasCharacterController && (this.entity as any).characterControllerConfig) {
      visualPosition.sub((this.entity as any).characterControllerConfig.colliderOffset);
    }

    const parent = this.entity.parent;
    if (parent) {
      // Convert world position to local position
      const parentWorldMatrix = new THREE.Matrix4();
      parent.updateMatrixWorld(true);
      parentWorldMatrix.copy(parent.matrixWorld).invert();
      
      visualPosition.applyMatrix4(parentWorldMatrix);
      
      // Convert world quaternion to local quaternion
      const parentWorldQuaternion = new THREE.Quaternion();
      parent.getWorldQuaternion(parentWorldQuaternion);
      parentWorldQuaternion.invert();
      
      const localQuaternion = rigidBodyQuaternion.clone();
      localQuaternion.premultiply(parentWorldQuaternion);
      
      this.entity.position.copy(visualPosition);
      this.entity.quaternion.copy(localQuaternion);
    } else {
      this.entity.position.copy(visualPosition);
      this.entity.quaternion.copy(rigidBodyQuaternion);
    }

    this.emitChange();
  }

  public applyForce(force: THREE.Vector3, point?: THREE.Vector3): void {
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.applyForce(this.rigidBodyId, force, point);
    }
  }

  public applyImpulse(impulse: THREE.Vector3, point?: THREE.Vector3): void {
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.applyImpulse(this.rigidBodyId, impulse, point);
    }
  }

  public setVelocity(velocity: THREE.Vector3): void {
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.setVelocity(this.rigidBodyId, velocity);
    }
  }

  public getVelocity(): THREE.Vector3 | null {
    if (this.physicsManager && this.rigidBodyId) {
      return this.physicsManager.getVelocity(this.rigidBodyId);
    }
    return null;
  }

  public getRigidBodyId(): string | null {
    return this.rigidBodyId;
  }

  public getColliderId(): string | null {
    return this.colliderId;
  }

  public getColliderIds(): string[] {
    if (this.physicsConfig?.mode === PhysicsMode.Advanced) {
      return [...this.colliderIds];
    } else if (this.colliderId) {
      return [this.colliderId];
    }
    return [];
  }

  // Getters for physics properties
  public get physicsType(): string | undefined {
    return this.physicsConfig?.type;
  }

  public get physicsMass(): number | undefined {
    return this.physicsConfig?.mass;
  }

  public get physicsRestitution(): number | undefined {
    return this.physicsConfig?.restitution;
  }

  public get physicsFriction(): number | undefined {
    return this.physicsConfig?.friction;
  }

  // Advanced physics methods
  public addCollider(colliderConfig: ColliderConfig): string | null {
    if (!this.physicsConfig || this.physicsConfig.mode !== PhysicsMode.Advanced) {
      console.warn("Cannot add collider: entity is not in advanced physics mode");
      return null;
    }
    
    if (!this.physicsManager || !this.rigidBodyId) return null;
    
    const colliderId = `${(this.entity as any).entityId}_collider_${this.colliderIds.length}`;
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (!rigidBody) return null;
    
    const collider = this.physicsManager.createColliderFromShape(
      colliderId,
      rigidBody,
      colliderConfig.shape,
      colliderConfig
    );
    
    if (collider) {
      this.colliderIds.push(colliderId);
      
      // Update physics config
      if (!this.physicsConfig.colliders) {
        this.physicsConfig.colliders = [];
      }
      this.physicsConfig.colliders.push(colliderConfig);
      
      this.emitChange();
      return colliderId;
    }
    
    return null;
  }

  public removeColliderById(colliderId: string): boolean {
    if (!this.physicsManager) return false;
    
    const index = this.colliderIds.indexOf(colliderId);
    if (index === -1) return false;
    
    if (this.physicsManager.removeCollider(colliderId)) {
      this.colliderIds.splice(index, 1);
      
      // Update physics config
      if (this.physicsConfig?.colliders) {
        this.physicsConfig.colliders.splice(index, 1);
      }
      
      this.emitChange();
      return true;
    }
    
    return false;
  }

  public updateAdvancedPhysicsProperty(property: string, value: any): void {
    if (!this.hasPhysics() || !this.physicsConfig || this.physicsConfig.mode !== PhysicsMode.Advanced) return;
    
    // Update the config
    (this.physicsConfig as any)[property] = value;
    
    // Apply specific updates based on property
    if (this.physicsManager && this.rigidBodyId) {
      const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
      if (rigidBody) {
        switch (property) {
          case 'linearDamping':
            rigidBody.setLinearDamping(value);
            break;
          case 'angularDamping':
            rigidBody.setAngularDamping(value);
            break;
          case 'gravityScale':
            rigidBody.setGravityScale(value, true);
            break;
          case 'lockTranslationX':
          case 'lockTranslationY':
          case 'lockTranslationZ':
            const locks = {
              x: this.physicsConfig.lockTranslationX || false,
              y: this.physicsConfig.lockTranslationY || false,
              z: this.physicsConfig.lockTranslationZ || false,
            };
            rigidBody.setEnabledTranslations(!locks.x, !locks.y, !locks.z, true);
            break;
          case 'lockRotationX':
          case 'lockRotationY':
          case 'lockRotationZ':
            const rotLocks = {
              x: this.physicsConfig.lockRotationX || false,
              y: this.physicsConfig.lockRotationY || false,
              z: this.physicsConfig.lockRotationZ || false,
            };
            rigidBody.setEnabledRotations(!rotLocks.x, !rotLocks.y, !rotLocks.z, true);
            break;
        }
      }
    }
    
    this.emitChange();
  }

  public updateColliderConfig(colliderIndex: number, newColliderConfig: ColliderConfig): void {
    if (!this.hasPhysics() || !this.physicsConfig || this.physicsConfig.mode !== PhysicsMode.Advanced) return;
    if (!this.physicsConfig.colliders || colliderIndex >= this.physicsConfig.colliders.length) return;
    
    // Update the collider config
    const updatedColliders = [...this.physicsConfig.colliders];
    updatedColliders[colliderIndex] = { ...newColliderConfig };
    
    // Update the physics config without recreating bodies
    this.physicsConfig = {
      ...this.physicsConfig,
      colliders: updatedColliders
    };
    
    // For now, we'll need to recreate the specific collider if it exists
    if (this.physicsManager && this.colliderIds[colliderIndex]) {
      const colliderId = this.colliderIds[colliderIndex];
      const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId!);
      
      if (rigidBody) {
        // Remove the old collider
        this.physicsManager.removeCollider(colliderId);
        
        // Create new collider with updated config
        const newCollider = this.physicsManager.createColliderFromShape(
          colliderId,
          rigidBody,
          newColliderConfig.shape,
          newColliderConfig
        );
        
        if (!newCollider) {
          console.warn('Failed to recreate collider:', colliderId);
        }
      }
    }
    
    this.emitChange();
  }

  public destroy(): void {
    if (this.physicsManager) {
      if (this.rigidBodyId) {
        this.physicsManager.removeRigidBody(this.rigidBodyId);
        this.rigidBodyId = null;
      }
      if (this.colliderId) {
        this.physicsManager.removeCollider(this.colliderId);
        this.colliderId = null;
      }
      this.colliderIds.forEach(id => this.physicsManager!.removeCollider(id));
      this.colliderIds = [];
    }
    this.physicsConfig = null;
  }
} 