import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface SphereConfig extends EntityConfig {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  phiStart?: number;
  phiLength?: number;
  thetaStart?: number;
  thetaLength?: number;
  material?: THREE.Material;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Sphere extends Entity {
  public radius: number;
  public widthSegments: number;
  public heightSegments: number;
  public phiStart: number;
  public phiLength: number;
  public thetaStart: number;
  public thetaLength: number;
  private mesh: THREE.Mesh;
  private geometry: THREE.SphereGeometry;
  private material: THREE.Material;

  constructor(config: SphereConfig = {}) {
    super({
      ...config,
      castShadow: config.castShadow ?? true,
      receiveShadow: config.receiveShadow ?? true
    });
    this.radius = config.radius ?? 1;
    this.widthSegments = config.widthSegments ?? 16;
    this.heightSegments = config.heightSegments ?? 12;
    this.phiStart = config.phiStart ?? 0;
    this.phiLength = config.phiLength ?? Math.PI * 2;
    this.thetaStart = config.thetaStart ?? 0;
    this.thetaLength = config.thetaLength ?? Math.PI;
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.geometry = new THREE.SphereGeometry(this.radius, this.widthSegments, this.heightSegments, this.phiStart, this.phiLength, this.thetaStart, this.thetaLength);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = this.castShadow;
    this.mesh.receiveShadow = this.receiveShadow;
    this.add(this.mesh);
    this.metadata.type = "sphere";
    this.addTag("sphere");
  }

  protected getGeometryRebuildProperties(): string[] {
    return ['radius', 'widthSegments', 'heightSegments'];
  }

  protected rebuildGeometry(): void {
    // Dispose old geometry
    if (this.geometry) {
      this.geometry.dispose();
    }
    
    // Create new geometry with current radius and segments
    this.geometry = new THREE.SphereGeometry(
      this.radius,
      this.widthSegments,
      this.heightSegments
    );
    
    // Update mesh geometry
    this.mesh.geometry = this.geometry;
  }

  // Public methods to update properties
  setRadius(radius: number): boolean {
    return this.updateGeometryProperty('radius', radius, (value) => {
      this.radius = value;
    });
  }

  setWidthSegments(segments: number): boolean {
    return this.updateGeometryProperty('widthSegments', segments, (value) => {
      this.widthSegments = value;
    });
  }

  setHeightSegments(segments: number): boolean {
    return this.updateGeometryProperty('heightSegments', segments, (value) => {
      this.heightSegments = value;
    });
  }

  setSegments(width: number, height: number): boolean {
    return this.updateGeometryProperties({
      widthSegments: width,
      heightSegments: height
    });
  }

  // Convenience method to update all properties
  updateGeometry(config: Partial<{
    radius: number;
    widthSegments: number;
    heightSegments: number;
  }>): boolean {
    const updates: Record<string, any> = {};
    
    if (config.radius !== undefined) updates.radius = config.radius;
    if (config.widthSegments !== undefined) updates.widthSegments = config.widthSegments;
    if (config.heightSegments !== undefined) updates.heightSegments = config.heightSegments;
    
    return this.updateGeometryProperties(updates);
  }

  serialize(): EntityData {
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "sphere",
      geometry: {
        type: "SphereGeometry",
        parameters: {
          radius: this.radius,
          widthSegments: this.widthSegments,
          heightSegments: this.heightSegments,
          phiStart: this.phiStart,
          phiLength: this.phiLength,
          thetaStart: this.thetaStart,
          thetaLength: this.thetaLength
        }
      }
    };
  }

  protected createCollider(config: any): void {
    if (this.physicsManager && this.rigidBodyId) {
      const scaledRadius = this.getScaledRadius(this.radius);
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "ball", scaledRadius, config);
    }
  }
  
  getMesh(): THREE.Mesh { return this.mesh; }
  getMaterial(): THREE.Material { return this.material; }
  setMaterial(material: THREE.Material): void { 
    this.material = material;
    this.mesh.material = material;
    this.emitChange();
  }

  setShadowSettings(castShadow: boolean, receiveShadow: boolean): this {
    this.castShadow = castShadow;
    this.receiveShadow = receiveShadow;
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.emitChange();
    return this;
  }
}