import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";

export interface ConeConfig extends EntityConfig {
  // Basic dimensions
  radius?: number;
  height?: number;
  
  // Segment configuration
  radialSegments?: number;
  heightSegments?: number;
  
  // Opening configuration
  openEnded?: boolean;
  thetaStart?: number;
  thetaLength?: number;
  
  // Material
  material?: THREE.Material;
  
  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Cone extends Entity {
  public readonly dimensions: { radius: number; height: number };
  public readonly segmentConfig: {
    radial: number;
    height: number;
    openEnded: boolean;
    thetaStart: number;
    thetaLength: number;
  };
  private mesh: THREE.Mesh;
  private geometry: THREE.ConeGeometry;

  constructor(config: ConeConfig = {}) {
    super(config);
    
    this.dimensions = {
      radius: config.radius ?? 1,
      height: config.height ?? 1
    };
    
    this.segmentConfig = {
      radial: config.radialSegments ?? 32,
      height: config.heightSegments ?? 1,
      openEnded: config.openEnded ?? false,
      thetaStart: config.thetaStart ?? 0,
      thetaLength: config.thetaLength ?? Math.PI * 2
    };
    
    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0x88ff00 });
    
    this.geometry = new THREE.ConeGeometry(
      this.dimensions.radius,
      this.dimensions.height,
      this.segmentConfig.radial,
      this.segmentConfig.height,
      this.segmentConfig.openEnded,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    
    this.metadata.type = "primitive";
    this.addTag("cone");
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    
    // Use a cylinder collider as approximation for cone
    const radius = this.dimensions.radius * 0.5;
    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "capsule",
      new THREE.Vector3(radius, this.dimensions.height, radius)
    );
  }

  setDimensions(radius: number, height: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.ConeGeometry(
      radius,
      height,
      this.segmentConfig.radial,
      this.segmentConfig.height,
      this.segmentConfig.openEnded,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.dimensions as any).radius = radius;
    (this.dimensions as any).height = height;
    return this;
  }

  setSegments(radialSegments: number, heightSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.ConeGeometry(
      this.dimensions.radius,
      this.dimensions.height,
      radialSegments,
      heightSegments,
      this.segmentConfig.openEnded,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.segmentConfig as any).radial = radialSegments;
    (this.segmentConfig as any).height = heightSegments;
    return this;
  }

  setAngularConfig(thetaStart: number, thetaLength: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.ConeGeometry(
      this.dimensions.radius,
      this.dimensions.height,
      this.segmentConfig.radial,
      this.segmentConfig.height,
      this.segmentConfig.openEnded,
      thetaStart,
      thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.segmentConfig as any).thetaStart = thetaStart;
    (this.segmentConfig as any).thetaLength = thetaLength;
    return this;
  }

  setOpenEnded(openEnded: boolean): this {
    this.geometry.dispose();
    this.geometry = new THREE.ConeGeometry(
      this.dimensions.radius,
      this.dimensions.height,
      this.segmentConfig.radial,
      this.segmentConfig.height,
      openEnded,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.segmentConfig as any).openEnded = openEnded;
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

  getGeometry(): THREE.ConeGeometry {
    return this.geometry;
  }

  // Convenience getters
  get radius(): number { return this.dimensions.radius; }
  get height(): number { return this.dimensions.height; }

  // Create common cone variations
  static createPyramid(config: Omit<ConeConfig, 'radialSegments'> = {}): Cone {
    return new Cone({
      ...config,
      radialSegments: 4
    });
  }

  static createSpike(config: ConeConfig = {}): Cone {
    return new Cone({
      radius: 0.2,
      height: 2,
      ...config
    });
  }

  static createFunnel(config: ConeConfig = {}): Cone {
    return new Cone({
      ...config,
      openEnded: true
    });
  }
} 