import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";

export interface RingConfig extends EntityConfig {
  // Basic dimensions
  innerRadius?: number;
  outerRadius?: number;
  
  // Segment configuration
  thetaSegments?: number;
  phiSegments?: number;
  
  // Angular configuration
  thetaStart?: number;
  thetaLength?: number;
  
  // Material
  material?: THREE.Material;
  
  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Ring extends Entity {
  public readonly dimensions: { innerRadius: number; outerRadius: number };
  public readonly segmentConfig: {
    theta: number;
    phi: number;
    thetaStart: number;
    thetaLength: number;
  };
  private mesh: THREE.Mesh;
  private geometry: THREE.RingGeometry;

  constructor(config: RingConfig = {}) {
    super(config);
    
    this.dimensions = {
      innerRadius: config.innerRadius ?? 0.5,
      outerRadius: config.outerRadius ?? 1
    };
    
    this.segmentConfig = {
      theta: config.thetaSegments ?? 32,
      phi: config.phiSegments ?? 1,
      thetaStart: config.thetaStart ?? 0,
      thetaLength: config.thetaLength ?? Math.PI * 2
    };
    
    const material = config.material ?? new THREE.MeshStandardMaterial({ 
      color: 0xffaa00,
      side: THREE.DoubleSide
    });
    
    this.geometry = new THREE.RingGeometry(
      this.dimensions.innerRadius,
      this.dimensions.outerRadius,
      this.segmentConfig.theta,
      this.segmentConfig.phi,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? false;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    
    this.metadata.type = "primitive";
    this.addTag("ring");
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    
    // Create a thin torus-like collider for the ring
    const avgRadius = (this.dimensions.innerRadius + this.dimensions.outerRadius) / 2;
    const thickness = (this.dimensions.outerRadius - this.dimensions.innerRadius) / 2;
    
    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "ball",
      avgRadius + thickness
    );
  }

  setDimensions(innerRadius: number, outerRadius: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      this.segmentConfig.theta,
      this.segmentConfig.phi,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.dimensions as any).innerRadius = innerRadius;
    (this.dimensions as any).outerRadius = outerRadius;
    return this;
  }

  setSegments(thetaSegments: number, phiSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.RingGeometry(
      this.dimensions.innerRadius,
      this.dimensions.outerRadius,
      thetaSegments,
      phiSegments,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.segmentConfig as any).theta = thetaSegments;
    (this.segmentConfig as any).phi = phiSegments;
    return this;
  }

  setAngularConfig(thetaStart: number, thetaLength: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.RingGeometry(
      this.dimensions.innerRadius,
      this.dimensions.outerRadius,
      this.segmentConfig.theta,
      this.segmentConfig.phi,
      thetaStart,
      thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.segmentConfig as any).thetaStart = thetaStart;
    (this.segmentConfig as any).thetaLength = thetaLength;
    return this;
  }

  setMaterial(material: THREE.Material): this {
    this.mesh.material = material;
    return this;
  }

  setShadowSettings(castShadow: boolean, receiveShadow: boolean): this {
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    return this;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getGeometry(): THREE.RingGeometry {
    return this.geometry;
  }

  // Convenience getters
  get innerRadius(): number { return this.dimensions.innerRadius; }
  get outerRadius(): number { return this.dimensions.outerRadius; }
  get thickness(): number { return this.dimensions.outerRadius - this.dimensions.innerRadius; }
  get centerRadius(): number { return (this.dimensions.innerRadius + this.dimensions.outerRadius) / 2; }

  // Create common ring variations
  static createWasher(config: RingConfig = {}): Ring {
    return new Ring({
      innerRadius: 0.3,
      outerRadius: 0.5,
      ...config
    });
  }

  static createDisc(config: Omit<RingConfig, 'innerRadius'> = {}): Ring {
    return new Ring({
      innerRadius: 0,
      ...config
    });
  }

  static createArc(config: Omit<RingConfig, 'thetaLength'> = {}): Ring {
    return new Ring({
      ...config,
      thetaLength: Math.PI
    });
  }
} 