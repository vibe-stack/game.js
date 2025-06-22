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
  public readonly dimensions: { width: number; height: number };
  public readonly segments: { width: number; height: number };
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;

  constructor(config: PlaneConfig = {}) {
    super(config);
    
    this.dimensions = {
      width: config.width ?? 1,
      height: config.height ?? 1
    };
    
    this.segments = {
      width: config.widthSegments ?? 1,
      height: config.heightSegments ?? 1
    };
    
    const material = config.material ?? new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    
    this.geometry = new THREE.PlaneGeometry(
      this.dimensions.width,
      this.dimensions.height,
      this.segments.width,
      this.segments.height
    );
    
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? false;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    
    this.metadata.type = "primitive";
    this.addTag("plane");
  }

  protected createCollider(config: any): void {
    if (!this.physicsManager || !this.rigidBodyId) return;
    
    // Create a thin box collider for the plane
    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "cuboid",
      new THREE.Vector3(this.dimensions.width, 0.01, this.dimensions.height),
      config
    );
  }

  setDimensions(width: number, height: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(
      width,
      height,
      this.segments.width,
      this.segments.height
    );
    this.mesh.geometry = this.geometry;
    (this.dimensions as any).width = width;
    (this.dimensions as any).height = height;
    return this;
  }

  setSegments(widthSegments: number, heightSegments: number): this {
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(
      this.dimensions.width,
      this.dimensions.height,
      widthSegments,
      heightSegments
    );
    this.mesh.geometry = this.geometry;
    (this.segments as any).width = widthSegments;
    (this.segments as any).height = heightSegments;
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

  getGeometry(): THREE.PlaneGeometry {
    return this.geometry;
  }

  // Convenience getters
  get width(): number { return this.dimensions.width; }
  get height(): number { return this.dimensions.height; }

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
    return {
      id: this.entityId, name: this.entityName, type: "plane",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      physics: this.serializePhysics(),
      characterController: this.serializeCharacterController(),
      geometry: { type: "PlaneGeometry", parameters: { width: this.dimensions.width, height: this.dimensions.height, widthSegments: this.segments.width, heightSegments: this.segments.height } }
    };
  }
} 