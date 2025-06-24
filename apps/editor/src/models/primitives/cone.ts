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
    
    // Use proper cone collider
    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "cone",
      new THREE.Vector3(this.dimensions.radius, this.dimensions.height, this.dimensions.radius)
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
    this.emitChange(); // Trigger change event for UI updates
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
    this.emitChange(); // Trigger change event for UI updates
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
    this.emitChange(); // Trigger change event for UI updates
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

  serialize(): EntityData {
    return {
      id: this.entityId, name: this.entityName, type: "cone",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      physics: this.serializePhysics(),
      characterController: this.serializeCharacterController(),
      geometry: { type: "ConeGeometry", parameters: { radius: this.radius, height: this.height, radialSegments: this.segmentConfig.radial, heightSegments: this.segmentConfig.height, openEnded: this.segmentConfig.openEnded, thetaStart: this.segmentConfig.thetaStart, thetaLength: this.segmentConfig.thetaLength } }
    };
  }
} 