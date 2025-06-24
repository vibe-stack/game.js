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
  public readonly dimensions: { radius: number; length: number };
  public readonly segments: { cap: number; radial: number };
  private mesh: THREE.Mesh;
  private geometry: THREE.CapsuleGeometry;

  constructor(config: CapsuleConfig = {}) {
    super(config);

    this.dimensions = {
      radius: config.radius ?? 1,
      length: config.length ?? 1,
    };

    this.segments = {
      cap: config.capSegments ?? 4,
      radial: config.radialSegments ?? 8,
    };

    const material =
      config.material ?? new THREE.MeshStandardMaterial({ color: 0xff0088 });

    this.geometry = new THREE.CapsuleGeometry(
      this.dimensions.radius,
      this.dimensions.length,
      this.segments.cap,
      this.segments.radial,
    );

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);

    this.metadata.type = "primitive";
    this.addTag("capsule");
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;

    // Use scaled dimensions to ensure collider matches visual size
    const scaledDimensions = new THREE.Vector3(
      this.dimensions.radius * this.scale.x,
      this.dimensions.length * this.scale.y,
      this.dimensions.radius * this.scale.z
    );

    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "capsule",
      scaledDimensions,
    );
  }

  setDimensions(radius: number, length: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CapsuleGeometry(
      radius,
      length,
      this.segments.cap,
      this.segments.radial,
    );
    this.mesh.geometry = this.geometry;
    this.dimensions.radius = radius;
    this.dimensions.length = length;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setSegments(capSegments: number, radialSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CapsuleGeometry(
      this.dimensions.radius,
      this.dimensions.length,
      capSegments,
      radialSegments,
    );
    this.mesh.geometry = this.geometry;
    this.segments.cap = capSegments;
    this.segments.radial = radialSegments;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setRadius(radius: number): this {
    return this.setDimensions(radius, this.dimensions.length);
  }

  setLength(length: number): this {
    return this.setDimensions(this.dimensions.radius, length);
  }

  setMaterial(material: THREE.Material): this {
    this.mesh.material = material;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  getMaterial(): THREE.Material {
    return this.mesh.material as THREE.Material;
  }

  setShadowSettings(castShadow: boolean, receiveShadow: boolean): this {
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
  get radius(): number {
    return this.dimensions.radius;
  }
  get length(): number {
    return this.dimensions.length;
  }
  get totalHeight(): number {
    return this.dimensions.length + this.dimensions.radius * 2;
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
    return {
      id: this.entityId,
      name: this.entityName,
      type: "capsule",
      transform: {
        position: {
          x: this.position.x,
          y: this.position.y,
          z: this.position.z,
        },
        rotation: {
          x: this.rotation.x,
          y: this.rotation.y,
          z: this.rotation.z,
        },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible,
      castShadow: this.mesh.castShadow,
      receiveShadow: this.mesh.receiveShadow,
      userData: { ...this.userData },
      tags: [...this.metadata.tags],
      layer: this.metadata.layer,
      physics: this.serializePhysics(),
      characterController: this.serializeCharacterController(),
      geometry: {
        type: "CapsuleGeometry",
        parameters: {
          radius: this.radius,
          length: this.length,
          capSegments: this.segments.cap,
          radialSegments: this.segments.radial,
        },
      },
    };
  }
}
