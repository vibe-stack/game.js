import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface TorusConfig extends EntityConfig {
  // Basic dimensions
  radius?: number;
  tube?: number;
  
  // Segment configuration
  radialSegments?: number;
  tubularSegments?: number;
  
  // Arc configuration
  arc?: number;
  
  // Material
  material?: THREE.Material;
  
  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Torus extends Entity {
  public radius: number;
  public tube: number;
  public radialSegments: number;
  public tubularSegments: number;
  public arc: number;
  private mesh: THREE.Mesh;
  private geometry: THREE.TorusGeometry;
  private material: THREE.Material;

  constructor(config: TorusConfig = {}) {
    super({
      ...config,
      castShadow: config.castShadow ?? true,
      receiveShadow: config.receiveShadow ?? true
    });
    this.radius = config.radius ?? 1;
    this.tube = config.tube ?? 0.4;
    this.radialSegments = config.radialSegments ?? 8;
    this.tubularSegments = config.tubularSegments ?? 6;
    this.arc = config.arc ?? Math.PI * 2;
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xffff00 });
    this.geometry = new THREE.TorusGeometry(this.radius, this.tube, this.radialSegments, this.tubularSegments, this.arc);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = this.castShadow;
    this.mesh.receiveShadow = this.receiveShadow;
    this.add(this.mesh);
    this.metadata.type = "primitive";
    this.addTag("torus");
  }

  protected createCollider(config: any): void {
    if (this.physicsManager && this.rigidBodyId) {
      // For a torus, a convex hull of its geometry is a good approximation
      const vertices = this.geometry.attributes.position.array as Float32Array;
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "convexhull", { vertices }, config);
    }
  }

  protected rebuildGeometry(): void {
    this.geometry.dispose();
    this.geometry = new THREE.TorusGeometry(this.radius, this.tube, this.radialSegments, this.tubularSegments, this.arc);
    this.mesh.geometry = this.geometry;
  }

  setDimensions(radius: number, tube: number): this {
    this.radius = radius;
    this.tube = tube;
    this.rebuildGeometry();
    this.emitChange();
    return this;
  }

  setSegments(radial: number, tubular: number): this {
    this.radialSegments = Math.max(3, Math.round(radial));
    this.tubularSegments = Math.max(3, Math.round(tubular));
    this.rebuildGeometry();
    this.emitChange();
    return this;
  }

  setArc(arc: number): this {
    this.arc = Math.max(0.1, Math.min(Math.PI * 2, arc));
    this.rebuildGeometry();
    this.emitChange();
    return this;
  }

  setMaterial(material: THREE.Material): this {
    this.material = material;
    this.mesh.material = material;
    this.emitChange();
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
    this.emitChange();
    return this;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getGeometry(): THREE.TorusGeometry {
    return this.geometry;
  }

  // Convenience getters
  get outerRadius(): number { return this.radius + this.tube; }
  get innerRadius(): number { return this.radius - this.tube; }

  // Create common torus variations
  static createDonut(config: TorusConfig = {}): Torus {
    return new Torus({
      radius: 1,
      tube: 0.3,
      ...config
    });
  }

  static createRing(config: TorusConfig = {}): Torus {
    return new Torus({
      radius: 1,
      tube: 0.1,
      ...config
    });
  }

  static createArc(config: Omit<TorusConfig, 'arc'> = {}): Torus {
    return new Torus({
      ...config,
      arc: Math.PI
    });
  }

  serialize(): EntityData {
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "torus",
      geometry: {
        type: "TorusGeometry",
        parameters: {
          radius: this.radius,
          tube: this.tube,
          radialSegments: this.radialSegments,
          tubularSegments: this.tubularSegments,
          arc: this.arc
        }
      }
    };
  }
} 