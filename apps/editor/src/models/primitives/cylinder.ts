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
  public radiusTop: number;
  public radiusBottom: number;
  public height: number;
  public radialSegments: number;
  public heightSegments: number;
  public openEnded: boolean;
  public thetaStart: number;
  public thetaLength: number;
  private mesh: THREE.Mesh;
  private geometry: THREE.CylinderGeometry;
  private material: THREE.Material;

  constructor(config: CylinderConfig = {}) {
    super({
      ...config,
      castShadow: config.castShadow ?? true,
      receiveShadow: config.receiveShadow ?? true
    });
    this.radiusTop = config.radiusTop ?? 1;
    this.radiusBottom = config.radiusBottom ?? 1;
    this.height = config.height ?? 1;
    this.radialSegments = config.radialSegments ?? 16;
    this.heightSegments = config.heightSegments ?? 1;
    this.openEnded = config.openEnded ?? false;
    this.thetaStart = config.thetaStart ?? 0;
    this.thetaLength = config.thetaLength ?? Math.PI * 2;
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0x00ffff });
    this.geometry = new THREE.CylinderGeometry(this.radiusTop, this.radiusBottom, this.height, this.radialSegments, this.heightSegments, this.openEnded, this.thetaStart, this.thetaLength);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = this.castShadow;
    this.mesh.receiveShadow = this.receiveShadow;
    this.add(this.mesh);
    this.metadata.type = "primitive";
    this.addTag("cylinder");
  }

  protected createCollider(config: any): void {
    if (this.physicsManager && this.rigidBodyId) {
      const scaledHeight = this.height * this.scale.y;
      const scaledRadius = Math.max(this.radiusTop, this.radiusBottom) * Math.max(this.scale.x, this.scale.z);
      const dimensions = new THREE.Vector3(scaledRadius, scaledHeight, 0);
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "cylinder", dimensions, config);
    }
  }

  setDimensions(radiusTop: number, radiusBottom: number, height: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      this.radialSegments,
      this.heightSegments,
      this.openEnded,
      this.thetaStart,
      this.thetaLength
    );
    this.mesh.geometry = this.geometry;
    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;
    this.height = height;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setSegments(radialSegments: number, heightSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CylinderGeometry(
      this.radiusTop,
      this.radiusBottom,
      this.height,
      radialSegments,
      heightSegments,
      this.openEnded,
      this.thetaStart,
      this.thetaLength
    );
    this.mesh.geometry = this.geometry;
    this.radialSegments = radialSegments;
    this.heightSegments = heightSegments;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setAngularConfig(thetaStart: number, thetaLength: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.CylinderGeometry(
      this.radiusTop,
      this.radiusBottom,
      this.height,
      this.radialSegments,
      this.heightSegments,
      this.openEnded,
      thetaStart,
      thetaLength
    );
    this.mesh.geometry = this.geometry;
    this.thetaStart = thetaStart;
    this.thetaLength = thetaLength;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setOpenEnded(openEnded: boolean): this {
    this.geometry.dispose();
    this.geometry = new THREE.CylinderGeometry(
      this.radiusTop,
      this.radiusBottom,
      this.height,
      this.radialSegments,
      this.heightSegments,
      openEnded,
      this.thetaStart,
      this.thetaLength
    );
    this.mesh.geometry = this.geometry;
    this.openEnded = openEnded;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setMaterial(material: THREE.Material): this {
    this.material = material;
    this.mesh.material = material;
    this.emitChange(); // Trigger change event for UI updates
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
  get radius(): number { return Math.max(this.radiusTop, this.radiusBottom); }

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
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "cylinder",
      geometry: {
        type: "CylinderGeometry",
        parameters: {
          radiusTop: this.radiusTop,
          radiusBottom: this.radiusBottom,
          height: this.height,
          radialSegments: this.radialSegments,
          heightSegments: this.heightSegments,
          openEnded: this.openEnded,
          thetaStart: this.thetaStart,
          thetaLength: this.thetaLength
        }
      }
    };
  }
} 