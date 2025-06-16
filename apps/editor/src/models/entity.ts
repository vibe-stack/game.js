import * as THREE from "three/webgpu";
import { PhysicsManager } from "./physics-manager";
import { EntityConfig, TweenConfig, InteractionCallbacks, EntityMetadata } from "./types";

export class Entity extends THREE.Object3D {
  public readonly entityId: string;
  public readonly entityName: string;
  public readonly metadata: EntityMetadata;
  
  protected physicsManager: PhysicsManager | null = null;
  protected rigidBodyId: string | null = null;
  protected colliderId: string | null = null;
  private tweens: TweenConfig[] = [];
  private interactionCallbacks: InteractionCallbacks = {};
  private destroyed = false;

  constructor(config: EntityConfig = {}) {
    super();
    
    this.entityId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.entityName = config.name || this.entityId;
    
    this.metadata = {
      type: "mesh",
      created: Date.now(),
      updated: Date.now(),
      tags: [],
      layer: 0,
    };

    if (config.position) {
      this.position.copy(config.position);
    }
    
    if (config.rotation) {
      this.rotation.copy(config.rotation);
    }
    
    if (config.scale) {
      this.scale.copy(config.scale);
    }
  }

  // Override dispatchEvent to handle InteractionManager events
  dispatchEvent(event: any): void {
    if (event && event.type) {
      this.handleInteraction(event.type, event);
    }
    super.dispatchEvent(event);
  }

  setPhysicsManager(physicsManager: PhysicsManager): this {
    this.physicsManager = physicsManager;
    return this;
  }

  enableDynamicPhysics(mass = 1, restitution = 0.5, friction = 0.7): this {
    this.setupPhysics({ type: "dynamic", mass, restitution, friction });
    return this;
  }

  enableStaticPhysics(restitution = 0.5, friction = 0.7): this {
    this.setupPhysics({ type: "static", restitution, friction });
    return this;
  }

  enableKinematicPhysics(): this {
    this.setupPhysics({ type: "kinematic" });
    return this;
  }

  private setupPhysics(config: any): void {
    if (!this.physicsManager) {
      console.warn("Physics manager not set for entity:", this.entityId);
      return;
    }

    this.rigidBodyId = `${this.entityId}_body`;
    const rigidBody = this.physicsManager.createRigidBody(
      this.rigidBodyId,
      config,
      this.position,
      this.quaternion
    );

    if (rigidBody) {
      this.colliderId = `${this.entityId}_collider`;
      this.createCollider(config);
    }
  }

  protected createCollider(_config: any): void {
    // Override in subclasses to create specific collider shapes
  }

  setPosition(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
    this.updatePhysicsTransform();
    return this;
  }

  setRotation(x: number, y: number, z: number): this {
    this.rotation.set(x, y, z);
    this.updatePhysicsTransform();
    return this;
  }

  setScale(x: number, y: number = x, z: number = x): this {
    this.scale.set(x, y, z);
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
    this.physicsManager.syncTransform(this.rigidBodyId, this);
  }

  addEntity(child: Entity): this {
    this.add(child);
    return this;
  }

  tweenTo(
    target: THREE.Vector3 | THREE.Quaternion,
    duration = 1,
    easing?: (t: number) => number,
    onComplete?: () => void
  ): this {
    this.tweens.push({ target, duration, easing, onComplete });
    return this;
  }

  updateTweens(delta: number): void {
    this.tweens = this.tweens.filter((tween) => {
      tween.duration -= delta;
      if (tween.duration <= 0) {
        if (tween.onComplete) tween.onComplete();
        return false;
      }
      
      const totalDuration = tween.duration + delta;
      const t = 1 - tween.duration / totalDuration;
      const easedT = tween.easing ? tween.easing(t) : t;
      
      if (tween.target instanceof THREE.Vector3) {
        this.position.lerp(tween.target, easedT);
      } else {
        this.quaternion.slerp(tween.target, easedT);
      }
      
      this.updatePhysicsTransform();
      return true;
    });
  }

  onClick(callback: (event: any) => void): this {
    this.interactionCallbacks.onClick = callback;
    return this;
  }

  onHover(callback: (event: any) => void): this {
    this.interactionCallbacks.onHover = callback;
    return this;
  }

  onMouseEnter(callback: (event: any) => void): this {
    this.interactionCallbacks.onMouseEnter = callback;
    return this;
  }

  onMouseLeave(callback: (event: any) => void): this {
    this.interactionCallbacks.onMouseLeave = callback;
    return this;
  }

  onPointerDown(callback: (event: any) => void): this {
    this.interactionCallbacks.onPointerDown = callback;
    return this;
  }

  onPointerUp(callback: (event: any) => void): this {
    this.interactionCallbacks.onPointerUp = callback;
    return this;
  }

  handleInteraction(eventType: string, event: any): void {
    switch (eventType) {
      case "click":
        this.interactionCallbacks.onClick?.(event);
        break;
      case "hover":
        this.interactionCallbacks.onHover?.(event);
        break;
      case "mouseenter":
        this.interactionCallbacks.onMouseEnter?.(event);
        break;
      case "mouseleave":
        this.interactionCallbacks.onMouseLeave?.(event);
        break;
      case "pointerdown":
        this.interactionCallbacks.onPointerDown?.(event);
        break;
      case "pointerup":
        this.interactionCallbacks.onPointerUp?.(event);
        break;
    }
  }

  applyForce(force: THREE.Vector3, point?: THREE.Vector3): this {
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.applyForce(this.rigidBodyId, force, point);
    }
    return this;
  }

  applyImpulse(impulse: THREE.Vector3, point?: THREE.Vector3): this {
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.applyImpulse(this.rigidBodyId, impulse, point);
    }
    return this;
  }

  setVelocity(velocity: THREE.Vector3): this {
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.setVelocity(this.rigidBodyId, velocity);
    }
    return this;
  }

  getVelocity(): THREE.Vector3 | null {
    if (this.physicsManager && this.rigidBodyId) {
      return this.physicsManager.getVelocity(this.rigidBodyId);
    }
    return null;
  }

  addTag(tag: string): this {
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
      this.metadata.updated = Date.now();
    }
    return this;
  }

  removeTag(tag: string): this {
    const index = this.metadata.tags.indexOf(tag);
    if (index > -1) {
      this.metadata.tags.splice(index, 1);
      this.metadata.updated = Date.now();
    }
    return this;
  }

  hasTag(tag: string): boolean {
    return this.metadata.tags.includes(tag);
  }

  setLayer(layer: number): this {
    this.metadata.layer = layer;
    this.metadata.updated = Date.now();
    return this;
  }

  destroy(): void {
    if (this.destroyed) return;

    if (this.physicsManager) {
      if (this.rigidBodyId) {
        this.physicsManager.removeRigidBody(this.rigidBodyId);
      }
      if (this.colliderId) {
        this.physicsManager.removeCollider(this.colliderId);
      }
    }

    this.removeFromParent();
    this.clear();
    this.destroyed = true;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }
} 