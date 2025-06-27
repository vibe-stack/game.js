# Script System Improvements

## Problems Fixed

### 1. Script Instance Sharing Issue ✅ FIXED
**Problem**: Multiple entities using the same script shared the same compiled function instance, causing state contamination.

**Solution**: Created individual `ScriptInstance` objects for each entity-script combination. Each instance has:
- Its own isolated `state` object
- Fresh lifecycle functions created via factory pattern
- Independent error tracking
- Per-instance parameter storage

### 2. Parameter Mixing ✅ FIXED
**Problem**: Script parameters were getting mixed up when multiple scripts were attached to one entity.

**Solution**: 
- Removed complex nested Map structure for parameters
- Parameters are now stored directly in each script instance
- Each instance maintains its own isolated parameter set
- No more parameter contamination between entities or scripts

### 3. Script Interference ✅ FIXED
**Problem**: Multiple scripts on the same entity could interfere with each other's execution context.

**Solution**:
- Each script instance runs in its own isolated context
- Scripts can no longer accidentally modify shared variables
- Each script has its own `context.state` object for persistent data

## New Architecture

### ScriptInstance Interface
```typescript
export interface ScriptInstance {
  entityId: string;
  scriptId: string;
  lifecycle: ScriptLifecycle;
  isInitialized: boolean;
  hasErrors: boolean;
  lastError?: string;
  state: Record<string, any>; // Isolated state per instance
  parameters: EntityScriptParameters;
}
```

### Script Context Improvements
Scripts now have access to:
- `context.state` - Persistent state object unique to this entity-script combination
- `context.parameters` - Instance-specific parameters
- All previous context properties (entity, gameWorld, etc.)

## Usage Examples

### Script with Persistent State
```typescript
export function init(context) {
  // Each entity gets its own state object
  context.state.initialPosition = context.entity.position.clone();
  context.state.bounceHeight = 0;
}

export function update(context, deltaTime) {
  // State is isolated per entity-script instance
  context.state.bounceHeight += context.parameters.speed * deltaTime;
  
  const bounce = Math.sin(context.state.bounceHeight) * context.parameters.amplitude;
  context.entity.position.y = context.state.initialPosition.y + bounce;
}
```

### Multiple Scripts on One Entity
```typescript
// Movement Script
export function update(context, deltaTime) {
  context.state.moveTimer = (context.state.moveTimer || 0) + deltaTime;
  // This state won't interfere with other scripts
}

// Rotation Script  
export function update(context, deltaTime) {
  context.state.rotateTimer = (context.state.rotateTimer || 0) + deltaTime;
  // This state is completely separate from movement script
}
```

## Benefits

1. **True Script Isolation**: Each entity gets its own script instance with isolated state
2. **No Parameter Mixing**: Parameters are stored per instance, preventing contamination
3. **Better Error Handling**: Scripts can fail independently without affecting others
4. **Cleaner Memory Management**: Proper cleanup when scripts are detached
5. **Improved Performance**: No unnecessary script sharing overhead

## Migration Notes

Existing scripts will continue to work without changes. The improvements are backward compatible.

To take advantage of the new features:
- Use `context.state` for persistent data instead of global variables
- Each entity-script combination now has its own isolated execution environment
- Parameters are automatically isolated per instance

## Technical Implementation

- Script instances are keyed by `entityId:scriptId`
- Factory pattern creates fresh lifecycle functions for each instance
- Instance-specific state and parameters prevent contamination
- Proper cleanup when scripts are detached or entities are destroyed 