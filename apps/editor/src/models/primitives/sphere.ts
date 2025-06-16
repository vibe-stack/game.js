import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";

export interface SphereConfig extends EntityConfig {
  radius?: number;
  material?: THREE.Material;
  segments?: number;
}

export class Sphere extends Entity {
  public readonly radius: number;
  private mesh: THREE.Mesh;

  constructor(config: SphereConfig = {}) {
    super(config);
    
    this.radius = config.radius ?? 1;
    const segments = config.segments ?? 32;
    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xff0000 });
    
    const geometry = new THREE.SphereGeometry(this.radius, segments, segments);
    this.mesh = new THREE.Mesh(geometry, material);
    this.add(this.mesh);
    
    this.metadata.type = "primitive";
    this.addTag("sphere");
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    
    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "ball",
      this.radius
    );
  }

  setRadius(radius: number): this {
    this.mesh.geometry.dispose();
    const segments = 32;
    this.mesh.geometry = new THREE.SphereGeometry(radius, segments, segments);
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