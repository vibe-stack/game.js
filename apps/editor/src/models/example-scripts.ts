/**
 * Example scripts demonstrating the scripting system capabilities
 * These can be used as templates or for testing the script system
 */

export const EXAMPLE_SCRIPTS = {
  // Simple rotation script
  simpleRotation: {
    id: 'simple-rotation',
    name: 'Simple Rotation',
    code: `
export function init(context) {
  // Store initial rotation
  context.entity.userData.rotationSpeed = 1.0;
}

export function update(context, deltaTime) {
  // Rotate the entity continuously
  const speed = context.entity.userData.rotationSpeed || 1.0;
  context.entity.rotation.y += speed * deltaTime;
  
  // Note: Physics body transform will be automatically synced
  // after this script executes, so both visual and physics
  // representations will stay in sync
}
`,
    enabled: true,
    priority: 0
  },

  // Physics-based movement
  physicsMovement: {
    id: 'physics-movement',
    name: 'Physics Movement',
    code: `
export function init(context) {
  // Ensure entity has physics enabled
  if (!context.entity.hasPhysics()) {
    context.entity.enableDynamicPhysics(1.0, 0.5, 0.7);
  }
}

export function update(context, deltaTime) {
  const input = context.inputManager;
  const force = 10.0;
  
  const forceVector = { x: 0, y: 0, z: 0 };
  
  if (input.isKeyPressed('KeyW')) forceVector.z -= force;
  if (input.isKeyPressed('KeyS')) forceVector.z += force;
  if (input.isKeyPressed('KeyA')) forceVector.x -= force;
  if (input.isKeyPressed('KeyD')) forceVector.x += force;
  if (input.isKeyPressed('Space')) forceVector.y += force * 2;
  
  if (forceVector.x !== 0 || forceVector.y !== 0 || forceVector.z !== 0) {
    context.entity.applyForce(new THREE.Vector3(forceVector.x, forceVector.y, forceVector.z));
  }
}
`,
    enabled: true,
    priority: 0
  },

  // Health system
  healthSystem: {
    id: 'health-system',
    name: 'Health System',
    code: `
let maxHealth = 100;
let currentHealth = 100;

export function init(context) {
  // Initialize health
  maxHealth = context.entity.userData.maxHealth || 100;
  currentHealth = maxHealth;
  
  // Store health in entity for external access
  context.entity.userData.health = currentHealth;
  context.entity.userData.maxHealth = maxHealth;
  
  // Tag as damageable
  context.entity.addTag('damageable');
}

export function update(context, deltaTime) {
  // Update health display or effects
  const healthPercent = currentHealth / maxHealth;
  
  // Change color based on health
  if (context.entity.material) {
    if (healthPercent > 0.6) {
      context.entity.material.color.setHex(0x00ff00); // Green
    } else if (healthPercent > 0.3) {
      context.entity.material.color.setHex(0xffff00); // Yellow
    } else {
      context.entity.material.color.setHex(0xff0000); // Red
    }
  }
  
  // Check for death
  if (currentHealth <= 0) {
    // Play death sound
    if (context.playSound) {
      context.playSound('death-sound');
    }
    
    // Destroy entity
    context.destroyEntity(context.entity.entityId);
  }
}

// Custom function to take damage (can be called from other scripts)
export function takeDamage(amount) {
  currentHealth = Math.max(0, currentHealth - amount);
  context.entity.userData.health = currentHealth;
}

// Custom function to heal
export function heal(amount) {
  currentHealth = Math.min(maxHealth, currentHealth + amount);
  context.entity.userData.health = currentHealth;
}
`,
    enabled: true,
    priority: 1
  },

  // Simple AI behavior
  simpleAI: {
    id: 'simple-ai',
    name: 'Simple AI',
    code: `
let target = null;
let state = 'idle';
let stateTimer = 0;

export function init(context) {
  // Find targets with 'player' tag
  const players = context.findEntitiesByTag('player');
  if (players.length > 0) {
    target = players[0];
  }
  
  // Tag as AI entity
  context.entity.addTag('ai');
}

export function update(context, deltaTime) {
  if (!target) return;
  
  stateTimer += deltaTime;
  const entity = context.entity;
  const distance = entity.position.distanceTo(target.position);
  
  switch (state) {
    case 'idle':
      if (distance < 10.0) {
        state = 'chase';
        stateTimer = 0;
      }
      break;
      
    case 'chase':
      if (distance > 15.0) {
        state = 'idle';
        stateTimer = 0;
      } else if (distance < 3.0) {
        state = 'attack';
        stateTimer = 0;
      } else {
        // Move towards target
        const direction = target.position.clone().sub(entity.position).normalize();
        entity.position.add(direction.multiplyScalar(5 * deltaTime));
      }
      break;
      
    case 'attack':
      if (stateTimer > 1.0) { // Attack duration
        if (distance < 3.0) {
          // Deal damage to target if it has health system
          if (target.userData.health !== undefined) {
            target.userData.health -= 10;
          }
          
          // Play attack sound
          if (context.playSound) {
            context.playSound('attack-sound');
          }
        }
        
        state = 'cooldown';
        stateTimer = 0;
      }
      break;
      
    case 'cooldown':
      if (stateTimer > 2.0) { // Cooldown duration
        state = distance < 10.0 ? 'chase' : 'idle';
        stateTimer = 0;
      }
      break;
  }
  
  // Store state for debugging
  entity.userData.aiState = state;
}

export function destroy(context) {
  target = null;
}
`,
    enabled: true,
    priority: 0
  },

  // Collectible item
  collectible: {
    id: 'collectible',
    name: 'Collectible Item',
    code: `
let isCollected = false;

export function init(context) {
  const entity = context.entity;
  
  // Tag as collectible
  entity.addTag('collectible');
  
  // Set up interaction
  entity.onClick(async () => {
    if (isCollected) return;
    
    isCollected = true;
    
    // Play collection sound
    if (context.playSound) {
      await context.playSound('collect-sound');
    }
    
    // Add to inventory (using state manager)
    const state = context.stateManager;
    const inventory = state.get('inventory') || [];
    inventory.push({
      id: entity.entityId,
      name: entity.entityName,
      type: 'collectible',
      collectedAt: context.currentTime
    });
    state.set('inventory', inventory);
    
    // Destroy the item
    context.destroyEntity(entity.entityId);
  });
}

export function update(context, deltaTime) {
  if (isCollected) return;
  
  // Float animation
  const time = context.currentTime;
  const originalY = context.entity.userData.originalY;
  
  if (originalY === undefined) {
    context.entity.userData.originalY = context.entity.position.y;
  } else {
    context.entity.position.y = originalY + Math.sin(time * 2) * 0.2;
  }
  
  // Rotate
  context.entity.rotation.y += deltaTime;
}
`,
    enabled: true,
    priority: 0
  },

  // Spawner system
  spawner: {
    id: 'spawner',
    name: 'Entity Spawner',
    code: `
let spawnTimer = 0;
let spawnInterval = 3.0; // Spawn every 3 seconds
let maxSpawns = 5;
let currentSpawns = 0;

export function init(context) {
  // Tag as spawner
  context.entity.addTag('spawner');
  
  // Configure spawner
  spawnInterval = context.entity.userData.spawnInterval || 3.0;
  maxSpawns = context.entity.userData.maxSpawns || 5;
}

export function update(context, deltaTime) {
  spawnTimer += deltaTime;
  
  if (spawnTimer >= spawnInterval && currentSpawns < maxSpawns) {
    spawnTimer = 0;
    currentSpawns++;
    
    // Create a new entity (this would typically be a specific entity type)
    // For this example, we'll create a basic sphere
    const spawnedEntity = context.spawnEntity(new Sphere({
      radius: 0.5,
      position: context.entity.position.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          1,
          (Math.random() - 0.5) * 4
        )
      )
    }));
    
    // Tag the spawned entity so we can track it
    spawnedEntity.addTag('spawned');
    spawnedEntity.userData.spawnerId = context.entity.entityId;
    
    // Attach a simple script to the spawned entity
    spawnedEntity.attachScript('simple-rotation');
  }
  
  // Clean up destroyed spawns
  const spawnedEntities = context.findEntitiesByTag('spawned');
  const aliveSpawns = spawnedEntities.filter(e => 
    e.userData.spawnerId === context.entity.entityId && !e.isDestroyed()
  );
  currentSpawns = aliveSpawns.length;
  
  // Store spawn count for debugging
  context.entity.userData.currentSpawns = currentSpawns;
}
`,
    enabled: true,
    priority: 0
  },

  // Day/night cycle
  dayNightCycle: {
    id: 'day-night-cycle',
    name: 'Day/Night Cycle',
    code: `
let cycleTime = 0;
let cycleDuration = 60.0; // 60 seconds for full cycle

export function init(context) {
  // This script should be attached to a directional light representing the sun
  cycleDuration = context.entity.userData.cycleDuration || 60.0;
}

export function update(context, deltaTime) {
  cycleTime += deltaTime;
  
  // Calculate time of day (0 = midnight, 0.5 = noon)
  const timeOfDay = (cycleTime % cycleDuration) / cycleDuration;
  
  // Calculate sun angle (0 = horizon, PI/2 = zenith)
  const sunAngle = Math.sin(timeOfDay * Math.PI * 2) * Math.PI / 2;
  
  // Set light direction
  const entity = context.entity;
  if (entity.isDirectionalLight) {
    // Update light direction based on sun angle
    entity.position.set(
      Math.cos(timeOfDay * Math.PI * 2) * 100,
      Math.sin(timeOfDay * Math.PI * 2) * 100,
      0
    );
    entity.lookAt(0, 0, 0);
    
    // Update light intensity based on time of day
    const intensity = Math.max(0.1, Math.sin(timeOfDay * Math.PI * 2));
    entity.intensity = intensity;
    
    // Update light color (warm at sunrise/sunset, cool at noon)
    const warmth = Math.abs(timeOfDay - 0.5) * 2; // 0 at noon, 1 at sunrise/sunset
    entity.color.setRGB(
      1.0,
      1.0 - warmth * 0.3,
      1.0 - warmth * 0.6
    );
  }
  
  // Update global state for other scripts to use
  context.stateManager.set('timeOfDay', timeOfDay);
  context.stateManager.set('isDay', timeOfDay > 0.25 && timeOfDay < 0.75);
}
`,
    enabled: true,
    priority: -1 // Run early so other scripts can use the time data
  },

  // Transform manipulation script showing both approaches
  transformManipulation: {
    id: 'transform-manipulation',
    name: 'Transform Manipulation',
    code: `
export function init(context) {
  context.entity.userData.oscillationTime = 0;
}

export function update(context, deltaTime) {
  context.entity.userData.oscillationTime += deltaTime;
  const time = context.entity.userData.oscillationTime;
  
  // Method 1: Direct property modification
  // Physics sync happens automatically after script execution
  context.entity.position.y = Math.sin(time * 2) * 2;
  context.entity.rotation.x = Math.sin(time) * 0.3;
  
  // Method 2: Using entity setter methods (also works)
  // These immediately sync physics transforms
  // context.entity.setPosition(
  //   context.entity.position.x,
  //   Math.sin(time * 2) * 2,
  //   context.entity.position.z
  // );
  // context.entity.setRotation(Math.sin(time) * 0.3, 0, 0);
}
`,
    enabled: true,
    priority: 0
  },

  // Oscillated movement with configurable parameters
  oscillatedMove: {
    id: 'oscillated-move',
    name: 'Oscillated Move',
    code: `
let time = 0;
let initialPosition = null;

export function init(context) {
  // Store the initial position
  initialPosition = context.entity.position.clone();
  time = 0;
  
  console.log('Oscillated Move script initialized for:', context.entity.entityName);
}

export function update(context, deltaTime) {
  if (!initialPosition) return;
  
  // Get parameters from entity script parameters (will be set by UI)
  const scriptManager = context.gameWorld.getScriptManager();
  const params = scriptManager.getScriptParametersWithDefaults(context.entity.entityId, 'oscillated-move');
  
  const axis = params.axis || 'x';
  const maxDistance = params.maxDistance || 2.0;
  const speed = params.speed || 1.0;
  
  time += deltaTime * speed;
  
  // Calculate oscillation value
  const oscillationValue = Math.sin(time) * maxDistance;
  
  // Apply oscillation on the specified axis
  const newPosition = initialPosition.clone();
  switch (axis) {
    case 'x':
      newPosition.x += oscillationValue;
      break;
    case 'y':
      newPosition.y += oscillationValue;
      break;
    case 'z':
      newPosition.z += oscillationValue;
      break;
  }
  
  context.entity.position.copy(newPosition);
}

export function destroy(context) {
  console.log('Oscillated Move script destroyed for:', context.entity.entityName);
}
`,
    enabled: true,
    priority: 0,
    parameters: [
      {
        name: 'axis',
        type: 'select' as const,
        defaultValue: 'x',
        options: ['x', 'y', 'z'],
        description: 'The axis along which to oscillate'
      },
      {
        name: 'maxDistance',
        type: 'number' as const,
        defaultValue: 2.0,
        min: 0.1,
        max: 10.0,
        step: 0.1,
        description: 'Maximum distance from center position'
      },
      {
        name: 'speed',
        type: 'number' as const,
        defaultValue: 1.0,
        min: 0.1,
        max: 5.0,
        step: 0.1,
        description: 'Speed of oscillation'
      }
    ]
  },
};

/**
 * Helper function to get a script configuration by ID
 */
export function getExampleScript(scriptId: string) {
  return EXAMPLE_SCRIPTS[scriptId as keyof typeof EXAMPLE_SCRIPTS];
}

/**
 * Helper function to get all example script IDs
 */
export function getExampleScriptIds(): string[] {
  return Object.keys(EXAMPLE_SCRIPTS);
}

/**
 * Helper function to compile all example scripts in a ScriptManager
 */
export function loadExampleScripts(scriptManager: any) {
  const loadedScripts: string[] = [];
  
  for (const scriptData of Object.values(EXAMPLE_SCRIPTS)) {
    try {
      scriptManager.compileScript(scriptData);
      loadedScripts.push(scriptData.id);
    } catch (error) {
      console.error(`Failed to load example script ${scriptData.id}:`, error);
    }
  }
  
  return loadedScripts;
} 