import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface BoxConfig extends EntityConfig {
  width?: number; height?: number; depth?: number; size?: THREE.Vector3 | number;
  widthSegments?: number; heightSegments?: number; depthSegments?: number;
  material?: THREE.Material; castShadow?: boolean; receiveShadow?: boolean;
}

export class Box extends Entity {
  public readonly dimensions: THREE.Vector3;
  public readonly segments: { width: number; height: number; depth: number };
  private mesh: THREE.Mesh;
  private geometry: THREE.BoxGeometry;
  private material: THREE.Material;

  constructor(config: BoxConfig = {}) {
    super(config);
    let width = config.width ?? 1; let height = config.height ?? 1; let depth = config.depth ?? 1;
    if (config.size) { if (typeof config.size === "number") { width = height = depth = config.size; } else { width = config.size.x; height = config.size.y; depth = config.size.z; } }
    this.dimensions = new THREE.Vector3(width, height, depth);
    this.segments = { width: config.widthSegments ?? 1, height: config.heightSegments ?? 1, depth: config.depthSegments ?? 1 };
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.geometry = new THREE.BoxGeometry(this.dimensions.x, this.dimensions.y, this.dimensions.z, this.segments.width, this.segments.height, this.segments.depth);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    this.metadata.type = "box"; this.addTag("box");
  }

  protected getGeometryRebuildProperties(): string[] {
    return ['width', 'height', 'depth', 'widthSegments', 'heightSegments', 'depthSegments'];
  }

  protected rebuildGeometry(): void {
    // Dispose old geometry
    if (this.geometry) {
      this.geometry.dispose();
    }
    
    // Create new geometry with current dimensions and segments
    this.geometry = new THREE.BoxGeometry(
      this.dimensions.x, 
      this.dimensions.y, 
      this.dimensions.z, 
      this.segments.width, 
      this.segments.height, 
      this.segments.depth
    );
    
    // Update mesh geometry
    this.mesh.geometry = this.geometry;
  }

  // Public methods to update dimensions
  setWidth(width: number): boolean {
    return this.updateGeometryProperty('width', width, (value) => {
      this.dimensions.x = value;
    });
  }

  setHeight(height: number): boolean {
    return this.updateGeometryProperty('height', height, (value) => {
      this.dimensions.y = value;
    });
  }

  setDepth(depth: number): boolean {
    return this.updateGeometryProperty('depth', depth, (value) => {
      this.dimensions.z = value;
    });
  }

  setDimensions(width: number, height: number, depth: number): boolean {
    return this.updateGeometryProperties({
      width: width,
      height: height,
      depth: depth
    });
  }

  // Public methods to update segments
  setWidthSegments(segments: number): boolean {
    return this.updateGeometryProperty('widthSegments', segments, (value) => {
      this.segments.width = value;
    });
  }

  setHeightSegments(segments: number): boolean {
    return this.updateGeometryProperty('heightSegments', segments, (value) => {
      this.segments.height = value;
    });
  }

  setDepthSegments(segments: number): boolean {
    return this.updateGeometryProperty('depthSegments', segments, (value) => {
      this.segments.depth = value;
    });
  }

  setSegments(width: number, height: number, depth: number): boolean {
    return this.updateGeometryProperties({
      widthSegments: width,
      heightSegments: height,
      depthSegments: depth
    });
  }

  // Convenience method to update both dimensions and segments
  updateGeometry(config: Partial<{
    width: number; height: number; depth: number;
    widthSegments: number; heightSegments: number; depthSegments: number;
  }>): boolean {
    const updates: Record<string, any> = {};
    
    if (config.width !== undefined) updates.width = config.width;
    if (config.height !== undefined) updates.height = config.height;
    if (config.depth !== undefined) updates.depth = config.depth;
    if (config.widthSegments !== undefined) updates.widthSegments = config.widthSegments;
    if (config.heightSegments !== undefined) updates.heightSegments = config.heightSegments;
    if (config.depthSegments !== undefined) updates.depthSegments = config.depthSegments;
    
    return this.updateGeometryProperties(updates);
  }

  serialize(): EntityData {
    return {
      id: this.entityId, name: this.entityName, type: "box",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      physics: this.serializePhysics(),
      characterController: this.serializeCharacterController(),
      geometry: { type: "BoxGeometry", parameters: { width: this.width, height: this.height, depth: this.depth } }
    };
  }

  protected createCollider(config: any): void {
    if (this.physicsManager && this.rigidBodyId) {
      // Use scaled dimensions to ensure collider matches visual size
      const scaledDimensions = this.getScaledDimensions(this.dimensions);
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "cuboid", scaledDimensions, config);
    }
  }

  get width(): number { return this.dimensions.x; }
  get height(): number { return this.dimensions.y; }
  get depth(): number { return this.dimensions.z; }
  get size(): THREE.Vector3 { return this.dimensions.clone(); }
  getMesh(): THREE.Mesh { return this.mesh; }
  getMaterial(): THREE.Material { return this.material; }
  setMaterial(material: THREE.Material): void { 
    this.material = material; 
    this.mesh.material = material;
    this.emitChange(); // Trigger change event for UI updates
  }

  setShadowSettings(castShadow: boolean, receiveShadow: boolean): this {
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.emitChange(); // Trigger change event for UI updates
    return this;
  }
}