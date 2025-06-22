import * as THREE from "three/webgpu";
import { PhysicsManager } from "./physics-manager";
import { EntityConfig, TweenConfig, InteractionCallbacks, EntityMetadata, EntityType, PhysicsConfig } from "./types";
import { EntityData } from "./scene-loader";

export abstract class Entity extends THREE.Object3D {
  public readonly entityId: string;
  public readonly entityName: string;
  public readonly metadata: EntityMetadata;

  protected physicsManager: PhysicsManager | null = null;
  protected rigidBodyId: string | null = null;
  protected colliderId: string | null = null;
  protected physicsConfig: PhysicsConfig | null = null;
  private tweens: TweenConfig[] = [];
  private interactionCallbacks: InteractionCallbacks = {};
  private destroyed = false;
  private debugRenderEnabled = false;
  
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
    
    return {
      enabled: true,
      type: this.physicsConfig.type || "static",
      mass: this.physicsConfig.mass,
      restitution: this.physicsConfig.restitution,
      friction: this.physicsConfig.friction
    };
  }

  dispatchEvent(event: any): void {
    if (event && event.type) this.handleInteraction(event.type, event);
    super.dispatchEvent(event);
  }

  setPhysicsManager(physicsManager: PhysicsManager): this {
    this.physicsManager = physicsManager;
    return this;
  }

  enableDynamicPhysics(mass = 1, restitution = 0.5, friction = 0.7): this {
    const config = { type: "dynamic" as const, mass, restitution, friction };
    this.physicsConfig = config;
    this.setupPhysics(config);
    return this;
  }

  enableStaticPhysics(restitution = 0.5, friction = 0.7): this {
    const config = { type: "static" as const, restitution, friction };
    this.physicsConfig = config;
    this.setupPhysics(config);
    return this;
  }

  enableKinematicPhysics(): this {
    const config = { type: "kinematic" as const };
    this.physicsConfig = config;
    this.setupPhysics(config);
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
    return this;
  }

  getPhysicsConfig(): PhysicsConfig | null {
    return this.physicsConfig ? { ...this.physicsConfig } : null;
  }

  hasPhysics(): boolean {
    return this.physicsConfig !== null && this.rigidBodyId !== null;
  }

  private setupPhysics(config: PhysicsConfig): void {
    if (!this.physicsManager) return;
    this.rigidBodyId = `${this.entityId}_body`;
    const rigidBody = this.physicsManager.createRigidBody(this.rigidBodyId, config, this.position, this.quaternion);
    if (rigidBody) {
      this.colliderId = `${this.entityId}_collider`;
      this.createCollider(config);
    }
  }

  protected abstract createCollider(config: any): void;

  setPosition(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
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
    this.emitChange();
    return this;
  }

  private updatePhysicsTransform(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (rigidBody) {
      rigidBody.setTranslation(this.position, true);
      rigidBody.setRotation(this.quaternion, true);
    }
  }

  syncPhysics(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (rigidBody?.isDynamic()) {
      this.physicsManager.syncTransform(this.rigidBodyId, this);
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
  destroy(): void { if (this.destroyed) return; if (this.physicsManager) { if (this.rigidBodyId) this.physicsManager.removeRigidBody(this.rigidBodyId); if (this.colliderId) this.physicsManager.removeCollider(this.colliderId); } this.removeFromParent(); this.clear(); this.destroyed = true; }
  isDestroyed(): boolean { return this.destroyed; }
  enableDebugRender(): this { this.debugRenderEnabled = true; return this; }
  disableDebugRender(): this { this.debugRenderEnabled = false; return this; }
  toggleDebugRender(): this { this.debugRenderEnabled = !this.debugRenderEnabled; return this; }
  isDebugRenderEnabled(): boolean { return this.debugRenderEnabled; }
  getRigidBodyId(): string | null { return this.rigidBodyId; }
  getColliderId(): string | null { return this.colliderId; }
}