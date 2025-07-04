import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

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
  public radius: number;
  public height: number;
  public radialSegments: number;
  public heightSegments: number;
  public openEnded: boolean;
  public thetaStart: number;
  public thetaLength: number;
  private mesh: THREE.Mesh;
  private geometry: THREE.ConeGeometry;
  private material: THREE.Material;

  constructor(config: ConeConfig = {}) {
    super({
      ...config,
      castShadow: config.castShadow ?? true,
      receiveShadow: config.receiveShadow ?? true
    });
    this.radius = config.radius ?? 1;
    this.height = config.height ?? 2;
    this.radialSegments = config.radialSegments ?? 16;
    this.heightSegments = config.heightSegments ?? 1;
    this.openEnded = config.openEnded ?? false;
    this.thetaStart = config.thetaStart ?? 0;
    this.thetaLength = config.thetaLength ?? Math.PI * 2;
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xff9900 });
    this.geometry = new THREE.ConeGeometry(this.radius, this.height, this.radialSegments, this.heightSegments, this.openEnded, this.thetaStart, this.thetaLength);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = this.castShadow;
    this.mesh.receiveShadow = this.receiveShadow;
    this.add(this.mesh);
    this.metadata.type = "primitive";
    this.addTag("cone");
  }

  protected createCollider(config: any): void {
    if (this.physicsManager && this.rigidBodyId) {
      const scaledHeight = this.height * this.scale.y;
      const scaledRadius = this.radius * Math.max(this.scale.x, this.scale.z);
      const dimensions = new THREE.Vector3(scaledRadius, scaledHeight, 0);
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "cone", dimensions, config);
    }
  }

  setDimensions(radius: number, height: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.ConeGeometry(
      radius,
      height,
      this.radialSegments,
      this.heightSegments,
      this.openEnded,
      this.thetaStart,
      this.thetaLength
    );
    this.mesh.geometry = this.geometry;
    this.radius = radius;
    this.height = height;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }

  setSegments(radialSegments: number, heightSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.ConeGeometry(
      this.radius,
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
    this.geometry = new THREE.ConeGeometry(
      this.radius,
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
    this.geometry = new THREE.ConeGeometry(
      this.radius,
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

  getGeometry(): THREE.ConeGeometry {
    return this.geometry;
  }

  serialize(): EntityData {
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "cone",
      geometry: {
        type: "ConeGeometry",
        parameters: {
          radius: this.radius,
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