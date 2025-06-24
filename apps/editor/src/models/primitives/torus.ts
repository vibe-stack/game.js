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
  public readonly dimensions: { radius: number; tube: number };
  public readonly segmentConfig: {
    radial: number;
    tubular: number;
    arc: number;
  };
  private mesh: THREE.Mesh;
  private geometry: THREE.TorusGeometry;

  constructor(config: TorusConfig = {}) {
    super(config);
    
    this.dimensions = {
      radius: config.radius ?? 1,
      tube: config.tube ?? 0.4
    };
    
    this.segmentConfig = {
      radial: config.radialSegments ?? 16,
      tubular: config.tubularSegments ?? 100,
      arc: config.arc ?? Math.PI * 2
    };
    
    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xff8800 });
    
    this.geometry = new THREE.TorusGeometry(
      this.dimensions.radius,
      this.dimensions.tube,
      this.segmentConfig.radial,
      this.segmentConfig.tubular,
      this.segmentConfig.arc
    );
    
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    
    this.metadata.type = "primitive";
    this.addTag("torus");
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    
    // For torus, we'll use a convex hull approximation
    // In a more sophisticated implementation, you might want to use compound colliders
    // Use scaled radius to ensure collider matches visual size
    const baseRadius = this.dimensions.radius + this.dimensions.tube;
    const scaledRadius = baseRadius * Math.max(this.scale.x, this.scale.y, this.scale.z);
    
    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "ball",
      scaledRadius
    );
  }

  protected rebuildGeometry(): void {
    this.geometry.dispose();
    this.geometry = new THREE.TorusGeometry(
      this.dimensions.radius,
      this.dimensions.tube,
      this.segmentConfig.radial,
      this.segmentConfig.tubular,
      this.segmentConfig.arc
    );
    this.mesh.geometry = this.geometry;
  }

  setDimensions(radius: number, tube: number): this {
    (this.dimensions as any).radius = radius;
    (this.dimensions as any).tube = tube;
    this.rebuildGeometry();
    this.emitChange();
    return this;
  }

  setSegments(radial: number, tubular: number): this {
    this.segmentConfig.radial = Math.max(3, Math.round(radial));
    this.segmentConfig.tubular = Math.max(3, Math.round(tubular));
    this.rebuildGeometry();
    this.emitChange();
    return this;
  }

  setArc(arc: number): this {
    this.segmentConfig.arc = Math.max(0.1, Math.min(Math.PI * 2, arc));
    this.rebuildGeometry();
    this.emitChange();
    return this;
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
  get radius(): number { return this.dimensions.radius; }
  get tube(): number { return this.dimensions.tube; }
  get outerRadius(): number { return this.dimensions.radius + this.dimensions.tube; }
  get innerRadius(): number { return this.dimensions.radius - this.dimensions.tube; }

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
    return {
      id: this.entityId, name: this.entityName, type: "torus",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      physics: this.serializePhysics(),
      characterController: this.serializeCharacterController(),
      geometry: { type: "TorusGeometry", parameters: { radius: this.dimensions.radius, tube: this.dimensions.tube, radialSegments: this.segmentConfig.radial, tubularSegments: this.segmentConfig.tubular, arc: this.segmentConfig.arc } }
    };
  }
} 