# Scene Loader System

The Scene Loader system provides a comprehensive solution for loading and saving GameWorld scenes from/to JSON format. It replaces the old component-based system with a fully integrated framework approach.

## Overview

The system consists of multiple specialized loaders:

- **SceneLoader**: Main orchestrator that coordinates all other loaders
- **EntityLoader**: Handles loading entities and their properties (CRITICAL: adds entities to game world first, then enables physics)
- **CameraLoader**: Manages camera setup and controls
- **LightingLoader**: Configures scene lighting
- **PhysicsLoader**: Sets up physics simulation parameters
- **SceneSerializer**: Converts GameWorld back to JSON format

## Basic Usage

### Loading a Scene (Proper Initialization Order)

```typescript
import { GameWorld, SceneLoader, DEMO_SCENE_DATA } from "@/models";

// Create GameWorld instance with proper configuration
const gameWorld = new GameWorld({
  canvas: canvasElement,
  enablePhysics: true,
  gravity: new THREE.Vector3(0, -9.81, 0),
  antialias: true,
  shadowMapEnabled: true,
});

// CRITICAL: Initialize WebGPU renderer before loading scene
await gameWorld.initialize();

// Load scene (this will clear existing content and load new scene)
const sceneLoader = new SceneLoader();
await sceneLoader.loadScene(gameWorld, DEMO_SCENE_DATA);

// Start the game world
gameWorld.start();
```

### Saving a Scene

```typescript
import { SceneSerializer } from "@/models";

const sceneSerializer = new SceneSerializer();
const sceneData = await sceneSerializer.serializeScene(gameWorld, "My Scene");

// Save to file or send to server
console.log(JSON.stringify(sceneData, null, 2));
```

## Critical Implementation Details

### Entity Loading Process

The EntityLoader follows this critical sequence to ensure physics colliders are properly created:

1. **Create Entity**: Instantiate the entity using proper constructors (e.g., `new Sphere()`, `new Box()`)
2. **Add to GameWorld**: Call `gameWorld.createEntity(entity)` to add the entity to the world
3. **Enable Physics**: Call physics methods like `entity.enableDynamicPhysics()` AFTER the entity is in the world

This order is essential because:
- The entity must be in the game world before physics can be enabled
- Physics colliders are created during the `enablePhysics()` calls
- The GameWorld provides the physics manager context needed for collider creation

### Material System Integration

Materials are loaded in the proper order:
1. Textures are loaded first
2. Materials are created and cached in the loader context
3. Entities reference materials by ID or have materials created inline

## Scene Data Format

The scene data follows this structure:

```typescript
interface SceneData {
  version: string;
  name: string;
  metadata: {
    created: number;
    lastModified: number;
    author?: string;
    description?: string;
  };
  cameras: CameraData[];
  lighting: LightingData;
  physics: PhysicsData;
  entities: EntityData[];
  materials: MaterialData[];
  textures: TextureData[];
}
```

## Supported Entity Types

The system supports loading the following entity types with full physics integration:

- `sphere` - Sphere geometry with physics colliders
- `box` - Box geometry with physics colliders
- `cylinder` - Cylinder geometry with physics colliders
- `cone` - Cone geometry with physics colliders
- `torus` - Torus geometry with physics colliders
- `capsule` - Capsule geometry with physics colliders
- `ring` - Ring geometry with physics colliders
- `plane` - Plane geometry with physics colliders
- `heightfield` - Terrain with complex collision meshes
- `mesh` - Generic mesh with custom geometry

## Physics Integration

Each entity can have physics properties that are properly applied:

```typescript
physics: {
  enabled: boolean;
  type: "static" | "dynamic" | "kinematic";
  mass?: number;          // For dynamic bodies
  restitution?: number;   // Bounciness (0-1)
  friction?: number;      // Surface friction (0-1)
  colliderShape?: string; // Shape of collision mesh
  colliderSize?: [number, number, number];
}
```

The physics system properly:
- Creates Rapier physics bodies and colliders
- Integrates with the GameWorld physics manager
- Supports debug rendering of collision shapes
- Handles all physics body types (static, dynamic, kinematic)

## Camera Controls

Cameras can have associated controls:

```typescript
controls: {
  type: "orbit" | "fly" | "first-person";
  enabled: boolean;
  properties: {
    // Control-specific properties
    enableDamping?: boolean;
    dampingFactor?: number;
    minDistance?: number;
    maxDistance?: number;
    // ... more properties
  };
}
```

## Lighting System

The lighting system supports:

- **Ambient Light**: Global illumination
- **Directional Light**: Sunlight-like directional lighting with shadows
- **Point Light**: Omnidirectional point lights with distance/decay
- **Spot Light**: Focused spot lights with angle/penumbra

All lights support shadow casting configuration with proper shadow map settings.

## Demo Scene

A demo scene (`DEMO_SCENE_DATA`) is provided that showcases:

- Multiple entity types with proper physics integration
- Dynamic and static objects with collision
- Complex lighting setup with shadows
- Camera with orbit controls
- Material variations and PBR properties

## Error Handling

The system includes comprehensive error handling:

- Invalid scene data validation
- Graceful degradation for missing assets
- Detailed error logging with context
- Rollback on partial load failures
- Physics initialization error recovery

## Common Issues and Solutions

### Physics Colliders Not Working
- **Problem**: Entities load but don't have physics collision
- **Solution**: Ensure GameWorld is initialized before loading scene
- **Cause**: Physics manager needs to be ready before entities are created

### Materials Not Applied
- **Problem**: Entities appear without textures or wrong colors
- **Solution**: Check material IDs match between materials array and entity references
- **Cause**: Material loading order or missing material definitions

### Cameras Not Working
- **Problem**: Scene loads but camera doesn't respond
- **Solution**: Verify camera has `active: true` and proper controls configuration
- **Cause**: No active camera set or controls not properly initialized

## Extension Points

The system is designed to be extensible:

- Add new entity types by extending `EntityLoader`
- Support new camera controls in `CameraLoader`
- Add new light types in `LightingLoader`
- Extend physics properties in `PhysicsLoader`

## Integration with Game Studio

The Game Studio page demonstrates the complete integration:

1. Initialize GameWorld with WebGPU renderer
2. Load scene using SceneLoader with proper error handling
3. Provide UI controls for scene management
4. Handle save/load operations with validation
5. Real-time scene manipulation with live updates 