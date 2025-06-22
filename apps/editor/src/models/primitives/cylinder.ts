import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

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
    this.emitChange(); // Trigger change event for UI updates
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
    this.emitChange(); // Trigger change event for UI updates
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
    this.emitChange(); // Trigger change event for UI updates
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
    this.emitChange(); // Trigger change event for UI updates
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
    this.emitChange(); // Trigger change event for UI updates
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

  serialize(): EntityData {
    return {
      id: this.entityId, name: this.entityName, type: "cylinder",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      physics: this.serializePhysics(),
      geometry: { type: "CylinderGeometry", parameters: { radiusTop: this.dimensions.radiusTop, radiusBottom: this.dimensions.radiusBottom, height: this.dimensions.height, radialSegments: this.segmentConfig.radial, heightSegments: this.segmentConfig.height, openEnded: this.segmentConfig.openEnded, thetaStart: this.segmentConfig.thetaStart, thetaLength: this.segmentConfig.thetaLength } }
    };
  }

} 