# Script System Integration

## Overview

The script system provides automatic compilation and execution of TypeScript scripts for game entities. Scripts are compiled from `scripts/` directory and cached in `.gamejs/scripts/compiled-scripts/`.

## Adding Scripts to Entities

### Via Object Inspector
1. **Select an entity** in the scene tree or viewport
2. **Open the Components section** in the Object Inspector (right panel)
3. **Click "Add Component"** → Scripting → Script
4. **Configure the script component**:
   - Select a script file from the dropdown
   - Enable/disable event handlers (init, update, lateUpdate, etc.)
   - Add custom parameters that will be passed to the script
   - Configure auto-start and debug mode

### Multiple Scripts Per Entity
- You can attach **multiple script components** to a single entity
- Each script runs independently with its own parameters and configuration
- Scripts can be enabled/disabled individually
- Execution order follows the component order in the inspector

## Script Structure

Scripts should export functions for different lifecycle events:

```typescript
// scripts/player-controller.ts
export function init(context: ScriptExecutionContext) {
  console.log(`Player controller initialized for entity: ${context.entity.id}`);
  console.log(`Available parameters:`, context.parameters);
}

export function update(context: ScriptExecutionContext) {
  const { entity, deltaTime, totalTime, parameters } = context;
  
  // Access custom parameters defined in the Object Inspector
  const speed = parameters.moveSpeed?.value || 5;
  const jumpHeight = parameters.jumpHeight?.value || 2;
  
  // Move the entity based on time
  if (entity.transform) {
    entity.transform.position.y = Math.sin(totalTime) * jumpHeight;
  }
}

export function destroy(context: ScriptExecutionContext) {
  console.log(`Player controller destroyed for entity: ${context.entity.id}`);
}
```

## Parameter Types

When adding parameters in the Object Inspector, you can choose from:

- **String**: Text values (e.g., "Hello World")
- **Number**: Numeric values (e.g., 5.5, -10, 0.1)
- **Boolean**: True/false values
- **Vector3**: 3D coordinates (e.g., {x: 1, y: 2, z: 3})
- **GameObject**: Reference to another entity by ID
- **Asset**: Reference to a game asset by ID

Example parameter configuration in Object Inspector:
```
Parameter Name: moveSpeed
Type: Number
Value: 5.5
Description: How fast the entity moves

Parameter Name: targetPosition  
Type: Vector3
Value: {x: 10, y: 0, z: -5}
Description: Where the entity should move to

Parameter Name: isActive
Type: Boolean  
Value: true
Description: Whether this behavior is active
```

## Event Handlers

Enable the event handlers you need in the Object Inspector:

- **init**: Called when the entity is created
- **update**: Called every frame during play mode
- **lateUpdate**: Called after all update calls
- **fixedUpdate**: Called at fixed intervals for physics
- **destroy**: Called when the entity is destroyed

## Features

### ✅ **File Watching & Auto-Compilation**
- Scripts are automatically compiled when saved
- Real-time error reporting in console
- TypeScript support with full type checking

### ✅ **Parameter System**
- Define custom parameters in the Object Inspector
- Type-safe parameter access in scripts
- Runtime parameter updates

### ✅ **Multiple Scripts Per Entity** 
- Attach multiple script components to one entity
- Each script has independent configuration
- Scripts execute in component order

### ✅ **Lifecycle Management**
- Scripts only run during "Play" mode
- Proper initialization and cleanup
- Event-based execution model

### ✅ **Development Tools**
- Script compilation status in Object Inspector
- Manual recompilation button
- Debug mode for enhanced logging
- Script refresh functionality

## Example Use Cases

### Character Controller
```typescript
// scripts/character-movement.ts
export function init(context) {
  console.log("Character controller ready");
}

export function update(context) {
  const { entity, parameters } = context;
  const speed = parameters.speed?.value || 1;
  
  // Apply movement logic
  if (entity.transform) {
    // Movement code here
  }
}
```

### Health System
```typescript
// scripts/health-system.ts  
export function init(context) {
  const maxHealth = context.parameters.maxHealth?.value || 100;
  // Initialize health
}

export function destroy(context) {
  // Cleanup health UI
}
```

### Collectible Item
```typescript
// scripts/collectible.ts
export function init(context) {
  const points = context.parameters.pointValue?.value || 10;
  const collectSound = context.parameters.soundEffect?.value;
}

export function update(context) {
  // Check for player collision
  // Trigger collection logic
}
```

## Tips

1. **Use descriptive parameter names** - they appear in the Object Inspector
2. **Add descriptions to parameters** - helps other developers understand usage  
3. **Enable only needed event handlers** - improves performance
4. **Use debug mode during development** - enables detailed logging
5. **Test with multiple scripts** - ensure they work together properly

## Script Component Configuration

```typescript
const scriptComponent: ScriptComponent = {
  id: "player-script-1",
  type: "script",
  enabled: true,
  properties: {
    scriptPath: "player-controller.ts", // relative to scripts/
    autoStart: true,
    parameters: {
      speed: { type: "number", value: 5.0, description: "Movement speed" },
      playerName: { type: "string", value: "Player1", description: "Player name" }
    },
    eventHandlers: {
      init: true,
      update: true,
      lateUpdate: false,
      fixedUpdate: true,
      destroy: true
    },
    timeScale: 1.0,
    debugMode: true
  }
};
```

## Execution Context

Scripts receive a context object with:

- `entity: GameObject` - The entity this script is attached to
- `scene: GameScene` - The current scene
- `deltaTime: number` - Time since last frame
- `totalTime: number` - Total time since play started
- `parameters: Record<string, any>` - Parameters defined in component
- `timeScale: number` - Time scale multiplier
- `debugMode: boolean` - Whether debug logging is enabled

## Lifecycle Events

1. **init** - Called when play mode starts and `autoStart` is true
2. **update** - Called every frame during play mode
3. **lateUpdate** - Called after all update methods complete
4. **fixedUpdate** - Called at fixed intervals (60 FPS) for physics
5. **destroy** - Called when play mode stops or entity is destroyed

## File Watching

The system automatically:
- Watches `scripts/` directory for `.ts` files
- Compiles scripts using esbuild when they change
- Supports imports from other scripts and npm packages
- Generates source maps for debugging
- Caches compiled scripts in `.gamejs/scripts/compiled-scripts/`

## Usage in Editor

1. Scripts are automatically compiled when you save `.ts` files in `scripts/`
2. Add a `ScriptComponent` to any entity
3. Set the `scriptPath` to your script file
4. Configure which event handlers to enable
5. Press Play to start script execution
6. Scripts will run based on entity lifecycle and physics state 