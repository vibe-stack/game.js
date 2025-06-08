import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

type PhysicsState = 'stopped' | 'playing' | 'paused';

interface PhysicsContextType {
  physicsState: PhysicsState;
  world: any; // Will be Rapier3D World
  play: () => void;
  pause: () => void;
  stop: () => void;
  resume: () => void;
  registerRigidBody: (objectId: string, rigidBody: any) => void;
  unregisterRigidBody: (objectId: string) => void;
  updateTransformFromPhysics: (objectId: string, position: Vector3, rotation: Vector3) => void;
}

const PhysicsContext = createContext<PhysicsContextType | null>(null);

interface PhysicsProviderProps {
  children: React.ReactNode;
  scene: GameScene;
  onObjectTransformUpdate: (objectId: string, transform: Partial<Transform>) => void;
}

export function PhysicsProvider({ children, scene, onObjectTransformUpdate }: PhysicsProviderProps) {
  const [physicsState, setPhysicsState] = useState<PhysicsState>('stopped');
  const worldRef = useRef<any>(null);
  const rigidBodiesRef = useRef<Map<string, any>>(new Map());
  const initialTransformsRef = useRef<Map<string, Transform>>(new Map());

  // Initialize Rapier3D
  useEffect(() => {
    const initRapier = async () => {
      try {
        const RAPIER = await import('@dimforge/rapier3d-compat');
        await RAPIER.init();
        
        const gravity = scene.physicsWorld.gravity;
        const world = new RAPIER.World({ x: gravity.x, y: gravity.y, z: gravity.z });
        
        // Apply basic integration parameters
        const integrationParams = world.integrationParameters;
        const sceneParams = scene.physicsWorld.integrationParameters;
        
        integrationParams.dt = sceneParams.dt;
        integrationParams.erp = sceneParams.erp;
        integrationParams.allowedLinearError = sceneParams.allowedLinearError;
        
        worldRef.current = world;
      } catch (error) {
        console.error('Failed to initialize Rapier3D:', error);
      }
    };

    initRapier();
  }, [scene.physicsWorld]);

  // Store initial transforms when simulation starts
  const storeInitialTransforms = useCallback(() => {
    initialTransformsRef.current.clear();
    const storeObjectTransforms = (objects: GameObject[]) => {
      objects.forEach(obj => {
        initialTransformsRef.current.set(obj.id, { ...obj.transform });
        if (obj.children.length > 0) {
          storeObjectTransforms(obj.children);
        }
      });
    };
    storeObjectTransforms(scene.objects);
  }, [scene.objects]);

  // Restore initial transforms when simulation stops
  const restoreInitialTransforms = useCallback(() => {
    initialTransformsRef.current.forEach((transform, objectId) => {
      onObjectTransformUpdate(objectId, transform);
    });
  }, [onObjectTransformUpdate]);

  const play = useCallback(() => {
    if (physicsState === 'stopped') {
      storeInitialTransforms();
    }
    setPhysicsState('playing');
  }, [physicsState, storeInitialTransforms]);

  const pause = useCallback(() => {
    setPhysicsState('paused');
  }, []);

  const resume = useCallback(() => {
    setPhysicsState('playing');
  }, []);

  const stop = useCallback(() => {
    setPhysicsState('stopped');
    restoreInitialTransforms();
  }, [restoreInitialTransforms]);

  const registerRigidBody = useCallback((objectId: string, rigidBody: any) => {
    rigidBodiesRef.current.set(objectId, rigidBody);
  }, []);

  const unregisterRigidBody = useCallback((objectId: string) => {
    rigidBodiesRef.current.delete(objectId);
  }, []);

  const updateTransformFromPhysics = useCallback((objectId: string, position: Vector3, rotation: Vector3) => {
    if (physicsState === 'playing') {
      onObjectTransformUpdate(objectId, { position, rotation });
    }
  }, [physicsState, onObjectTransformUpdate]);

  // Physics simulation loop
  useFrame(() => {
    if (!worldRef.current || physicsState !== 'playing') return;
    
    worldRef.current.step();
    
    // Update transforms from physics bodies
    rigidBodiesRef.current.forEach((rigidBody, objectId) => {
      const translation = rigidBody.translation();
      const rotation = rigidBody.rotation();
      
      // Convert quaternion to euler angles (simplified)
      const position: Vector3 = {
        x: translation.x,
        y: translation.y,
        z: translation.z
      };
      
      const rotationEuler: Vector3 = {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z
      };
      
      updateTransformFromPhysics(objectId, position, rotationEuler);
    });
  });

  const contextValue: PhysicsContextType = {
    physicsState,
    world: worldRef.current,
    play,
    pause,
    stop,
    resume,
    registerRigidBody,
    unregisterRigidBody,
    updateTransformFromPhysics,
  };

  return (
    <PhysicsContext.Provider value={contextValue}>
      {children}
    </PhysicsContext.Provider>
  );
}

export function usePhysics() {
  const context = useContext(PhysicsContext);
  if (!context) {
    throw new Error('usePhysics must be used within a PhysicsProvider');
  }
  return context;
} 