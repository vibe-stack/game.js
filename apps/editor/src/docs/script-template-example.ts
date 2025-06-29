/**
 * Example Game Script Template
 * 
 * This template shows how to create scripts for the Game.js engine.
 * Scripts are written in TypeScript and are compiled on-the-fly.
 * 
 * Scripts can:
 * - Import npm packages from your project's node_modules
 * - Import other scripts from your scripts folder
 * - Export parameters that can be configured in the editor
 * - Access the full Three.js API
 * - Interact with the game world, physics, input, and more
 */

import * as THREE from 'three';
// You can import any npm package installed in your project
// import { gsap } from 'gsap';
// import { noise } from '@chriscourses/perlin-noise';

// You can also import other scripts
// import { utils } from './utils';
// import { SharedBehavior } from './behaviors/shared-behavior';

/**
 * Script Parameters
 * Export an array of parameters that can be configured in the editor.
 * These values can be adjusted per entity instance without modifying code.
 */
export const parameters = [
  {
    name: 'speed',
    type: 'number' as const,
    defaultValue: 5,
    min: 0,
    max: 20,
    step: 0.5,
    description: 'Movement speed of the entity'
  },
  {
    name: 'rotationSpeed',
    type: 'number' as const,
    defaultValue: 1,
    min: 0,
    max: 10,
    step: 0.1,
    description: 'Rotation speed in radians per second'
  },
  {
    name: 'jumpForce',
    type: 'number' as const,
    defaultValue: 10,
    min: 0,
    max: 50,
    step: 1,
    description: 'Upward force applied when jumping'
  },
  {
    name: 'enableRotation',
    type: 'boolean' as const,
    defaultValue: true,
    description: 'Whether the entity should rotate'
  },
  {
    name: 'targetTag',
    type: 'string' as const,
    defaultValue: 'player',
    description: 'Tag of entities to track'
  },
  {
    name: 'color',
    type: 'string' as const,
    defaultValue: '#ff0000',
    description: 'Color of the entity'
  },
  {
    name: 'behavior',
    type: 'select' as const,
    defaultValue: 'patrol',
    options: ['patrol', 'follow', 'flee', 'idle'],
    description: 'AI behavior mode'
  },
  {
    name: 'targetPosition',
    type: 'vector3' as const,
    defaultValue: { x: 0, y: 0, z: 0 },
    description: 'Target position to move towards'
  }
];

// Script state - persists between lifecycle calls
interface ScriptState {
  velocity: THREE.Vector3;
  isGrounded: boolean;
  target: any | null;
  lastUpdateTime: number;
}

let state: ScriptState;

/**
 * Initialize
 * Called once when the script is first attached to an entity or when the game starts.
 * Use this to set up initial state, create materials, subscribe to events, etc.
 */
export function init(context: any): void {
  
  // Initialize script state
  state = {
    velocity: new THREE.Vector3(),
    isGrounded: false,
    target: null,
    lastUpdateTime: context.currentTime
  };
  
  // Get script parameters for this entity - they are provided in the context
  const params = context.parameters;
  
  // Example: Change entity color based on parameter
  if (params.color) {
    const mesh = context.entity.getMesh();
    if (mesh && mesh.material) {
      (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(params.color);
    }
  }
  
  // Example: Find initial target
  if (params.targetTag) {
    const targets = context.findEntitiesByTag(params.targetTag);
    if (targets.length > 0) {
      state.target = targets[0];
    }
  }
  
  // Example: Subscribe to physics events
  const physicsBody = context.entity.getPhysicsBody();
  if (physicsBody) {
    // You can add collision event listeners here
  }
}

/**
 * Update
 * Called every frame. This is where most game logic goes.
 * @param deltaTime Time elapsed since last frame in seconds
 */
export function update(context: any, deltaTime: number): void {
  // Parameters are available in context.parameters
  const params = context.parameters;
  
  // Handle input (only works for entities with character controllers)
  if (context.entity.hasCharacterControllerEnabled()) {
    handleCharacterInput(context, deltaTime, params);
  }
  
  // Handle AI behavior
  if (params.behavior && params.behavior !== 'idle') {
    handleAIBehavior(context, deltaTime, params);
  }
  
  // Handle rotation
  if (params.enableRotation) {
    const rotation = context.entity.getRotation();
    rotation.y += params.rotationSpeed * deltaTime;
    context.entity.setRotation(rotation);
  }
  
  // Example: Track elapsed time
  state.lastUpdateTime = context.currentTime;
}

/**
 * Fixed Update
 * Called at fixed intervals (typically 60 times per second).
 * Use this for physics-related updates to ensure consistent behavior.
 */
export function fixedUpdate(context: any, fixedDeltaTime: number): void {
  // Parameters are available in context.parameters
  const params = context.parameters;
  
  // Example: Apply physics forces
  const physicsBody = context.entity.getPhysicsBody();
  if (physicsBody && params.behavior === 'patrol') {
    // Apply patrol movement forces
    const force = new THREE.Vector3(
      Math.sin(context.currentTime) * params.speed,
      0,
      Math.cos(context.currentTime) * params.speed
    );
    physicsBody.applyForce(force);
  }
}

/**
 * Destroy
 * Called when the script is removed from an entity or when the entity is destroyed.
 * Use this to clean up resources, unsubscribe from events, etc.
 */
export function destroy(context: any): void {
  // Clean up any resources
  state = null as any;
  
  // Example: Remove event listeners
  // context.inputManager.removeEventListener('keydown', handleKeyDown);
}

// Helper Functions

function handleCharacterInput(context: any, deltaTime: number, params: any): void {
  const input = context.inputManager;
  
  // Movement
  const movement = new THREE.Vector3();
  
  if (input.isKeyPressed('KeyW') || input.isKeyPressed('ArrowUp')) {
    movement.z -= 1;
  }
  if (input.isKeyPressed('KeyS') || input.isKeyPressed('ArrowDown')) {
    movement.z += 1;
  }
  if (input.isKeyPressed('KeyA') || input.isKeyPressed('ArrowLeft')) {
    movement.x -= 1;
  }
  if (input.isKeyPressed('KeyD') || input.isKeyPressed('ArrowRight')) {
    movement.x += 1;
  }
  
  // Normalize movement vector and apply speed
  if (movement.length() > 0) {
    movement.normalize().multiplyScalar(params.speed);
    
    // Apply movement relative to camera direction
    const camera = context.cameraManager.getActiveCamera();
    if (camera) {
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();
      
      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
      
      const worldMovement = new THREE.Vector3();
      worldMovement.addScaledVector(cameraRight, movement.x);
      worldMovement.addScaledVector(cameraDirection, -movement.z);
      
      const position = context.entity.getPosition();
      position.add(worldMovement.multiplyScalar(deltaTime));
      context.entity.setPosition(position);
    }
  }
  
  // Jumping
  if (input.isKeyPressed('Space') && state.isGrounded) {
    const physicsBody = context.entity.getPhysicsBody();
    if (physicsBody) {
      physicsBody.applyImpulse(new THREE.Vector3(0, params.jumpForce, 0));
      state.isGrounded = false;
    }
  }
}

function handleAIBehavior(context: any, deltaTime: number, params: any): void {
  switch (params.behavior) {
    case 'follow':
      if (state.target) {
        const targetPos = state.target.getPosition();
        const myPos = context.entity.getPosition();
        const direction = new THREE.Vector3().subVectors(targetPos, myPos);
        
        if (direction.length() > 1) {
          direction.normalize().multiplyScalar(params.speed * deltaTime);
          myPos.add(direction);
          context.entity.setPosition(myPos);
        }
      }
      break;
      
    case 'flee':
      if (state.target) {
        const targetPos = state.target.getPosition();
        const myPos = context.entity.getPosition();
        const direction = new THREE.Vector3().subVectors(myPos, targetPos);
        
        if (direction.length() < 10) {
          direction.normalize().multiplyScalar(params.speed * deltaTime);
          myPos.add(direction);
          context.entity.setPosition(myPos);
        }
      }
      break;
      
    case 'patrol':
      // Patrol logic is handled in fixedUpdate for physics consistency
      break;
  }
}

/**
 * Optional: Export additional functions that can be called from other scripts
 */
export function takeDamage(amount: number): void {
  // Implement damage logic
}

export function heal(amount: number): void {
  // Implement healing logic
} 