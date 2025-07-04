import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

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
  public innerRadius: number;
  public outerRadius: number;
  public thetaSegments: number;
  public phiSegments: number;
  public thetaStart: number;
  public thetaLength: number;
  private mesh: THREE.Mesh;
  private geometry: THREE.RingGeometry;
  private material: THREE.Material;

  constructor(config: RingConfig = {}) {
    super({
      ...config,
      castShadow: config.castShadow ?? true,
      receiveShadow: config.receiveShadow ?? true
    });
    this.innerRadius = config.innerRadius ?? 0.5;
    this.outerRadius = config.outerRadius ?? 1;
    this.thetaSegments = config.thetaSegments ?? 32;
    this.phiSegments = config.phiSegments ?? 1;
    this.thetaStart = config.thetaStart ?? 0;
    this.thetaLength = config.thetaLength ?? Math.PI * 2;
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    this.geometry = new THREE.RingGeometry(this.innerRadius, this.outerRadius, this.thetaSegments, this.phiSegments, this.thetaStart, this.thetaLength);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = this.castShadow;
    this.mesh.receiveShadow = this.receiveShadow;
    this.add(this.mesh);
    this.metadata.type = "primitive";
    this.addTag("ring");
  }

  protected createCollider(): void {
    // A ring is 2D, so a simple box collider might not be ideal.
    // For now, we don't create a collider for a ring.
  }

  setDimensions(innerRadius: number, outerRadius: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.RingGeometry(
      innerRadius,
      outerRadius,
      this.thetaSegments,
      this.phiSegments,
      this.thetaStart,
      this.thetaLength
    );
    this.mesh.geometry = this.geometry;
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    return this;
  }

  setSegments(thetaSegments: number, phiSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.RingGeometry(
      this.innerRadius,
      this.outerRadius,
      thetaSegments,
      phiSegments,
      this.thetaStart,
      this.thetaLength
    );
    this.mesh.geometry = this.geometry;
    this.thetaSegments = thetaSegments;
    this.phiSegments = phiSegments;
    return this;
  }

  setAngularConfig(thetaStart: number, thetaLength: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.RingGeometry(
      this.innerRadius,
      this.outerRadius,
      this.thetaSegments,
      this.phiSegments,
      thetaStart,
      thetaLength
    );
    this.mesh.geometry = this.geometry;
    this.thetaStart = thetaStart;
    this.thetaLength = thetaLength;
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

  getGeometry(): THREE.RingGeometry {
    return this.geometry;
  }

  // Convenience getters
  get thickness(): number { return this.outerRadius - this.innerRadius; }
  get centerRadius(): number { return (this.innerRadius + this.outerRadius) / 2; }

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

  serialize(): EntityData {
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "ring",
      geometry: {
        type: "RingGeometry",
        parameters: {
          innerRadius: this.innerRadius,
          outerRadius: this.outerRadius,
          thetaSegments: this.thetaSegments,
          phiSegments: this.phiSegments,
          thetaStart: this.thetaStart,
          thetaLength: this.thetaLength
        }
      }
    };
  }
} 