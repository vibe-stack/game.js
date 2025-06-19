import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";

export interface SphereConfig extends EntityConfig {
  // Basic dimensions
  radius?: number;
  
  // Segment configuration
  widthSegments?: number;  // phi segments
  heightSegments?: number; // theta segments
  segments?: number; // Legacy support - sets both width and height segments
  
  // Angular configuration
  phiStart?: number;   // Start angle for horizontal sweep
  phiLength?: number;  // Sweep angle for horizontal
  thetaStart?: number; // Start angle for vertical sweep
  thetaLength?: number; // Sweep angle for vertical
  
  // Material
  material?: THREE.Material;
  
  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Sphere extends Entity {
  public readonly radius: number;
  public readonly segmentConfig: {
    width: number;
    height: number;
    phiStart: number;
    phiLength: number;
    thetaStart: number;
    thetaLength: number;
  };
  private mesh: THREE.Mesh;
  private geometry: THREE.SphereGeometry;

  constructor(config: SphereConfig = {}) {
    super(config);
    
    this.radius = config.radius ?? 1;
    
    // Handle segments with priority: specific segments > segments > default
    let widthSegments = config.widthSegments ?? 32;
    let heightSegments = config.heightSegments ?? 16;
    
    if (config.segments !== undefined && config.widthSegments === undefined && config.heightSegments === undefined) {
      widthSegments = heightSegments = config.segments;
    }
    
    this.segmentConfig = {
      width: widthSegments,
      height: heightSegments,
      phiStart: config.phiStart ?? 0,
      phiLength: config.phiLength ?? Math.PI * 2,
      thetaStart: config.thetaStart ?? 0,
      thetaLength: config.thetaLength ?? Math.PI
    };
    
    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xff0000 });
    
    this.geometry = new THREE.SphereGeometry(
      this.radius,
      this.segmentConfig.width,
      this.segmentConfig.height,
      this.segmentConfig.phiStart,
      this.segmentConfig.phiLength,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
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
    this.geometry.dispose();
    this.geometry = new THREE.SphereGeometry(
      radius,
      this.segmentConfig.width,
      this.segmentConfig.height,
      this.segmentConfig.phiStart,
      this.segmentConfig.phiLength,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this as any).radius = radius;
    return this;
  }

  setSegments(widthSegments: number, heightSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.SphereGeometry(
      this.radius,
      widthSegments,
      heightSegments,
      this.segmentConfig.phiStart,
      this.segmentConfig.phiLength,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.segmentConfig as any).width = widthSegments;
    (this.segmentConfig as any).height = heightSegments;
    return this;
  }

  setAngularConfig(phiStart: number, phiLength: number, thetaStart: number, thetaLength: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.SphereGeometry(
      this.radius,
      this.segmentConfig.width,
      this.segmentConfig.height,
      phiStart,
      phiLength,
      thetaStart,
      thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.segmentConfig as any).phiStart = phiStart;
    (this.segmentConfig as any).phiLength = phiLength;
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

  getGeometry(): THREE.SphereGeometry {
    return this.geometry;
  }

  // Create common sphere variations
  static createHemisphere(config: Omit<SphereConfig, 'thetaLength'> = {}): Sphere {
    return new Sphere({
      ...config,
      thetaLength: Math.PI / 2
    });
  }

  static createQuarter(config: Omit<SphereConfig, 'phiLength' | 'thetaLength'> = {}): Sphere {
    return new Sphere({
      ...config,
      phiLength: Math.PI / 2,
      thetaLength: Math.PI / 2
    });
  }
} 