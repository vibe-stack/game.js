import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";

export interface CylinderConfig extends EntityConfig {
  // Basic dimensions
  radiusTop?: number;
  radiusBottom?: number;
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

export class Cylinder extends Entity {
  public readonly dimensions: {
    radiusTop: number;
    radiusBottom: number;
    height: number;
  };
  public readonly segmentConfig: {
    radial: number;
    height: number;
    openEnded: boolean;
    thetaStart: number;
    thetaLength: number;
  };
  private mesh: THREE.Mesh;
  private geometry: THREE.CylinderGeometry;

  constructor(config: CylinderConfig = {}) {
    super(config);
    
    this.dimensions = {
      radiusTop: config.radiusTop ?? 1,
      radiusBottom: config.radiusBottom ?? 1,
      height: config.height ?? 1
    };
    
    this.segmentConfig = {
      radial: config.radialSegments ?? 32,
      height: config.heightSegments ?? 1,
      openEnded: config.openEnded ?? false,
      thetaStart: config.thetaStart ?? 0,
      thetaLength: config.thetaLength ?? Math.PI * 2
    };
    
    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0x0088ff });
    
    this.geometry = new THREE.CylinderGeometry(
      this.dimensions.radiusTop,
      this.dimensions.radiusBottom,
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
    this.addTag("cylinder");
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    
    // Use capsule for cylinder if radii are equal, otherwise use convex hull
    if (this.dimensions.radiusTop === this.dimensions.radiusBottom) {
      this.physicsManager.createCollider(
        this.colliderId!,
        this.rigidBodyId,
        "capsule",
        new THREE.Vector3(this.dimensions.radiusTop, this.dimensions.height, this.dimensions.radiusTop)
      );
    } else {
      // For truncated cones, we'd need a more complex collider
      const radius = Math.max(this.dimensions.radiusTop, this.dimensions.radiusBottom);
      this.physicsManager.createCollider(
        this.colliderId!,
        this.rigidBodyId,
        "capsule",
        new THREE.Vector3(radius, this.dimensions.height, radius)
      );
    }
  }

  setDimensions(radiusTop: number, radiusBottom: number, height: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      this.segmentConfig.radial,
      this.segmentConfig.height,
      this.segmentConfig.openEnded,
      this.segmentConfig.thetaStart,
      this.segmentConfig.thetaLength
    );
    this.mesh.geometry = this.geometry;
    (this.dimensions as any).radiusTop = radiusTop;
    (this.dimensions as any).radiusBottom = radiusBottom;
    (this.dimensions as any).height = height;
    return this;
  }

  setSegments(radialSegments: number, heightSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CylinderGeometry(
      this.dimensions.radiusTop,
      this.dimensions.radiusBottom,
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
    this.geometry = new THREE.CylinderGeometry(
      this.dimensions.radiusTop,
      this.dimensions.radiusBottom,
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
    this.geometry = new THREE.CylinderGeometry(
      this.dimensions.radiusTop,
      this.dimensions.radiusBottom,
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

  getGeometry(): THREE.CylinderGeometry {
    return this.geometry;
  }

  // Convenience getters
  get radiusTop(): number { return this.dimensions.radiusTop; }
  get radiusBottom(): number { return this.dimensions.radiusBottom; }
  get height(): number { return this.dimensions.height; }
  get radius(): number { return Math.max(this.dimensions.radiusTop, this.dimensions.radiusBottom); }

  // Create common cylinder variations
  static createCone(config: Omit<CylinderConfig, 'radiusTop'> = {}): Cylinder {
    return new Cylinder({
      ...config,
      radiusTop: 0
    });
  }

  static createTruncatedCone(config: CylinderConfig = {}): Cylinder {
    return new Cylinder({
      radiusTop: 0.5,
      radiusBottom: 1,
      ...config
    });
  }

  static createTube(config: CylinderConfig = {}): Cylinder {
    return new Cylinder({
      ...config,
      openEnded: true
    });
  }
} 