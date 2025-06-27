import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface SphereConfig extends EntityConfig {
  radius?: number; widthSegments?: number; heightSegments?: number;
  material?: THREE.Material; castShadow?: boolean; receiveShadow?: boolean;
}

export class Sphere extends Entity {
  public radius: number;
  public segments: { width: number; height: number };
  private mesh: THREE.Mesh;
  private geometry: THREE.SphereGeometry;
  private material: THREE.Material;

  constructor(config: SphereConfig = {}) {
    super(config);
    this.radius = config.radius ?? 1;
    this.segments = { 
      width: config.widthSegments ?? 32, 
      height: config.heightSegments ?? 16 
    };
    this.material = config.material ?? new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.geometry = new THREE.SphereGeometry(this.radius, this.segments.width, this.segments.height);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);
    this.metadata.type = "sphere"; this.addTag("sphere");
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
      this.segments.width,
      this.segments.height
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
      this.segments.width = value;
    });
  }

  setHeightSegments(segments: number): boolean {
    return this.updateGeometryProperty('heightSegments', segments, (value) => {
      this.segments.height = value;
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
    return {
      id: this.entityId, name: this.entityName, type: "sphere",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      physics: this.serializePhysics(),
      characterController: this.serializeCharacterController(),
      geometry: { type: "SphereGeometry", parameters: { radius: this.radius } }
    };
  }

  protected createCollider(config: any): void {
    if (this.physicsManager && this.rigidBodyId) {
      // Use scaled radius to ensure collider matches visual size
      const scaledRadius = this.getScaledRadius(this.radius);
      this.physicsManager.createCollider(this.colliderId!, this.rigidBodyId, "ball", scaledRadius, config);
    }
  }
  
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