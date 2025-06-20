import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface SphereConfig extends EntityConfig {
  radius?: number; widthSegments?: number; heightSegments?: number;
  material?: THREE.Material; castShadow?: boolean; receiveShadow?: boolean;
}

export class Sphere extends Entity {
  public readonly radius: number;
  private mesh: THREE.Mesh;
  private geometry: THREE.SphereGeometry;

  constructor(config: SphereConfig = {}) {
    super(config);
    this.radius = config.radius ?? 1;
    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.geometry = new THREE.SphereGeometry(this.radius, config.widthSegments ?? 32, config.heightSegments ?? 16);
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    this.metadata.type = "sphere"; this.addTag("sphere");
  }

  serialize(): EntityData {
    return {
      id: this.entityId, name: this.entityName, type: "sphere",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      geometry: { type: "SphereGeometry", parameters: { radius: this.radius } }
    };
  }

  protected createCollider(): void {
    if (this.physicsManager && this.rigidBodyId) {
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "ball", this.radius);
    }
  }
  getMesh(): THREE.Mesh { return this.mesh; }
}