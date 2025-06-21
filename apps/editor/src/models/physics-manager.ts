import * as THREE from "three/webgpu";
import { PhysicsConfig } from "./types";
import * as RAPIER from "@dimforge/rapier3d-compat";
import type RapierType from "@dimforge/rapier3d-compat";

export class PhysicsManager {
  private world: RapierType.World | null = null;
  private enabled = false;
  private bodyMap = new Map<string, RapierType.RigidBody>();
  private colliderMap = new Map<string, RapierType.Collider>();
  private gravity = new THREE.Vector3(0, -9.81, 0);
  private rapierModule: typeof RAPIER | null = null;
  private debugRenderEnabled = false;
  private bodyIdMap = new Map<RapierType.RigidBody, string>();
  private colliderIdMap = new Map<RapierType.Collider, string>();

  async initialize(gravity?: THREE.Vector3): Promise<void> {
    try {
      await RAPIER.init();
      this.rapierModule = RAPIER;
      
      if (gravity) {
        this.gravity = gravity;
      }
      
      this.world = new RAPIER.World(this.gravity);
      this.enabled = true;
    } catch (error) {
      console.warn("Failed to initialize physics:", error);
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.world !== null;
  }

  getWorld(): RapierType.World | null {
    return this.world;
  }

  createRigidBody(
    id: string,
    config: PhysicsConfig,
    position?: THREE.Vector3,
    rotation?: THREE.Quaternion
  ): RapierType.RigidBody | null {
    if (!this.isEnabled() || !this.rapierModule) return null;

    const bodyDesc = this.createBodyDesc(config);
    
    if (position) {
      bodyDesc.setTranslation(position.x, position.y, position.z);
    }
    
    if (rotation) {
      bodyDesc.setRotation({
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        w: rotation.w,
      });
    }

    const rigidBody = this.world!.createRigidBody(bodyDesc);
    
    // Track the body ID
    this.bodyMap.set(id, rigidBody);
    this.bodyIdMap.set(rigidBody, id);
    
    return rigidBody;
  }

  createCollider(
    id: string,
    rigidBodyId: string,
    shape: "ball" | "cuboid" | "capsule" | "trimesh" | "heightfield",
    dimensions: THREE.Vector3 | number | { heights: number[][]; scale: THREE.Vector3 },
    config?: PhysicsConfig
  ): RapierType.Collider | null {

    if (!this.isEnabled() || !this.rapierModule) return null;

    const rigidBody = this.bodyMap.get(rigidBodyId);
    if (!rigidBody) return null;

    let colliderDesc: RapierType.ColliderDesc;
    
    switch (shape) {
      case "ball": {
        const radius = typeof dimensions === "number" ? dimensions : (dimensions as THREE.Vector3).x;
        colliderDesc = this.rapierModule.ColliderDesc.ball(radius);
        break;
      }
      case "cuboid": {
        if (typeof dimensions === "number") {
          colliderDesc = this.rapierModule.ColliderDesc.cuboid(
            dimensions / 2,
            dimensions / 2,
            dimensions / 2
          );
        } else {
          const dims = dimensions as THREE.Vector3;
          colliderDesc = this.rapierModule.ColliderDesc.cuboid(
            dims.x / 2,
            dims.y / 2,
            dims.z / 2
          );
        }
        break;
      }
      case "capsule": {
        const height = typeof dimensions === "number" ? dimensions : (dimensions as THREE.Vector3).y;
        const capsuleRadius = typeof dimensions === "number" ? dimensions / 4 : (dimensions as THREE.Vector3).x / 2;
        colliderDesc = this.rapierModule.ColliderDesc.capsule(height / 2, capsuleRadius);
        break;
      }
      case "heightfield": {
        const heightfieldData = dimensions as { heights: number[][]; scale: THREE.Vector3 };
        const { heights, scale } = heightfieldData;
        
        // Flatten the 2D height array to 1D as required by Rapier
        const nrows = heights.length;
        const ncols = heights[0]?.length || 0;
        
        if (nrows === 0 || ncols === 0) {
          console.error("Invalid heightfield data: empty height array");
          return null;
        }
        
        // Rapier expects heights flattened in row-major order
        // heights[row][col] -> flatHeights[row * ncols + col]
        const flatHeights = new Float32Array(nrows * ncols);
        for (let row = 0; row < nrows; row++) {
          for (let col = 0; col < ncols; col++) {
            flatHeights[row * ncols + col] = heights[row][col];
          }
        }
        
        // Create heightfield collider
        // Arguments: (nrows-1, ncols-1, heights, scale)
        // Note: nrows-1 and ncols-1 because Rapier counts intervals, not samples
        colliderDesc = this.rapierModule.ColliderDesc.heightfield(
          nrows - 1, 
          ncols - 1, 
          flatHeights,
          { x: scale.x, y: scale.y, z: scale.z }
        );
        break;
      }
      default:
        console.warn(`Unsupported collider shape: ${shape}`);
        return null;
    }

    if (config) {
      if (config.restitution !== undefined) {
        colliderDesc.setRestitution(config.restitution);
      }
      if (config.friction !== undefined) {
        colliderDesc.setFriction(config.friction);
      }
    }

    const collider = this.world!.createCollider(colliderDesc, rigidBody);
    
    // Track the collider ID
    this.colliderMap.set(id, collider);
    this.colliderIdMap.set(collider, id);
    
    return collider;
  }

  private createBodyDesc(config: PhysicsConfig): RapierType.RigidBodyDesc {
    if (!this.rapierModule) {
      throw new Error("RAPIER module not initialized");
    }

    switch (config.type) {
      case "static":
        return this.rapierModule.RigidBodyDesc.fixed();
      case "kinematic":
        return this.rapierModule.RigidBodyDesc.kinematicPositionBased();
      case "dynamic":
      default: {
        const desc = this.rapierModule.RigidBodyDesc.dynamic();
        if (config.mass !== undefined) {
          desc.setAdditionalMass(config.mass);
        }
        return desc;
      }
    }
  }

  getRigidBody(id: string): RapierType.RigidBody | undefined {
    return this.bodyMap.get(id);
  }

  getCollider(id: string): RapierType.Collider | undefined {
    return this.colliderMap.get(id);
  }

  removeRigidBody(id: string): boolean {
    const rigidBody = this.bodyMap.get(id);
    if (!rigidBody || !this.world) return false;

    this.world.removeRigidBody(rigidBody);
    this.bodyMap.delete(id);
    this.bodyIdMap.delete(rigidBody);
    return true;
  }

  removeCollider(id: string): boolean {
    const collider = this.colliderMap.get(id);
    if (!collider || !this.world) return false;

    this.world.removeCollider(collider, true);
    this.colliderMap.delete(id);
    this.colliderIdMap.delete(collider);
    return true;
  }

  step(): void {
    if (!this.isEnabled()) return;
    this.world!.step();
  }

  setGravity(gravity: THREE.Vector3): void {
    this.gravity = gravity;
    if (this.world) {
      this.world.gravity = { x: gravity.x, y: gravity.y, z: gravity.z };
    }
  }

  getGravity(): THREE.Vector3 {
    return this.gravity.clone();
  }

  syncTransform(id: string, object3D: THREE.Object3D): void {
    const rigidBody = this.bodyMap.get(id);
    if (!rigidBody) return;

    const translation = rigidBody.translation();
    const rotation = rigidBody.rotation();

    object3D.position.set(translation.x, translation.y, translation.z);
    object3D.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  applyForce(id: string, force: THREE.Vector3, point?: THREE.Vector3): void {
    const rigidBody = this.bodyMap.get(id);
    if (!rigidBody) return;

    if (point) {
      rigidBody.addForceAtPoint(
        { x: force.x, y: force.y, z: force.z },
        { x: point.x, y: point.y, z: point.z },
        true
      );
    } else {
      rigidBody.addForce({ x: force.x, y: force.y, z: force.z }, true);
    }
  }

  applyImpulse(id: string, impulse: THREE.Vector3, point?: THREE.Vector3): void {
    const rigidBody = this.bodyMap.get(id);
    if (!rigidBody) return;

    if (point) {
      rigidBody.applyImpulseAtPoint(
        { x: impulse.x, y: impulse.y, z: impulse.z },
        { x: point.x, y: point.y, z: point.z },
        true
      );
    } else {
      rigidBody.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    }
  }

  setVelocity(id: string, velocity: THREE.Vector3): void {
    const rigidBody = this.bodyMap.get(id);
    if (!rigidBody) return;

    rigidBody.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }

  getVelocity(id: string): THREE.Vector3 | null {
    const rigidBody = this.bodyMap.get(id);
    if (!rigidBody) return null;

    const velocity = rigidBody.linvel();
    return new THREE.Vector3(velocity.x, velocity.y, velocity.z);
  }

  dispose(): void {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.bodyMap.clear();
    this.colliderMap.clear();
    this.bodyIdMap.clear();
    this.colliderIdMap.clear();
    this.enabled = false;
  }

  reset(): void {
    this.dispose();
    if (this.rapierModule) {
      this.world = new this.rapierModule.World(this.gravity);
      this.enabled = true;
    }
  }

  // Helper method specifically for heightfield colliders
  createHeightfieldCollider(
    id: string,
    rigidBodyId: string,
    heights: number[][],
    scale: THREE.Vector3,
    config?: PhysicsConfig
  ): RapierType.Collider | null {
    return this.createCollider(id, rigidBodyId, "heightfield", { heights, scale }, config);
  }

  getBodyCount(): number {
    return this.bodyMap.size;
  }

  getColliderCount(): number {
    return this.colliderMap.size;
  }

  enableDebugRender(enabled: boolean): void {
    this.debugRenderEnabled = enabled;
  }

  isDebugRenderEnabled(): boolean {
    return this.debugRenderEnabled;
  }

  getDebugRenderData(): { vertices: Float32Array; colors: Float32Array } | null {
    if (!this.isEnabled() || !this.debugRenderEnabled || !this.world) {
      return null;
    }

    try {
      const buffers = this.world.debugRender();
      return {
        vertices: buffers.vertices,
        colors: buffers.colors
      };
    } catch (error) {
      console.error("Error getting debug render data:", error);
      return null;
    }
  }
} 