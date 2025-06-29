/**
 * Simple test/example of how to use the scripting system
 * This file demonstrates the complete usage flow
 */

import { GameWorld, ScriptManager, Sphere, EXAMPLE_SCRIPTS } from "./index";

// Mock canvas for testing
const mockCanvas = document.createElement('canvas');

// Create a test game world
const gameWorld = new GameWorld({
  canvas: mockCanvas,
  enablePhysics: true,
});

// Get the script manager
const scriptManager = gameWorld.getScriptManager();

// Example: Load and use a rotation script
export function testRotationScript() {
  // Get an example script
  const rotationScript = EXAMPLE_SCRIPTS.simpleRotation;
  
  // Compile the script
  const compiledScript = scriptManager.compileScript(rotationScript);
  
  if (compiledScript.hasErrors) {
    console.error('Script compilation failed:', compiledScript.lastError);
    return;
  }
  
  // Create an entity
  const sphere = new Sphere({ radius: 1 });
  gameWorld.createEntity(sphere);
  
  // Attach the script to the entity
  sphere.attachScript('simple-rotation');
  
  return { sphere, scriptManager };
}

// Example: Create a custom script
export function testCustomScript() {
  const customScriptCode = `
    let bounceHeight = 0;
    let bounceSpeed = 2.0;
    
    export function init(context) {
      context.entity.userData.originalY = context.entity.position.y;
    }
    
    export function update(context, deltaTime) {
      bounceHeight += bounceSpeed * deltaTime;
      const originalY = context.entity.userData.originalY || 0;
      context.entity.position.y = originalY + Math.sin(bounceHeight) * 2;
    }
    
    export function destroy(context) {
    }
  `;
  
  const customScript = {
    id: 'custom-bounce',
    name: 'Custom Bounce Script',
    code: customScriptCode,
    enabled: true,
    priority: 0
  };
  
  // Compile the custom script
  const compiledScript = scriptManager.compileScript(customScript);
  
  if (compiledScript.hasErrors) {
    console.error('Custom script compilation failed:', compiledScript.lastError);
    return;
  }
  
  // Create an entity and attach the script
  const sphere = new Sphere({ radius: 0.5 });
  gameWorld.createEntity(sphere);
  sphere.attachScript('custom-bounce');
  return { sphere, scriptManager };
}

// Example: Test script performance and error handling
export function testScriptManagement() {
  // Create a script with an intentional error
  const errorScript = {
    id: 'error-script',
    name: 'Error Script',
    code: `
      export function update(context, deltaTime) {
        // This will cause an error
        context.nonExistentProperty.someMethod();
      }
    `,
    enabled: true,
    priority: 0
  };
  
  const compiledScript = scriptManager.compileScript(errorScript);
  
  // Create entity and attach script
  const sphere = new Sphere({ radius: 0.3 });
  gameWorld.createEntity(sphere);
  sphere.attachScript('error-script');
  
  // Simulate an update cycle (this would normally happen in the game loop)
  scriptManager.update(0.016); // 60 FPS delta time
  
  // Check for errors
  const script = scriptManager.getScript('error-script');
  
  // Get performance metrics
  const metrics = scriptManager.getScriptPerformance('error-script');
  
  return { sphere, scriptManager };
}

// Example: Load all example scripts
export function loadAllExampleScripts() {
  
  const scriptIds = Object.keys(EXAMPLE_SCRIPTS);
  const loadedScripts: string[] = [];
  
  for (const scriptKey of scriptIds) {
    const scriptConfig = EXAMPLE_SCRIPTS[scriptKey as keyof typeof EXAMPLE_SCRIPTS];
    try {
      scriptManager.compileScript(scriptConfig);
      loadedScripts.push(scriptConfig.id);
    } catch (error) {
      console.error(`✗ Failed to load script: ${scriptConfig.name}`, error);
    }
  }
  
  return loadedScripts;
}

// Example: Test multiple scripts on one entity
export function testMultipleScripts() {
  // Load example scripts first
  loadAllExampleScripts();
  
  // Create an entity
  const sphere = new Sphere({ radius: 1 });
  gameWorld.createEntity(sphere);
  
  // Attach multiple scripts
  sphere.attachScript('simple-rotation');
  
  // If the health system script exists, attach it too
  if (scriptManager.getScript('health-system')) {
    sphere.attachScript('health-system');
  }
  
  // Run a few update cycles
  for (let i = 0; i < 5; i++) {
    scriptManager.update(0.016);
  }
  
  return { sphere, scriptManager };
}

// Export a function to run all tests
export function runAllTests() {
  
  testRotationScript();
  
  testCustomScript();
  
  testScriptManagement();
  
  loadAllExampleScripts();
  
  testMultipleScripts();
}

// Auto-run tests if this file is imported
// runAllTests(); 