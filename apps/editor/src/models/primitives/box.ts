import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface BoxConfig extends EntityConfig {
  width?: number; height?: number; depth?: number; size?: THREE.Vector3 | number;
  widthSegments?: number; heightSegments?: number; depthSegments?: number;
  material?: THREE.Material; castShadow?: boolean; receiveShadow?: boolean;
}

export class Box extends Entity {
  public readonly dimensions: THREE.Vector3;
  public readonly segments: { width: number; height: number; depth: number };
  private mesh: THREE.Mesh;
  private geometry: THREE.BoxGeometry;

  constructor(config: BoxConfig = {}) {
    super(config);
    let width = config.width ?? 1; let height = config.height ?? 1; let depth = config.depth ?? 1;
    if (config.size) { if (typeof config.size === "number") { width = height = depth = config.size; } else { width = config.size.x; height = config.size.y; depth = config.size.z; } }
    this.dimensions = new THREE.Vector3(width, height, depth);
    this.segments = { width: config.widthSegments ?? 1, height: config.heightSegments ?? 1, depth: config.depthSegments ?? 1 };
    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.geometry = new THREE.BoxGeometry(this.dimensions.x, this.dimensions.y, this.dimensions.z, this.segments.width, this.segments.height, this.segments.depth);
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    this.metadata.type = "box"; this.addTag("box");
  }

  serialize(): EntityData {
    return {
      id: this.entityId, name: this.entityName, type: "box",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      geometry: { type: "BoxGeometry", parameters: { width: this.width, height: this.height, depth: this.depth } }
    };
  }

  protected createCollider(): void {
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "cuboid", this.dimensions);
    }
  }

  get width(): number { return this.dimensions.x; }
  get height(): number { return this.dimensions.y; }
  get depth(): number { return this.dimensions.z; }
  get size(): THREE.Vector3 { return this.dimensions.clone(); }
}