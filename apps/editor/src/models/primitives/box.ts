import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";

export interface BoxConfig extends EntityConfig {
  size?: THREE.Vector3 | number;
  material?: THREE.Material;
}

export class Box extends Entity {
  public readonly size: THREE.Vector3;
  private mesh: THREE.Mesh;

  constructor(config: BoxConfig = {}) {
    super(config);

    this.size =
      typeof config.size === "number"
        ? new THREE.Vector3(config.size, config.size, config.size)
        : (config.size ?? new THREE.Vector3(1, 1, 1));

    const material =
      config.material ?? new THREE.MeshStandardMaterial({ color: 0x00ff00 });

    const geometry = new THREE.BoxGeometry(
      this.size.x,
      this.size.y,
      this.size.z,
    );
    this.mesh = new THREE.Mesh(geometry, material);
    this.add(this.mesh);

    this.metadata.type = "primitive";
    this.addTag("box");
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;

    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "cuboid",
      this.size,
    );
  }

  setSize(size: THREE.Vector3 | number): this {
    const newSize =
      typeof size === "number" ? new THREE.Vector3(size, size, size) : size;

    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.BoxGeometry(newSize.x, newSize.y, newSize.z);
    (this.size as any) = newSize;
    return this;
  }

  setMaterial(material: THREE.Material): this {
    this.mesh.material = material;
    return this;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }
}
