import * as THREE from "three/webgpu";
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

  game.start();

  return {
    game,
    sphere,
    box,
    stateManager,
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
// // Later cleanup
// gameExample.cleanup(); 