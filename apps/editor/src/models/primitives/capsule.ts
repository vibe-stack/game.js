import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface CapsuleConfig extends EntityConfig {
  // Basic dimensions
  radius?: number;
  length?: number;

  // Segment configuration
  capSegments?: number;
  radialSegments?: number;

  // Material
  material?: THREE.Material;

  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Capsule extends Entity {
  public radius: number;
  public length: number;
  public capSegments: number;
  public radialSegments: number;
  private mesh: THREE.Mesh;
  private geometry: THREE.CapsuleGeometry;
  private material: THREE.Material;

  constructor(config: CapsuleConfig = {}) {
    super({
      ...config,
      castShadow: config.castShadow ?? true,
      receiveShadow: config.receiveShadow ?? true
    });
    
    this.radius = config.radius ?? 0.5;
    this.length = config.length ?? 1;
    this.capSegments = config.capSegments ?? 8;
    this.radialSegments = config.radialSegments ?? 16;
    
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xffff00 });
    this.geometry = new THREE.CapsuleGeometry(this.radius, this.length, this.capSegments, this.radialSegments);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = this.castShadow;
    this.mesh.receiveShadow = this.receiveShadow;
    this.add(this.mesh);
    this.metadata.type = "primitive";
    this.addTag("capsule");
  }

  protected createCollider(config: any): void {
    if (this.physicsManager && this.rigidBodyId) {
      const scaledLength = this.length * this.scale.y;
      const scaledRadius = this.radius * Math.max(this.scale.x, this.scale.z);
      const dimensions = new THREE.Vector3(scaledRadius * 2, scaledLength, 0);
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "capsule", dimensions, config);
    }
  }

  setDimensions(radius: number, length: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CapsuleGeometry(
      radius,
      length,
      this.capSegments,
      this.radialSegments,
    );
    this.mesh.geometry = this.geometry;
    this.radius = radius;
    this.length = length;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setSegments(capSegments: number, radialSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CapsuleGeometry(
      this.radius,
      this.length,
      capSegments,
      radialSegments,
    );
    this.mesh.geometry = this.geometry;
    this.capSegments = capSegments;
    this.radialSegments = radialSegments;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setRadius(radius: number): this {
    return this.setDimensions(radius, this.length);
  }

  setLength(length: number): this {
    return this.setDimensions(this.radius, length);
  }

  setMaterial(material: THREE.Material): this {
    this.material = material;
    this.mesh.material = material;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  getMaterial(): THREE.Material {
    return this.material;
  }

  setShadowSettings(castShadow: boolean, receiveShadow: boolean): this {
    this.castShadow = castShadow;
    this.receiveShadow = receiveShadow;
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getGeometry(): THREE.CapsuleGeometry {
    return this.geometry;
  }

  // Convenience getters
  get totalHeight(): number {
    return this.length + this.radius * 2;
  }

  // Create common capsule variations
  static createPill(config: CapsuleConfig = {}): Capsule {
    return new Capsule({
      radius: 0.3,
      length: 1.5,
      ...config,
    });
  }

  static createBullet(config: CapsuleConfig = {}): Capsule {
    return new Capsule({
      radius: 0.2,
      length: 0.8,
      ...config,
    });
  }

  serialize(): EntityData {
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "capsule",
      geometry: {
        type: "CapsuleGeometry",
        parameters: {
          radius: this.radius,
          length: this.length,
          capSegments: this.capSegments,
          radialSegments: this.radialSegments
        }
      }
    };
  }
}
