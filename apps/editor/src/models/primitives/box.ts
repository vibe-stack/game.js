import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";

export interface BoxConfig extends EntityConfig {
  // Dimensions
  width?: number;
  height?: number;
  depth?: number;
  size?: THREE.Vector3 | number; // Legacy support, overridden by width/height/depth if provided
  
  // Geometry segments
  widthSegments?: number;
  heightSegments?: number;
  depthSegments?: number;
  
  // Material
  material?: THREE.Material;
  
  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Box extends Entity {
  public readonly dimensions: THREE.Vector3;
  public readonly segments: { width: number; height: number; depth: number };
  private mesh: THREE.Mesh;
  private geometry: THREE.BoxGeometry;

  constructor(config: BoxConfig = {}) {
    super(config);

    // Handle dimensions with priority: specific dimensions > size > default
    let width = config.width ?? 1;
    let height = config.height ?? 1;
    let depth = config.depth ?? 1;
    
    if (config.size !== undefined && config.width === undefined && config.height === undefined && config.depth === undefined) {
      if (typeof config.size === "number") {
        width = height = depth = config.size;
      } else {
        width = config.size.x;
        height = config.size.y;
        depth = config.size.z;
      }
    }

    this.dimensions = new THREE.Vector3(width, height, depth);
    
    // Segments configuration
    this.segments = {
      width: config.widthSegments ?? 1,
      height: config.heightSegments ?? 1,
      depth: config.depthSegments ?? 1
    };

    const material = config.material ?? new THREE.MeshStandardMaterial({ color: 0x00ff00 });

    this.geometry = new THREE.BoxGeometry(
      this.dimensions.x,
      this.dimensions.y,
      this.dimensions.z,
      this.segments.width,
      this.segments.height,
      this.segments.depth
    );
    
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);

    this.metadata.type = "primitive";
    this.addTag("box");
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;

    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "cuboid",
      this.dimensions,
    );
  }

  setDimensions(width: number, height: number, depth: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.BoxGeometry(
      width, 
      height, 
      depth,
      this.segments.width,
      this.segments.height,
      this.segments.depth
    );
    this.mesh.geometry = this.geometry;
    (this.dimensions as any).set(width, height, depth);
    return this;
  }

  setSize(size: THREE.Vector3 | number): this {
    if (typeof size === "number") {
      return this.setDimensions(size, size, size);
    } else {
      return this.setDimensions(size.x, size.y, size.z);
    }
  }

  setSegments(widthSegments: number, heightSegments: number, depthSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.BoxGeometry(
      this.dimensions.x,
      this.dimensions.y,
      this.dimensions.z,
      widthSegments,
      heightSegments,
      depthSegments
    );
    this.mesh.geometry = this.geometry;
    (this.segments as any) = { width: widthSegments, height: heightSegments, depth: depthSegments };
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

  getGeometry(): THREE.BoxGeometry {
    return this.geometry;
  }

  // Convenience getters
  get width(): number { return this.dimensions.x; }
  get height(): number { return this.dimensions.y; }
  get depth(): number { return this.dimensions.z; }
  get size(): THREE.Vector3 { return this.dimensions.clone(); }
}
