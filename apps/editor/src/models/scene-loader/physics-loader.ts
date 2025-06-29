import { LoaderContext, PhysicsData } from "./types";
import * as THREE from "three/webgpu";

export class PhysicsLoader {
  async load(context: LoaderContext, physicsData: PhysicsData): Promise<void> {
    const physicsManager = context.gameWorld.getPhysicsManager();

    if (!physicsData.enabled) {
      return;
    }

    try {
      // Set gravity if specified (GameWorld should already be initialized)
      if (physicsData.gravity) {
        const gravity = new THREE.Vector3(...physicsData.gravity);
        physicsManager.setGravity(gravity);
      }

      // Apply solver settings if available
      if (physicsData.solver) {
        // Note: This depends on the physics manager implementation
        // You might need to add methods to PhysicsManager to configure solver settingg
        
        // If physics manager has configuration methods, call them here
        if (physicsData.solver.timestep && 'setTimestep' in physicsManager) {
          (physicsManager as any).setTimestep(physicsData.solver.timestep);
        }
        
        if (physicsData.solver.iterations && 'setIterations' in physicsManager) {
          (physicsManager as any).setIterations(physicsData.solver.iterations);
        }
      }

      // Configure debug rendering
      if (physicsData.debugRender) {
        context.gameWorld.enablePhysicsDebugRender();
      } else {
        context.gameWorld.disablePhysicsDebugRender();
      }

    } catch (error) {
      console.error("Failed to load physics configuration:", error);
      throw error;
    }
  }
} 