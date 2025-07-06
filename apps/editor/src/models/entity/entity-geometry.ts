import * as THREE from "three/webgpu";

export class EntityGeometry {
  private entity: THREE.Object3D;
  private emitChange: () => void;

  constructor(
    entity: THREE.Object3D,
    emitChange: () => void
  ) {
    this.entity = entity;
    this.emitChange = emitChange;
  }

  /**
   * Properties that require geometry rebuilding when changed.
   * Override this in subclasses to define which properties need rebuilding.
   */
  public getGeometryRebuildProperties(): string[] {
    return [];
  }

  /**
   * Rebuild the geometry of this entity.
   * Override this in subclasses that have rebuildable geometry.
   */
  public rebuildGeometry(): void {
    // Default implementation does nothing
    // Subclasses should override this to handle their specific geometry rebuilding
  }

  /**
   * Generic method to update a property that may require geometry rebuilding.
   * This handles the disposal, recreation, and change notification automatically.
   */
  public updateGeometryProperty<T>(
    propertyName: string, 
    newValue: T, 
    updateFn: (value: T) => void,
    onPhysicsRecreate?: () => void
  ): boolean {
    const rebuildProperties = this.getGeometryRebuildProperties();
    const requiresRebuild = rebuildProperties.includes(propertyName);
    
    try {
      if (requiresRebuild) {
        // Call the update function (which should modify internal state)
        updateFn(newValue);
        
        // Rebuild geometry
        this.rebuildGeometry();
        
        // Recreate physics collider if callback provided
        if (onPhysicsRecreate) {
          onPhysicsRecreate();
        }
      } else {
        // Just update the property normally
        updateFn(newValue);
      }
      
      // Emit change for React synchronization
      this.emitChange();
      return true;
    } catch (error) {
      console.error(`Failed to update property ${propertyName}:`, error);
      return false;
    }
  }

  /**
   * Convenience method to update multiple geometry properties at once.
   * This is more efficient than updating them individually as it only rebuilds once.
   */
  public updateGeometryProperties(
    updates: Record<string, any>,
    onPhysicsRecreate?: () => void
  ): boolean {
    const rebuildProperties = this.getGeometryRebuildProperties();
    const requiresRebuild = Object.keys(updates).some(key => rebuildProperties.includes(key));
    
    try {
      // Apply all updates first
      Object.entries(updates).forEach(([key, value]) => {
        // This assumes a direct property assignment, but could be customized
        (this.entity as any)[key] = value;
      });
      
      if (requiresRebuild) {
        // Rebuild geometry once after all updates
        this.rebuildGeometry();
        
        // Recreate physics collider if callback provided
        if (onPhysicsRecreate) {
          onPhysicsRecreate();
        }
      }
      
      // Emit change for React synchronization
      this.emitChange();
      return true;
    } catch (error) {
      console.error(`Failed to update properties:`, error);
      return false;
    }
  }

  /**
   * Helper method to get scaled dimensions for physics colliders
   */
  public getScaledDimensions(baseDimensions: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      baseDimensions.x * this.entity.scale.x,
      baseDimensions.y * this.entity.scale.y,
      baseDimensions.z * this.entity.scale.z
    );
  }

  /**
   * Helper method to get scaled radius for spherical colliders
   */
  public getScaledRadius(baseRadius: number): number {
    return baseRadius * Math.max(this.entity.scale.x, this.entity.scale.y, this.entity.scale.z);
  }
} 