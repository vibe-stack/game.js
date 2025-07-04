import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface PlaneConfig extends EntityConfig {
  // Dimensions
  width?: number;
  height?: number;
  
  // Segment configuration
  widthSegments?: number;
  heightSegments?: number;
  
  // Material
  material?: THREE.Material;
  
  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Plane extends Entity {
  public width: number;
  public height: number;
  public widthSegments: number;
  public heightSegments: number;
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.Material;

  constructor(config: PlaneConfig = {}) {
    super({
      ...config,
      castShadow: config.castShadow ?? true,
      receiveShadow: config.receiveShadow ?? true
    });
    this.width = config.width ?? 1;
    this.height = config.height ?? 1;
    this.widthSegments = config.widthSegments ?? 1;
    this.heightSegments = config.heightSegments ?? 1;
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
    this.geometry = new THREE.PlaneGeometry(this.width, this.height, this.widthSegments, this.heightSegments);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = this.castShadow;
    this.mesh.receiveShadow = this.receiveShadow;
    this.add(this.mesh);
    this.metadata.type = "primitive";
    this.addTag("plane");
  }

  protected createCollider(config: any): void {
    if (this.physicsManager && this.rigidBodyId) {
      const scaledDimensions = this.getScaledDimensions(new THREE.Vector3(this.width, this.height, 0.1));
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "cuboid", scaledDimensions, config);
    }
  }

  setDimensions(width: number, height: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(
      width,
      height,
      this.widthSegments,
      this.heightSegments
    );
    this.mesh.geometry = this.geometry;
    this.width = width;
    this.height = height;
    return this;
  }

  setSegments(widthSegments: number, heightSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(
      this.width,
      this.height,
      widthSegments,
      heightSegments
    );
    this.mesh.geometry = this.geometry;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
    return this;
  }

  setMaterial(material: THREE.Material): void {
    this.material = material;
    this.mesh.material = material;
    this.emitChange();
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

  getGeometry(): THREE.PlaneGeometry {
    return this.geometry;
  }

  // Create common plane variations
  static createGround(config: Omit<PlaneConfig, 'widthSegments' | 'heightSegments'> = {}): Plane {
    const plane = new Plane({
      width: 10,
      height: 10,
      widthSegments: 10,
      heightSegments: 10,
      ...config
    });
    plane.rotateX(-Math.PI / 2); // Rotate to be horizontal
    return plane;
  }

  static createWall(config: PlaneConfig = {}): Plane {
    return new Plane({
      width: 5,
      height: 3,
      ...config
    });
  }

  static createQuad(config: PlaneConfig = {}): Plane {
    return new Plane({
      width: 1,
      height: 1,
      ...config
    });
  }

  serialize(): EntityData {
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "plane",
      geometry: {
        type: "PlaneGeometry",
        parameters: {
          width: this.width,
          height: this.height,
          widthSegments: this.widthSegments,
          heightSegments: this.heightSegments
        }
      }
    };
  }
} 