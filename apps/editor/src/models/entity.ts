import * as THREE from "three/webgpu";
import { PhysicsManager } from "./physics-manager";
import { EntityConfig, TweenConfig, InteractionCallbacks, EntityMetadata, EntityType, PhysicsConfig } from "./types";
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

  setScriptManager(scriptManager: ScriptManager): this {
    this.scriptManager = scriptManager;
    return this;
  }

  private updatePhysicsConfig(config: PhysicsConfig): this {
    if (!this.physicsManager) return this;

    // If a rigid body already exists, remove it before creating a new one.
    if (this.rigidBodyId) {
      this.physicsManager.removeRigidBody(this.rigidBodyId);
      this.rigidBodyId = null;
    }
    if (this.colliderId) {
      this.physicsManager.removeCollider(this.colliderId);
      this.colliderId = null;
    }

    this.setupPhysics(config);

    if (this.physicsConfig) {
      this.physicsConfig.friction = config.friction;
      this.physicsConfig.mass = config.mass;
      this.physicsConfig.restitution = config.restitution;
      this.physicsConfig.type = config.type;
    } else {
      this.physicsConfig = config;
    }

    this.emitChange();
    return this;
  }

  enableDynamicPhysics(mass = 1, restitution = 0.5, friction = 0.7): this {
    const config = { type: "dynamic" as const, mass, restitution, friction };
    this.updatePhysicsConfig(config);
    return this;
  }

  enableStaticPhysics(restitution = 0.5, friction = 0.7): this {
    const config = { type: "static" as const, restitution, friction };
    this.updatePhysicsConfig(config);
    return this;
  }

  enableKinematicPhysics(): this {
    const config = { type: "kinematic" as const };
    this.updatePhysicsConfig(config);
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

  /**
   * Sync the physics body transform to match the visual mesh transform
   * This is useful when scripts modify entity position/rotation directly
   */
  syncPhysicsFromTransform(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    const rigidBody = this.physicsManager.getRigidBody(this.rigidBodyId);
    if (rigidBody && !rigidBody.isDynamic()) {
      // For static and kinematic bodies, update physics to match visual transform
      rigidBody.setTranslation(this.position, true);
      rigidBody.setRotation(this.quaternion, true);
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
      maxSpeed: 8.0,
      acceleration: 50.0,
      jumpForce: 12.0,
      sprintMultiplier: 1.8,
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
      this.emitChange();
    }
    return this;
  }

  hasCharacterControllerEnabled(): boolean {
    return this.hasCharacterController;
  }

  protected serializeCharacterController() {
    if (!this.characterControllerConfig) return undefined;
    return { ...this.characterControllerConfig };
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
}