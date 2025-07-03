import * as THREE from "three/webgpu";
import { PhysicsManager } from "./physics-manager";
import { EntityConfig, TweenConfig, InteractionCallbacks, EntityMetadata, EntityType, PhysicsConfig, PhysicsMode, ColliderConfig, ColliderShape } from "./types";
import { EntityData } from "./scene-loader";
import { CharacterControllerConfig } from "./character-controller";
import type { ScriptManager } from "./script-manager";

export abstract class Entity extends THREE.Object3D {
  public readonly entityId: string;
  public readonly entityName: string;
  public readonly metadata: EntityMetadata;

  protected physicsManager: PhysicsManager | null = null;
  protected rigidBodyId: string | null = null;
  protected colliderId: string | null = null;
  protected colliderIds: string[] = []; // Support multiple colliders in advanced mode
  public physicsConfig: PhysicsConfig | null = null;
  private tweens: TweenConfig[] = [];
  private interactionCallbacks: InteractionCallbacks = {};
  private destroyed = false;
  private debugRenderEnabled = false;
  
  // Script system
  private scriptManager: ScriptManager | null = null;
  private attachedScripts: string[] = [];
  
  // Character controller support
  public characterControllerConfig: CharacterControllerConfig | null = null;
  public hasCharacterController = false;
  
  // Event system for React synchronization
  private changeListeners: Set<() => void> = new Set();

  constructor(config: EntityConfig = {}) {
    super();

    this.entityId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.entityName = config.name || this.entityId;

    this.metadata = {
      type: "entity" as EntityType,
      created: Date.now(),
      updated: Date.now(),
      tags: [],
      layer: 0,
    };

    if (config.position) this.position.copy(config.position);
    if (config.rotation) this.rotation.copy(config.rotation);
    if (config.scale) this.scale.copy(config.scale);
    
    // Store initial physics config if provided
    if (config.physics) {
      this.physicsConfig = { ...config.physics };
    }
  }

  /**
   * Properties that require geometry rebuilding when changed.
   * Override this in subclasses to define which properties need rebuilding.
   */
  protected getGeometryRebuildProperties(): string[] {
    return [];
  }

  /**
   * Rebuild the geometry of this entity.
   * Override this in subclasses that have rebuildable geometry.
   */
  protected rebuildGeometry(): void {
    // Default implementation does nothing
    // Subclasses should override this to handle their specific geometry rebuilding
  }

  /**
   * Generic method to update a property that may require geometry rebuilding.
   * This handles the disposal, recreation, and change notification automatically.
   */
  protected updateGeometryProperty<T>(propertyName: string, newValue: T, updateFn: (value: T) => void): boolean {
    const rebuildProperties = this.getGeometryRebuildProperties();
    const requiresRebuild = rebuildProperties.includes(propertyName);
    
    try {
      if (requiresRebuild) {
        // Call the update function (which should modify internal state)
        updateFn(newValue);
        
        // Rebuild geometry
        this.rebuildGeometry();
        
        // Recreate physics collider if it exists
        if (this.physicsManager && this.rigidBodyId && this.colliderId) {
          this.physicsManager.removeCollider(this.colliderId);
          this.createCollider({}); // Recreate with updated geometry
        }
      } else {
        // Just update the property normally
        updateFn(newValue);
      }
      
      // Emit change for React synchronization
      this.emitChange();
      return true;
    } catch (error) {
      console.error(`Failed to update property ${propertyName}:`, error);
      return false;
    }
  }

  /**
   * Convenience method to update multiple geometry properties at once.
   * This is more efficient than updating them individually as it only rebuilds once.
   */
  protected updateGeometryProperties(updates: Record<string, any>): boolean {
    const rebuildProperties = this.getGeometryRebuildProperties();
    const requiresRebuild = Object.keys(updates).some(key => rebuildProperties.includes(key));
    
    try {
      // Apply all updates first
      Object.entries(updates).forEach(([key, value]) => {
        // This assumes a direct property assignment, but could be customized
        (this as any)[key] = value;
      });
      
      if (requiresRebuild) {
        // Rebuild geometry once after all updates
        this.rebuildGeometry();
        
        // Recreate physics collider if it exists
        if (this.physicsManager && this.rigidBodyId && this.colliderId) {
          this.physicsManager.removeCollider(this.colliderId);
          this.createCollider({}); // Recreate with updated geometry
        }
      }
      
      // Emit change for React synchronization
      this.emitChange();
      return true;
    } catch (error) {
      console.error(`Failed to update properties:`, error);
      return false;
    }
  }

  abstract serialize(): EntityData;

  /**
   * Helper method to serialize physics properties that all entities can use
   */
  protected serializePhysics() {
    if (!this.physicsConfig) return undefined;
    
    const baseConfig = {
      enabled: true,
      type: this.physicsConfig.type || "static",
      mode: this.physicsConfig.mode,
      mass: this.physicsConfig.mass,
      restitution: this.physicsConfig.restitution,
      friction: this.physicsConfig.friction
    };
    
    // Add advanced physics properties if in advanced mode
    if (this.physicsConfig.mode === PhysicsMode.Advanced) {
      return {
        ...baseConfig,
        colliders: this.physicsConfig.colliders?.map(collider => ({
          ...collider,
          // Serialize Vector3 objects
          offset: collider.offset ? {
            x: collider.offset.x,
            y: collider.offset.y,
            z: collider.offset.z
          } : undefined,
          rotation: collider.rotation ? {
            x: collider.rotation.x,
            y: collider.rotation.y,
            z: collider.rotation.z,
            w: collider.rotation.w
          } : undefined,
          // Serialize shape-specific Vector3s
          shape: this.serializeColliderShape(collider.shape)
        })),
        linearDamping: this.physicsConfig.linearDamping,
        angularDamping: this.physicsConfig.angularDamping,
        gravityScale: this.physicsConfig.gravityScale,
        canSleep: this.physicsConfig.canSleep,
        ccd: this.physicsConfig.ccd,
        dominanceGroup: this.physicsConfig.dominanceGroup,
        additionalSolverIterations: this.physicsConfig.additionalSolverIterations,
        lockTranslationX: this.physicsConfig.lockTranslationX,
        lockTranslationY: this.physicsConfig.lockTranslationY,
        lockTranslationZ: this.physicsConfig.lockTranslationZ,
        lockRotationX: this.physicsConfig.lockRotationX,
        lockRotationY: this.physicsConfig.lockRotationY,
        lockRotationZ: this.physicsConfig.lockRotationZ,
        linearVelocity: this.physicsConfig.linearVelocity ? {
          x: this.physicsConfig.linearVelocity.x,
          y: this.physicsConfig.linearVelocity.y,
          z: this.physicsConfig.linearVelocity.z
        } : undefined,
        angularVelocity: this.physicsConfig.angularVelocity ? {
          x: this.physicsConfig.angularVelocity.x,
          y: this.physicsConfig.angularVelocity.y,
          z: this.physicsConfig.angularVelocity.z
        } : undefined
      };
    }
    
    return baseConfig;
  }
  
  private serializeColliderShape(shape: any): any {
    const baseShape = { type: shape.type };
    
    switch (shape.type) {
      case "ball":
        return { ...baseShape, radius: shape.radius };
      case "cuboid":
        return { 
          ...baseShape, 
          halfExtents: { 
            x: shape.halfExtents.x, 
            y: shape.halfExtents.y, 
            z: shape.halfExtents.z 
          }
        };
      case "capsule":
      case "cylinder":
      case "cone":
        return { 
          ...baseShape, 
          halfHeight: shape.halfHeight, 
          radius: shape.radius 
        };
      case "heightfield":
        return {
          ...baseShape,
          heights: shape.heights,
          scale: {
            x: shape.scale.x,
            y: shape.scale.y,
            z: shape.scale.z
          }
        };
      case "compound":
        return {
          ...baseShape,
          shapes: shape.shapes.map((subShape: any) => ({
            shape: this.serializeColliderShape(subShape.shape),
            position: subShape.position ? {
              x: subShape.position.x,
              y: subShape.position.y,
              z: subShape.position.z
            } : undefined,
            rotation: subShape.rotation ? {
              x: subShape.rotation.x,
              y: subShape.rotation.y,
              z: subShape.rotation.z,
              w: subShape.rotation.w
            } : undefined
          }))
        };
      default:
        return shape;
    }
  }

  dispatchEvent(event: any): void {
    if (event && event.type) this.handleInteraction(event.type, event);
    super.dispatchEvent(event);
  }

  setPhysicsManager(physicsManager: PhysicsManager): this {
    this.physicsManager = physicsManager;
    return this;
  }

  setScriptManager(scriptManager: ScriptManager): this {
    this.scriptManager = scriptManager;
    return this;
  }

  updatePhysicsConfig(config: PhysicsConfig): this {
    if (!this.physicsManager) return this;

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
    return this;
  }

  enableDynamicPhysics(mass = 1, restitution = 0.5, friction = 0.7): this {
    const config: PhysicsConfig = { 
      type: "dynamic" as const, 
      mass, 
      restitution, 
      friction,
      mode: PhysicsMode.Simple 
    };
    this.updatePhysicsConfig(config);
    return this;
  }

  enableStaticPhysics(restitution = 0.5, friction = 0.7): this {
    const config: PhysicsConfig = { 
      type: "static" as const, 
      restitution, 
      friction,
      mode: PhysicsMode.Simple 
    };
    this.updatePhysicsConfig(config);
    return this;
  }

  enableKinematicPhysics(): this {
    const config: PhysicsConfig = { 
      type: "kinematic" as const,
      mode: PhysicsMode.Simple 
    };
    this.updatePhysicsConfig(config);
    return this;
  }

  // New method for advanced physics
  enableAdvancedPhysics(config: PhysicsConfig): this {
    const advancedConfig: PhysicsConfig = {
      ...config,
      mode: PhysicsMode.Advanced
    };
    this.updatePhysicsConfig(advancedConfig);
    return this;
  }

  disablePhysics(): this {
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
    return this;
  }

  getPhysicsConfig(): PhysicsConfig | null {
    return this.physicsConfig ? this.physicsConfig : null;
  }

  hasPhysics(): boolean {
    return this.physicsConfig !== null && this.rigidBodyId !== null;
  }

  // New methods to update individual physics properties without recreating bodies
  updateMass(mass: number): this {
    if (!this.hasPhysics() || !this.physicsConfig || this.physicsConfig.type !== 'dynamic') return this;
    
    // Always update the config for UI consistency
    this.physicsConfig.mass = mass;
    
    // Try to update the physics manager if available
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.updateMass(this.rigidBodyId, mass);
    }
    
    // Always emit change to update UI
    this.emitChange();

    return this;
  }

  updateRestitution(restitution: number): this {
    if (!this.hasPhysics() || !this.physicsConfig) return this;
    
    // Always update the config for UI consistency
    this.physicsConfig.restitution = restitution;
    
    // Try to update the physics manager if available
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.updateRestitution(this.rigidBodyId, restitution);
    }
    
    // Always emit change to update UI
    this.emitChange();
    return this;
  }

  updateFriction(friction: number): this {
    if (!this.hasPhysics() || !this.physicsConfig) return this;
    
    // Always update the config for UI consistency
    this.physicsConfig.friction = friction;
    
    // Try to update the physics manager if available
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.updateFriction(this.rigidBodyId, friction);
    }
    
    // Always emit change to update UI
    this.emitChange();
    return this;
  }

  updatePhysicsType(type: "static" | "dynamic" | "kinematic"): this {
    if (!this.hasPhysics() || !this.physicsConfig) return this;
    
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
    return this;
  }

  private setupPhysics(config: PhysicsConfig): void {
    if (!this.physicsManager) return;
    this.rigidBodyId = `${this.entityId}_body`;
    
    // Update world matrix to ensure we get correct world transforms
    this.updateMatrixWorld(true);
    
    // Use world position and quaternion for physics bodies
    const worldPosition = new THREE.Vector3();
    this.getWorldPosition(worldPosition);
    
    const worldQuaternion = new THREE.Quaternion();
    this.getWorldQuaternion(worldQuaternion);
    
    // Calculate physics body position with collider offset for character controllers
    const physicsPosition = worldPosition.clone();
    if (this.hasCharacterController && this.characterControllerConfig) {
      physicsPosition.add(this.characterControllerConfig.colliderOffset);
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
        this.colliderId = `${this.entityId}_collider`;
        this.createCollider(config);
      }
    }
  }

  protected abstract createCollider(config: any): void;

  setPosition(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
    
    // Debug: Check if this is a Mesh3D and log details
    if (this.metadata.type === "mesh3d") {

      // Check mesh matrix settings and world position after entity position change
      this.updateMatrixWorld(true);
      if (this.children.length > 0) {
        const mesh = this.children[0];
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
      }
    }
    
    this.updatePhysicsTransform();
    this.emitChange();
    return this;
  }

  setRotation(x: number, y: number, z: number): this {
    this.rotation.set(x, y, z);
    this.updatePhysicsTransform();
    this.emitChange();
    return this;
  }

  setScale(x: number, y: number = x, z: number = x): this {
    this.scale.set(x, y, z);
    
    // Recreate physics collider if it exists to account for scale changes
    if (this.physicsManager && this.rigidBodyId && this.colliderId) {
      this.physicsManager.removeCollider(this.colliderId);
      this.createCollider(this.physicsConfig || {});
    }
    
    this.emitChange();
    return this;
  }

  /**
   * Helper method to get the scaled dimensions for physics colliders.
   * All createCollider methods should use this to ensure scale is properly applied.
   */
  protected getScaledDimensions(baseDimensions: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      baseDimensions.x * this.scale.x,
      baseDimensions.y * this.scale.y,
      baseDimensions.z * this.scale.z
    );
  }

  /**
   * Helper method to get a scaled radius for spherical colliders.
   * Uses the maximum scale component to ensure the collider encompasses the scaled mesh.
   */
  protected getScaledRadius(baseRadius: number): number {
    return baseRadius * Math.max(this.scale.x, this.scale.y, this.scale.z);
  }

  private updatePhysicsTransform(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (rigidBody) {
      // Use world position instead of local position for physics bodies
      this.updateMatrixWorld(true);
      const worldPosition = new THREE.Vector3();
      this.getWorldPosition(worldPosition);
      
      // Calculate physics body position with collider offset for character controllers
      const physicsPosition = worldPosition.clone();
      if (this.hasCharacterController && this.characterControllerConfig) {
        physicsPosition.add(this.characterControllerConfig.colliderOffset);
      }
      
      // Use world quaternion for rotation
      const worldQuaternion = new THREE.Quaternion();
      this.getWorldQuaternion(worldQuaternion);
      
      rigidBody.setTranslation(physicsPosition, true);
      rigidBody.setRotation(worldQuaternion, true);
    }
    
    // Recursively update child physics bodies
    this.updateChildPhysicsTransforms();
  }

  /**
   * Recursively updates physics transforms for all child entities.
   * This ensures that when a parent moves, all child physics bodies are updated to their new world positions.
   */
  private updateChildPhysicsTransforms(): void {
    this.children.forEach(child => {
      if (child instanceof Entity) {
        child.updatePhysicsTransform();
      }
    });
  }

  /**
   * Syncs the entity's visual transform (position and rotation) from its physics rigid body.
   * This is the authoritative way to update visuals based on the physics simulation.
   * It correctly handles the character controller's collider offset.
   */
  syncVisualsFromPhysics(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (!rigidBody) return;

    const rigidBodyPosition = rigidBody.translation();
    
    // Create a new Vector3 from the rigid body's position
    const worldPosition = new THREE.Vector3(rigidBodyPosition.x, rigidBodyPosition.y, rigidBodyPosition.z);

    // If the entity has a character controller with an offset, we must subtract it
    // from the physics body's position to get the correct visual mesh position.
    // The physics body is the source of truth for position, and it's already offset.
    if (this.hasCharacterController && this.characterControllerConfig?.colliderOffset) {
      worldPosition.sub(this.characterControllerConfig.colliderOffset);
    }

    // Get world rotation from physics
    const worldQuaternion = rigidBody.rotation() as THREE.Quaternion;

    // If this entity has a parent, convert world transforms to local transforms
    if (this.parent && !(this.parent instanceof THREE.Scene)) {
      // Update parent's world matrix
      this.parent.updateMatrixWorld(true);
      
      // Get parent's world matrix inverse
      const parentMatrixInverse = new THREE.Matrix4();
      parentMatrixInverse.copy(this.parent.matrixWorld).invert();
      
      // Convert world position to local position
      const localPosition = worldPosition.clone();
      localPosition.applyMatrix4(parentMatrixInverse);
      this.position.copy(localPosition);
      
      // Convert world quaternion to local quaternion
      const parentWorldQuaternion = new THREE.Quaternion();
      this.parent.getWorldQuaternion(parentWorldQuaternion);
      const parentQuaternionInverse = parentWorldQuaternion.clone().invert();
      const localQuaternion = parentQuaternionInverse.multiply(worldQuaternion);
      this.quaternion.copy(localQuaternion);
    } else {
      // No parent or parent is the scene - use world transforms directly
      this.position.copy(worldPosition);
      this.quaternion.copy(worldQuaternion);
    }

    this.emitChange();
  }

  syncPhysics(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (rigidBody?.isDynamic()) {
      const rigidBodyPosition = rigidBody.translation();
      const worldPosition = new THREE.Vector3(rigidBodyPosition.x, rigidBodyPosition.y, rigidBodyPosition.z);
      if (this.hasCharacterController && this.characterControllerConfig?.colliderOffset) {
        worldPosition.sub(this.characterControllerConfig.colliderOffset);
      }
      
      // Get world rotation from physics
      const worldQuaternion = rigidBody.rotation() as THREE.Quaternion;
      
      // If this entity has a parent, convert world transforms to local transforms
      if (this.parent && !(this.parent instanceof THREE.Scene)) {
        // Update parent's world matrix
        this.parent.updateMatrixWorld(true);
        
        // Get parent's world matrix inverse
        const parentMatrixInverse = new THREE.Matrix4();
        parentMatrixInverse.copy(this.parent.matrixWorld).invert();
        
        // Convert world position to local position
        const localPosition = worldPosition.clone();
        localPosition.applyMatrix4(parentMatrixInverse);
        this.position.copy(localPosition);
        
        // Convert world quaternion to local quaternion
        const parentWorldQuaternion = new THREE.Quaternion();
        this.parent.getWorldQuaternion(parentWorldQuaternion);
        const parentQuaternionInverse = parentWorldQuaternion.clone().invert();
        const localQuaternion = parentQuaternionInverse.multiply(worldQuaternion);
        this.quaternion.copy(localQuaternion);
      } else {
        // No parent or parent is the scene - use world transforms directly
        this.position.copy(worldPosition);
        this.quaternion.copy(worldQuaternion);
      }
      
      this.emitChange();
    }
  }

  /**
   * Sync the physics body transform to match the visual mesh transform
   * This is useful when scripts modify entity position/rotation directly
   */
  syncPhysicsFromTransform(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (rigidBody && !rigidBody.isDynamic()) {
      // For static and kinematic bodies, update physics to match visual transform
      // Use world position instead of local position
      this.updateMatrixWorld(true);
      const worldPosition = new THREE.Vector3();
      this.getWorldPosition(worldPosition);
      
      const worldQuaternion = new THREE.Quaternion();
      this.getWorldQuaternion(worldQuaternion);
      
      rigidBody.setTranslation(worldPosition, true);
      rigidBody.setRotation(worldQuaternion, true);
      this.emitChange();
    }
  }

  // Event system methods for React synchronization
  protected emitChange(): void {
    this.changeListeners.forEach(listener => listener());
  }

  public addChangeListener(listener: () => void): void {
    this.changeListeners.add(listener);
  }

  public removeChangeListener(listener: () => void): void {
    this.changeListeners.delete(listener);
  }

  // Method to set visibility with change emission
  public setVisible(value: boolean): this {
    if (this.visible !== value) {
      this.visible = value;
      this.emitChange();
    }
    return this;
  }

  addEntity(child: Entity): this { this.add(child); return this; }
  
  // Override Three.js add method to handle physics updates
  add(...objects: THREE.Object3D[]): this {
    // Call parent add method first
    super.add(...objects);
    
    // Update physics transforms for any entities with physics bodies
    objects.forEach(obj => {
      if (obj instanceof Entity && obj.hasPhysics()) {
        // Update the child's physics transform to account for new parent
        obj.updatePhysicsTransform();
      }
    });
    
    return this;
  }
  
  // Override Three.js remove method to handle physics updates
  remove(...objects: THREE.Object3D[]): this {
    // Update physics transforms before removal
    objects.forEach(obj => {
      if (obj instanceof Entity && obj.hasPhysics()) {
        // Update world matrix one last time while still attached to parent
        obj.updateMatrixWorld(true);
        // Update physics to world position before detaching
        obj.updatePhysicsTransform();
      }
    });
    
    // Call parent remove method
    super.remove(...objects);
    
    return this;
  }

  tweenTo(target: THREE.Vector3 | THREE.Quaternion, duration = 1, easing?: (t: number) => number, onComplete?: () => void): this { this.tweens.push({ target, duration, easing, onComplete }); return this; }
  updateTweens(delta: number): void { /* ... */ }
  onClick(callback: (event: any) => void): this { this.interactionCallbacks.onClick = callback; return this; }
  onHover(callback: (event: any) => void): this { this.interactionCallbacks.onHover = callback; return this; }
  onMouseEnter(callback: (event: any) => void): this { this.interactionCallbacks.onMouseEnter = callback; return this; }
  onMouseLeave(callback: (event: any) => void): this { this.interactionCallbacks.onMouseLeave = callback; return this; }
  onPointerDown(callback: (event: any) => void): this { this.interactionCallbacks.onPointerDown = callback; return this; }
  onPointerUp(callback: (event: any) => void): this { this.interactionCallbacks.onPointerUp = callback; return this; }
  handleInteraction(eventType: string, event: any): void { 
    // Handle direct event type callbacks
    const callback = this.interactionCallbacks[eventType as keyof InteractionCallbacks];
    if (callback) callback(event);
    
    // Handle legacy API callbacks
    if (eventType === 'click' && this.interactionCallbacks.onClick) {
      this.interactionCallbacks.onClick(event);
    } else if (eventType === 'mouseover' && this.interactionCallbacks.onHover) {
      this.interactionCallbacks.onHover(event);
    } else if (eventType === 'mouseenter' && this.interactionCallbacks.onMouseEnter) {
      this.interactionCallbacks.onMouseEnter(event);
    } else if (eventType === 'mouseleave' && this.interactionCallbacks.onMouseLeave) {
      this.interactionCallbacks.onMouseLeave(event);
    } else if (eventType === 'pointerdown' && this.interactionCallbacks.onPointerDown) {
      this.interactionCallbacks.onPointerDown(event);
    } else if (eventType === 'pointerup' && this.interactionCallbacks.onPointerUp) {
      this.interactionCallbacks.onPointerUp(event);
    }
  }
  applyForce(force: THREE.Vector3, point?: THREE.Vector3): this { if (this.physicsManager && this.rigidBodyId) this.physicsManager.applyForce(this.rigidBodyId, force, point); return this; }
  applyImpulse(impulse: THREE.Vector3, point?: THREE.Vector3): this { if (this.physicsManager && this.rigidBodyId) this.physicsManager.applyImpulse(this.rigidBodyId, impulse, point); return this; }
  setVelocity(velocity: THREE.Vector3): this { if (this.physicsManager && this.rigidBodyId) this.physicsManager.setVelocity(this.rigidBodyId, velocity); return this; }
  getVelocity(): THREE.Vector3 | null { if (this.physicsManager && this.rigidBodyId) return this.physicsManager.getVelocity(this.rigidBodyId); return null; }
  addTag(tag: string): this { if (!this.metadata.tags.includes(tag)) { this.metadata.tags.push(tag); this.metadata.updated = Date.now(); } return this; }
  removeTag(tag: string): this { const index = this.metadata.tags.indexOf(tag); if (index > -1) { this.metadata.tags.splice(index, 1); this.metadata.updated = Date.now(); } return this; }
  hasTag(tag: string): boolean { return this.metadata.tags.includes(tag); }
  setLayer(layer: number): this { this.metadata.layer = layer; this.metadata.updated = Date.now(); return this; }
  destroy(): void { 
    if (this.destroyed) return; 
    
    // Clean up scripts first
    if (this.scriptManager) {
      this.scriptManager.onEntityDestroyed(this.entityId);
    }
    
    // Clean up physics
    if (this.physicsManager) { 
      if (this.rigidBodyId) this.physicsManager.removeRigidBody(this.rigidBodyId); 
      if (this.colliderId) this.physicsManager.removeCollider(this.colliderId); 
    } 
    
    this.removeFromParent(); 
    this.clear(); 
    this.destroyed = true; 
  }
  isDestroyed(): boolean { return this.destroyed; }
  enableDebugRender(): this { this.debugRenderEnabled = true; return this; }
  disableDebugRender(): this { this.debugRenderEnabled = false; return this; }
  toggleDebugRender(): this { this.debugRenderEnabled = !this.debugRenderEnabled; return this; }
  isDebugRenderEnabled(): boolean { return this.debugRenderEnabled; }
  getRigidBodyId(): string | null { return this.rigidBodyId; }
  getColliderId(): string | null { return this.colliderId; }

  // Physics property getters for React synchronization
  get physicsType(): string | undefined {
    return this.physicsConfig?.type;
  }
  
  get physicsMass(): number | undefined {
    return this.physicsConfig?.mass;
  }
  
  get physicsRestitution(): number | undefined {
    return this.physicsConfig?.restitution;
  }
  
  get physicsFriction(): number | undefined {
    return this.physicsConfig?.friction;
  }

  // Character controller methods
  enableCharacterController(config: Partial<CharacterControllerConfig> = {}): this {
    // Default character controller config
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
      slideDuration: 1.5,
      slideDeceleration: 10.0,
      crouchHeightReduction: 0.5,
      slideMinSpeed: 5.0,
      
      // Advanced movement mechanics (CS-like defaults)
      airAcceleration: 40.0,
      airMaxSpeed: 30.0,
      groundFriction: 8.0,
      airFriction: 0.1,
      stopSpeed: 1.0,
      slopeFriction: 2.0,
      slideThreshold: Math.PI / 6,
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
      movingPlatformMaxDistance: 0.2,
      movingBodyPushForce: 1.0,
      
      offset: 0.01,
      maxSlopeClimbAngle: Math.PI / 4,
      minSlopeSlideAngle: Math.PI / 6,
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
    
    // Automatically enable kinematic physics for character controller
    if (!this.hasPhysics() || this.getPhysicsConfig()?.type !== 'kinematic') {
      this.enableKinematicPhysics();
    } else if (this.physicsManager && this.rigidBodyId && this.colliderId) {
      // If physics already enabled, recreate collider with capsule shape
      this.physicsManager.removeCollider(this.colliderId);
      this.createCollider({});
    }
    
    this.emitChange();
    return this;
  }

  disableCharacterController(): this {
    this.characterControllerConfig = null;
    this.hasCharacterController = false;
    this.emitChange();
    return this;
  }

  getCharacterControllerConfig(): CharacterControllerConfig | null {
    return this.characterControllerConfig ? this.characterControllerConfig : null;
  }

  updateCharacterControllerConfig(newConfig: Partial<CharacterControllerConfig>): this {
    if (this.characterControllerConfig) {
      this.characterControllerConfig = { ...this.characterControllerConfig, ...newConfig };
      
      // If capsule dimensions or collider offset changed, recreate the physics setup
      if ((newConfig.capsuleHalfHeight !== undefined || 
           newConfig.capsuleRadius !== undefined ||
           newConfig.colliderOffset !== undefined) && 
          this.physicsManager && this.rigidBodyId && this.colliderId) {
        
        // Remove old physics setup
        this.physicsManager.removeCollider(this.colliderId);
        
        // If collider offset changed, we need to recreate the rigid body too
        if (newConfig.colliderOffset !== undefined) {
          this.physicsManager.removeRigidBody(this.rigidBodyId);
          this.rigidBodyId = null;
          this.colliderId = null;
          
          // Recreate physics with new offset
          this.setupPhysics(this.physicsConfig || { type: "kinematic" });
        } else {
          // Just recreate the collider with new dimensions
          this.createCollider({});
        }
      }
      
      this.emitChange();
    }
    return this;
  }

  hasCharacterControllerEnabled(): boolean {
    return this.hasCharacterController;
  }

  protected serializeCharacterController() {
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

  protected serializeScripts() {
    if (!this.scriptManager || this.attachedScripts.length === 0) return undefined;
    
    return this.attachedScripts.map(scriptId => ({
      scriptId,
      parameters: this.scriptManager!.getScriptParameters(this.entityId, scriptId)
    }));
  }

  // Script system methods
  attachScript(scriptId: string): this {
    if (!this.scriptManager) {
      console.warn(`Cannot attach script ${scriptId}: ScriptManager not set on entity ${this.entityId}`);
      return this;
    }

    if (this.scriptManager.attachScript(this.entityId, scriptId)) {
      if (!this.attachedScripts.includes(scriptId)) {
        this.attachedScripts.push(scriptId);
      }
      this.emitChange();
    }
    return this;
  }

  detachScript(scriptId: string): this {
    if (!this.scriptManager) return this;

    if (this.scriptManager.detachScript(this.entityId, scriptId)) {
      const index = this.attachedScripts.indexOf(scriptId);
      if (index > -1) {
        this.attachedScripts.splice(index, 1);
      }
      this.emitChange();
    }
    return this;
  }

  getAttachedScripts(): string[] {
    return [...this.attachedScripts];
  }

  hasScript(scriptId: string): boolean {
    return this.attachedScripts.includes(scriptId);
  }

  detachAllScripts(): this {
    const scriptsToDetach = [...this.attachedScripts];
    for (const scriptId of scriptsToDetach) {
      this.detachScript(scriptId);
    }
    return this;
  }

  // New methods for managing colliders in advanced mode
  addCollider(colliderConfig: ColliderConfig): string | null {
    if (!this.physicsConfig || this.physicsConfig.mode !== PhysicsMode.Advanced) {
      console.warn("Cannot add collider: entity is not in advanced physics mode");
      return null;
    }
    
    if (!this.physicsManager || !this.rigidBodyId) return null;
    
    const colliderId = `${this.entityId}_collider_${this.colliderIds.length}`;
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

  removeColliderById(colliderId: string): boolean {
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

  getColliderIds(): string[] {
    if (this.physicsConfig?.mode === PhysicsMode.Advanced) {
      return [...this.colliderIds];
    } else if (this.colliderId) {
      return [this.colliderId];
    }
    return [];
  }

  // New method to update advanced physics properties
  updateAdvancedPhysicsProperty(property: string, value: any): this {
    if (!this.hasPhysics() || !this.physicsConfig || this.physicsConfig.mode !== PhysicsMode.Advanced) return this;
    
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
    return this;
  }

  // New method to update entire collider without recreating physics bodies
  updateColliderConfig(colliderIndex: number, newColliderConfig: ColliderConfig): this {
    if (!this.hasPhysics() || !this.physicsConfig || this.physicsConfig.mode !== PhysicsMode.Advanced) return this;
    if (!this.physicsConfig.colliders || colliderIndex >= this.physicsConfig.colliders.length) return this;
    
    // Update the collider config
    const updatedColliders = [...this.physicsConfig.colliders];
    updatedColliders[colliderIndex] = { ...newColliderConfig };
    
    // Update the physics config without recreating bodies
    this.physicsConfig = {
      ...this.physicsConfig,
      colliders: updatedColliders
    };
    
    // For now, we'll need to recreate the specific collider if it exists
    // This is more efficient than recreating all physics bodies
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
    return this;
  }
}