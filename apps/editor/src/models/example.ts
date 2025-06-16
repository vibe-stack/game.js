import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GameWorld, createStateHook, type GameState } from "./index";

// Example usage of the game framework
export async function createGameExample(canvas: HTMLCanvasElement) {
  const game = new GameWorld({
    canvas,
    enablePhysics: true,
    gravity: new THREE.Vector3(0, -9.81, 0),
    antialias: true,
    shadowMapEnabled: true,
  });

  // Initialize WebGPU renderer
  await game.initialize();

  // Get the managers
  const cameraManager = game.getCameraManager();
  const controlManager = game.getCameraControlManager();

  // Create additional cameras
  const topCamera = cameraManager.createPerspectiveCamera(
    "top-view",
    "Top View Camera",
    {
      position: new THREE.Vector3(0, 20, 0),
      target: new THREE.Vector3(0, 0, 0),
      fov: 60
    }
  );

  const sideCamera = cameraManager.createPerspectiveCamera(
    "side-view", 
    "Side View Camera",
    {
      position: new THREE.Vector3(15, 5, 0),
      target: new THREE.Vector3(0, 0, 0),
      fov: 75
    }
  );

  // Create orbit controls for different cameras
  const defaultOrbitControls = new OrbitControls(
    cameraManager.getCamera("default")!,
    canvas
  );
  defaultOrbitControls.enableDamping = true;
  defaultOrbitControls.dampingFactor = 0.05;

  const topOrbitControls = new OrbitControls(topCamera, canvas);
  topOrbitControls.enableDamping = true;
  topOrbitControls.dampingFactor = 0.05;

  const sideOrbitControls = new OrbitControls(sideCamera, canvas);
  sideOrbitControls.enableDamping = true;
  sideOrbitControls.dampingFactor = 0.05;

  // Add controls to the control manager
  controlManager.addControls("default-orbit", "Default Orbit Controls", defaultOrbitControls);
  controlManager.addControls("top-orbit", "Top Orbit Controls", topOrbitControls, { enabled: false });
  controlManager.addControls("side-orbit", "Side Orbit Controls", sideOrbitControls, { enabled: false });

  // Associate controls with cameras
  controlManager.associateWithCamera("default-orbit", "default");
  controlManager.associateWithCamera("top-orbit", "top-view");
  controlManager.associateWithCamera("side-orbit", "side-view");

  const sphere = game
    .createSphere({ radius: 1, name: "Player Ball" })
    .setPosition(0, 3, 0)
    .enableDynamicPhysics(1, 0.8, 0.3)
    .addTag("player")
    .onClick(() => {
      sphere.applyImpulse(new THREE.Vector3(0, 80, 0));
    })
    .onHover((event) => {
      console.log("Sphere hovered!", event);
    });

  const box = game
    .createBox({ size: new THREE.Vector3(10, 1, 10), name: "Ground" })
    .setPosition(0, -5, 0)
    .enableStaticPhysics(0.2, 0.9)
    .addTag("ground");

  const stateManager = game.getStateManager();
  
  stateManager.subscribe((state) => {
    console.log("Game state updated:", {
      entityCount: state.entities.size,
      physicsEnabled: state.physics.enabled,
      activeCamera: state.scene.activeCamera,
      cameraTransition: state.scene.cameraTransition?.inProgress,
    });
  });

  const watchPlayerPosition = stateManager.watchProperty("entities", (entities) => {
    const player = Array.from(entities.values()).find((entity: any) => 
      entity.hasTag?.("player")
    );
    if (player) {
      console.log("Player position:", player.position);
    }
  });

  // Camera switching functionality
  const switchToCamera = (cameraId: string, enableTransition = true) => {
    const currentCameraId = cameraManager.getActiveCameraId();
    
    // Disable current camera's controls and save their state
    const currentControls = controlManager.getControlsForCamera(currentCameraId);
    currentControls.forEach(control => {
      controlManager.disableControls(control.id);
    });

    // Switch camera
    if (enableTransition) {
      cameraManager.setActiveCamera(cameraId, {
        duration: 1500,
        easing: (t) => t * t * (3.0 - 2.0 * t), // smoothstep
        onComplete: () => {
          console.log(`Camera switched to ${cameraId}`);
          
          // After transition completes, enable new camera's controls and sync them
          const newControls = controlManager.getControlsForCamera(cameraId);
          const newCamera = cameraManager.getCamera(cameraId);
          
          newControls.forEach(control => {
            // Sync controls with the camera's current position (which should be the original position)
            if (newCamera) {
              controlManager.syncControlsWithCamera(control.id, newCamera);
            }
            controlManager.enableControls(control.id);
          });
        }
      });
    } else {
      cameraManager.setActiveCamera(cameraId);
      
      // Immediately enable new camera's controls and sync them
      const newControls = controlManager.getControlsForCamera(cameraId);
      const newCamera = cameraManager.getCamera(cameraId);
      
      newControls.forEach(control => {
        // Sync controls with the camera's actual position (original position)
        if (newCamera) {
          controlManager.syncControlsWithCamera(control.id, newCamera);
        }
        controlManager.enableControls(control.id);
      });
    }
  };

  // Toggle controls functionality
  const toggleControls = () => {
    const currentCameraId = cameraManager.getActiveCameraId();
    const controls = controlManager.getControlsForCamera(currentCameraId);
    
    controls.forEach(control => {
      controlManager.toggleControls(control.id);
      console.log(`Controls ${control.id} ${controlManager.isEnabled(control.id) ? 'enabled' : 'disabled'}`);
    });
  };

  game.start();

  return {
    game,
    sphere,
    box,
    cameraManager,
    controlManager,
    stateManager,
    switchToCamera,
    toggleControls,
    cleanup: () => {
      stateManager.unsubscribe(watchPlayerPosition);
      game.dispose();
    },
  };
}

// React hook example for listening to game state
export function useGameState<T>(
  game: GameWorld,
  selector?: (state: GameState) => T
) {
  if (typeof window === "undefined") {
    throw new Error("useGameState can only be used in browser environment");
  }
  
  const stateHook = createStateHook(game.getStateManager());
  return stateHook(selector);
}

// Example React component that listens to game state
export function GameUI({ game }: { game: GameWorld }) {
  const entityCount = useGameState(game, (state) => state.entities.size);
  const physicsEnabled = useGameState(game, (state) => state.physics.enabled);
  
  return `
    <div class="absolute top-2.5 left-2.5 bg-black/70 text-white p-2.5 rounded">
      <div>Entities: ${entityCount}</div>
      <div>Physics: ${physicsEnabled ? "Enabled" : "Disabled"}</div>
    </div>
  `;
}

// Usage example:
// const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
// const gameExample = createGameExample(canvas);
// 
// // Switch cameras
// gameExample.switchToCamera('top-view');
// gameExample.switchToCamera('side-view', false); // without transition
// 
// // Toggle controls
// gameExample.toggleControls();
// 
// // Later cleanup
// gameExample.cleanup(); 