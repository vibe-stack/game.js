# Geometry Rebuilding System

This document explains the generic geometry rebuilding system for 3D primitives that require mesh recreation when certain properties change.

## Overview

Many 3D primitives (Box, Sphere, Cylinder, etc.) have properties that cannot be updated without completely rebuilding the geometry. For example:
- Box dimensions (width, height, depth) and segments
- Sphere radius and segments  
- Cylinder radii, height, and segments

The geometry rebuilding system provides a generic solution that:
1. Automatically handles geometry disposal and recreation
2. Updates physics colliders when needed
3. Emits change events for React synchronization
4. Provides error handling and logging

## How It Works

### Base Entity Class

The `Entity` base class provides three key methods:

```typescript
// Define which properties require geometry rebuilding
protected getGeometryRebuildProperties(): string[]

// Implement geometry recreation logic
protected rebuildGeometry(): void

// Update a single property that may require rebuilding
protected updateGeometryProperty<T>(propertyName: string, newValue: T, updateFn: (value: T) => void): boolean

// Update multiple properties efficiently (rebuilds only once)
protected updateGeometryProperties(updates: Record<string, any>): boolean
```

### Implementing for New Primitives

To add geometry rebuilding support to a primitive:

1. **Override `getGeometryRebuildProperties()`** - Return array of property names that require rebuilding:

```typescript
protected getGeometryRebuildProperties(): string[] {
  return ['width', 'height', 'depth', 'widthSegments', 'heightSegments', 'depthSegments'];
}
```

2. **Override `rebuildGeometry()`** - Implement the geometry recreation logic:

```typescript
protected rebuildGeometry(): void {
  // Dispose old geometry
  if (this.geometry) {
    this.geometry.dispose();
  }
  
  // Create new geometry with current properties
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
```

3. **Add public update methods** - Provide clean APIs for property updates:

```typescript
setWidth(width: number): boolean {
  return this.updateGeometryProperty('width', width, (value) => {
    this.dimensions.x = value;
  });
}

setDimensions(width: number, height: number, depth: number): boolean {
  return this.updateGeometryProperties({
    width: width,
    height: height,
    depth: depth
  });
}
```

## Example Implementation

See `Box` and `Sphere` primitives for complete examples of this system in action.

### Box Example

```typescript
export class Box extends Entity {
  protected getGeometryRebuildProperties(): string[] {
    return ['width', 'height', 'depth', 'widthSegments', 'heightSegments', 'depthSegments'];
  }

  protected rebuildGeometry(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }
    
    this.geometry = new THREE.BoxGeometry(
      this.dimensions.x, this.dimensions.y, this.dimensions.z, 
      this.segments.width, this.segments.height, this.segments.depth
    );
    
    this.mesh.geometry = this.geometry;
  }

  setWidth(width: number): boolean {
    return this.updateGeometryProperty('width', width, (value) => {
      this.dimensions.x = value;
    });
  }
}
```

## UI Component Usage

In property components, use the primitive's update methods instead of manual geometry handling:

```typescript
const handleDimensionChange = (dimension: 'width' | 'height' | 'depth', value: number) => {
  let success = false;
  
  switch (dimension) {
    case 'width':
      success = entity.setWidth(value);
      break;
    // ...
  }
  
  if (success) {
    onUpdate();
  } else {
    console.warn(`Failed to update ${dimension} to ${value}`);
  }
};
```

## Benefits

- **Automatic cleanup**: Old geometry is properly disposed
- **Physics integration**: Colliders are recreated automatically
- **Error handling**: Failed updates are logged and handled gracefully
- **Performance**: Multiple property updates are batched into single rebuild
- **Consistency**: Same pattern works across all primitives
- **React integration**: Change events are emitted for UI synchronization

## Adding New Primitives

When creating new primitives that need geometry rebuilding:

1. Identify which properties require geometry recreation
2. Implement the three required methods
3. Add public update methods for each rebuildable property
4. Create property UI components that use the update methods
5. Test that geometry disposal, recreation, and physics work correctly 