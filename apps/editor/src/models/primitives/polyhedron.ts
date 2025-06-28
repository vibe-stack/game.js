import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface PolyhedronConfig extends EntityConfig {
  // Basic dimensions
  radius?: number;
  detail?: number;
  
  // Material
  material?: THREE.Material;
  
  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

// Base class for polyhedrons
abstract class Polyhedron extends Entity {
  public readonly radius: number;
  public readonly detail: number;
  protected mesh: THREE.Mesh;
  protected geometry: THREE.PolyhedronGeometry;

  constructor(config: PolyhedronConfig = {}) {
    super(config);
    
    this.radius = config.radius ?? 1;
    this.detail = config.detail ?? 0;
    
    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0x44aa88 });
    
    this.geometry = this.createGeometry();
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    
    this.metadata.type = "primitive";
  }

  protected abstract createGeometry(): THREE.PolyhedronGeometry;

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    
    // Use sphere collider as approximation for all polyhedrons
    // Use scaled radius to ensure collider matches visual size
    const scaledRadius = this.radius * Math.max(this.scale.x, this.scale.y, this.scale.z);
    
    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "ball",
      scaledRadius
    );
  }

  setRadius(radius: number): this {
    this.geometry.dispose();
    (this as any).radius = radius;
    this.geometry = this.createGeometry();
    this.mesh.geometry = this.geometry;
    return this;
  }

  setDetail(detail: number): this {
    this.geometry.dispose();
    (this as any).detail = detail;
    this.geometry = this.createGeometry();
    this.mesh.geometry = this.geometry;
    return this;
  }

  setMaterial(material: THREE.Material): this {
    this.mesh.material = material;
    return this;
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

  getGeometry(): THREE.PolyhedronGeometry {
    return this.geometry;
  }

  serialize(): EntityData {
    return {
      id: this.entityId, name: this.entityName, type: "polyhedron",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      characterController: this.serializeCharacterController(),
      scripts: this.serializeScripts(),
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      geometry: { type: "PolyhedronGeometry", parameters: { radius: this.radius, detail: this.detail } }
    };
  }
}

// Tetrahedron (4 faces)
export class Tetrahedron extends Polyhedron {
  constructor(config: PolyhedronConfig = {}) {
    super(config);
    this.addTag("tetrahedron");
  }

  protected createGeometry(): THREE.TetrahedronGeometry {
    return new THREE.TetrahedronGeometry(this.radius, this.detail);
  }
}

// Octahedron (8 faces)
export class Octahedron extends Polyhedron {
  constructor(config: PolyhedronConfig = {}) {
    super(config);
    this.addTag("octahedron");
  }

  protected createGeometry(): THREE.OctahedronGeometry {
    return new THREE.OctahedronGeometry(this.radius, this.detail);
  }
}

// Dodecahedron (12 faces)
export class Dodecahedron extends Polyhedron {
  constructor(config: PolyhedronConfig = {}) {
    super(config);
    this.addTag("dodecahedron");
  }

  protected createGeometry(): THREE.DodecahedronGeometry {
    return new THREE.DodecahedronGeometry(this.radius, this.detail);
  }
}

// Icosahedron (20 faces)
export class Icosahedron extends Polyhedron {
  constructor(config: PolyhedronConfig = {}) {
    super(config);
    this.addTag("icosahedron");
  }

  protected createGeometry(): THREE.IcosahedronGeometry {
    return new THREE.IcosahedronGeometry(this.radius, this.detail);
  }
}

// Type exports for convenience
export type TetrahedronConfig = PolyhedronConfig;
export type OctahedronConfig = PolyhedronConfig;
export type DodecahedronConfig = PolyhedronConfig;
export type IcosahedronConfig = PolyhedronConfig; 