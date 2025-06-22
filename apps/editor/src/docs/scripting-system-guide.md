# Scripting System Guide

The script system allows you to attach JavaScript code to entities that runs during the game lifecycle. Scripts can access and modify all aspects of the game world, including spawning entities, playing sounds, switching scenes, and more.

## Basic Usage

### 1. Creating a Script

Scripts are defined as strings containing JavaScript code with specific lifecycle functions:

```javascript
// Simple movement script
const movementScriptCode = `
export function init(context) {
  // Called once when the script is attached to an entity
  console.log('Movement script initialized for entity:', context.entity.entityName);
  
  // Store initial position
  context.entity.userData.initialPosition = context.entity.position.clone();
}

export function update(context, deltaTime) {
  // Called every frame
  const speed = 5.0;
  const time = context.currentTime;
  
  // Move the entity in a sine wave pattern
  const x = Math.sin(time) * speed;
  context.entity.position.x = context.entity.userData.initialPosition.x + x;
}

export function fixedUpdate(context, fixedDeltaTime) {
  // Called at fixed intervals (60 FPS by default)
  // Good for physics-related updates
}

export function destroy(context) {
  // Called when the entity is destroyed or script is detached
  console.log('Movement script destroyed for entity:', context.entity.entityName);
}
`;
```

### 2. Compiling and Attaching Scripts

```javascript
import { GameWorld, ScriptManager } from './models';

// Get the script manager from your game world
const gameWorld = new GameWorld(config);
const scriptManager = gameWorld.getScriptManager();

// Compile the script
const scriptConfig = {
  id: 'movement-script',
  name: 'Movement Script',
  code: movementScriptCode,
  enabled: true,
  priority: 0 // Lower numbers run first
};

const compiledScript = scriptManager.compileScript(scriptConfig);

// Attach to an entity
const entity = new SomeEntity();
gameWorld.createEntity(entity);
entity.attachScript('movement-script');
```

## Script Context

Every script function receives a `context` object that provides access to the entire game world:

```javascript
export function update(context, deltaTime) {
  // Entity reference
  const entity = context.entity;
  
  // Game world access
  const gameWorld = context.gameWorld;
  const scene = context.scene;
  
  // System managers
  const physics = context.physicsManager;
  const state = context.stateManager;
  const camera = context.cameraManager;
  const input = context.inputManager;
  
  // Optional managers (if set up)
  const sceneManager = context.sceneManager;
  const soundManager = context.soundManager;
  const assetManager = context.assetManager;
  
  // Utility functions
  const spawnedEntity = context.spawnEntity(new SomeEntity());
  context.destroyEntity('some-entity-id');
  const foundEntity = context.findEntity('entity-id');
  const enemies = context.findEntitiesByTag('enemy');
  
  // Scene management
  if (context.switchScene) {
    await context.switchScene('level-2');
  }
  
  // Sound management
  if (context.playSound) {
    await context.playSound('explosion-sound');
  }
  
  // Time and frame info
  const deltaTime = context.deltaTime;
  const fixedDeltaTime = context.fixedDeltaTime;
  const currentTime = context.currentTime;
  const frameCount = context.frameCount;
}
```

## Advanced Examples

### Character Controller Script

```javascript
const characterControllerScript = `
export function init(context) {
  // Enable character controller on the entity
  context.entity.enableCharacterController({
    maxSpeed: 10.0,
    jumpForce: 15.0,
    sprintMultiplier: 2.0
  });
}

export function update(context, deltaTime) {
  const input = context.inputManager;
  const entity = context.entity;
  
  // Get input state
  const movement = new THREE.Vector3();
  
  if (input.isKeyPressed('KeyW')) movement.z -= 1;
  if (input.isKeyPressed('KeyS')) movement.z += 1;
  if (input.isKeyPressed('KeyA')) movement.x -= 1;
  if (input.isKeyPressed('KeyD')) movement.x += 1;
  
  // Apply movement
  if (movement.length() > 0) {
    movement.normalize();
    entity.setVelocity(movement.multiplyScalar(10));
  }
  
  // Jump
  if (input.isKeyPressed('Space')) {
    entity.applyImpulse(new THREE.Vector3(0, 15, 0));
  }
}
`;
```

### Enemy AI Script

```javascript
const enemyAIScript = `
let target = null;
let attackCooldown = 0;

export function init(context) {
  // Find the player
  const players = context.findEntitiesByTag('player');
  if (players.length > 0) {
    target = players[0];
  }
}

export function update(context, deltaTime) {
  if (!target) return;
  
  const entity = context.entity;
  const distance = entity.position.distanceTo(target.position);
  
  // Chase behavior
  if (distance > 2.0) {
    const direction = target.position.clone().sub(entity.position).normalize();
    entity.position.add(direction.multiplyScalar(5 * deltaTime));
  }
  
  // Attack behavior
  if (distance < 2.0 && attackCooldown <= 0) {
    // Spawn projectile
    const projectile = context.spawnEntity(new ProjectileEntity());
    projectile.position.copy(entity.position);
    
    const direction = target.position.clone().sub(entity.position).normalize();
    projectile.setVelocity(direction.multiplyScalar(20));
    
    // Play attack sound
    if (context.playSound) {
      context.playSound('enemy-attack');
    }
    
    attackCooldown = 1.0; // 1 second cooldown
  }
  
  if (attackCooldown > 0) {
    attackCooldown -= deltaTime;
  }
}

export function destroy(context) {
  // Clean up any references
  target = null;
}
`;
```

## Script Management

### Enable/Disable Scripts

```javascript
// Disable a script temporarily
scriptManager.setScriptEnabled('movement-script', false);

// Re-enable it
scriptManager.setScriptEnabled('movement-script', true);
```

### Remove Scripts

```javascript
// Detach from specific entity
entity.detachScript('movement-script');

// Remove script completely
scriptManager.removeScript('movement-script');
```

### Performance Monitoring

```javascript
// Get performance metrics for a script
const metrics = scriptManager.getScriptPerformance('movement-script');
console.log('Average execution time:', metrics.averageTime);
console.log('Max execution time:', metrics.maxTime);
console.log('Call count:', metrics.callCount);

// Get all performance metrics
const allMetrics = scriptManager.getAllPerformanceMetrics();
```

## Best Practices

1. **Keep scripts small and focused** - Each script should handle one specific behavior
2. **Use priority carefully** - Lower priority numbers run first, use this for dependencies
3. **Clean up resources** - Always clean up in the `destroy` function
4. **Cache references** - Store commonly used objects in script-local variables
5. **Use fixed update for physics** - Physics-related code should go in `fixedUpdate`
6. **Handle edge cases** - Always check if managers exist before using them
7. **Performance monitoring** - Use the performance metrics to identify slow scripts 