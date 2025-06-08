import React, { createContext, useContext, useCallback, useRef, useState, useMemo } from 'react';
import { Physics, useRapier, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

type PhysicsState = 'stopped' | 'playing' | 'paused';

interface PhysicsContextType {
  physicsState: PhysicsState;
  world: any;
  rapier: any;
  play: () => void;
  pause: () => void;
  stop: () => void;
  resume: () => void;
  registerRigidBody: (objectId: string, rigidBody: RapierRigidBody) => void;
  unregisterRigidBody: (objectId: string) => void;
  updateTransformFromPhysics: (objectId: string, position: Vector3, rotation: Vector3) => void;
  isInitialized: boolean;
}

const PhysicsContext = createContext<PhysicsContextType | null>(null);

interface PhysicsProviderProps {
  children: React.ReactNode;
  scene: GameScene;
  onObjectTransformUpdate: (objectId: string, transform: Partial<Transform>) => void;
}

// Helper function to create default physics world config if missing
const createDefaultPhysicsWorldConfig = (): PhysicsWorldConfig => ({
  gravity: { x: 0, y: -9.81, z: 0 },
  integrationParameters: {
    dt: 1/60,
    minCcdDt: 1/60/100,
    erp: 0.8,
    damping: 0.99,
    jointErp: 1.0,
    jointDamping: 1.0,
    allowedLinearError: 0.001,
    allowedAngularError: 0.0087,
    maxVelocityIterations: 4,
    maxVelocityFrictionIterations: 8,
    maxStabilizationIterations: 1,
    interleaveRestitutionAndFrictionResolution: true,
    minIslandSize: 128,
    maxCcdSubsteps: 1
  },
  collisionDetection: {
    predictionDistance: 0.002,
    allowedLinearError: 0.001
  },
  debugRender: {
    enabled: false,
    renderBodies: true,
    renderShapes: true,
    renderJoints: true,
    renderMultibodyJoints: false,
    renderContacts: false,
    renderCollisionEvents: false,
    contactPointLength: 0.1,
    contactNormalLength: 0.1
  }
});

// Helper function to validate and ensure complete physics world config
const validatePhysicsWorldConfig = (config: any): PhysicsWorldConfig => {
  if (!config || typeof config !== 'object') {
    console.warn('Physics world config is missing or invalid, using defaults');
    return createDefaultPhysicsWorldConfig();
  }
  
  const defaultConfig = createDefaultPhysicsWorldConfig();
  
  // Merge with defaults to ensure all required properties exist
  return {
    gravity: config.gravity || defaultConfig.gravity,
    integrationParameters: {
      ...defaultConfig.integrationParameters,
      ...(config.integrationParameters || {})
    },
    collisionDetection: {
      ...defaultConfig.collisionDetection,
      ...(config.collisionDetection || {})
    },
    debugRender: {
      ...defaultConfig.debugRender,
      ...(config.debugRender || {})
    }
  };
};

export function PhysicsProvider({ children, scene, onObjectTransformUpdate }: PhysicsProviderProps) {
  const [physicsState, setPhysicsState] = useState<PhysicsState>('stopped');
  
  // Memoize physics world config validation to prevent infinite re-renders
  const physicsWorldConfig = useMemo(() => {
    return validatePhysicsWorldConfig(scene.physicsWorld);
  }, [scene.physicsWorld]);

  // Control physics paused state
  const isPaused = physicsState !== 'playing';

  return (
    <Physics
      gravity={[physicsWorldConfig.gravity.x, physicsWorldConfig.gravity.y, physicsWorldConfig.gravity.z]}
      timeStep={physicsWorldConfig.integrationParameters.dt}
      paused={isPaused}
      debug={physicsWorldConfig.debugRender.enabled}
      updateLoop="follow"
      interpolate={true}
      colliders={false}
    >
      <PhysicsInnerProvider 
        scene={scene} 
        onObjectTransformUpdate={onObjectTransformUpdate}
        physicsState={physicsState}
        setPhysicsState={setPhysicsState}
      >
        {children}
      </PhysicsInnerProvider>
    </Physics>
  );
}

// Inner provider that has access to useRapier
function PhysicsInnerProvider({ 
  children, 
  scene, 
  onObjectTransformUpdate, 
  physicsState, 
  setPhysicsState 
}: PhysicsProviderProps & { 
  physicsState: PhysicsState; 
  setPhysicsState: React.Dispatch<React.SetStateAction<PhysicsState>>; 
}) {
  const { world, rapier } = useRapier();
  const rigidBodiesRef = useRef<Map<string, RapierRigidBody>>(new Map());
  const initialTransformsRef = useRef<Map<string, Transform>>(new Map());
  const isInitialized = world && rapier;

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
      
      // Reset rigid body transforms too
      const rigidBody = rigidBodiesRef.current.get(objectId);
      if (rigidBody) {
        try {
          rigidBody.setTranslation(transform.position, true);
          
          // Convert euler to quaternion with consistent rotation order
          const euler = new THREE.Euler(
            transform.rotation.x,
            transform.rotation.y,
            transform.rotation.z,
            'XYZ' // Specify rotation order for consistency
          );
          const quaternion = new THREE.Quaternion().setFromEuler(euler);
          rigidBody.setRotation(quaternion, true);
          
          // Reset velocities
          rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
        } catch (error) {
          console.warn('Failed to reset rigid body transform:', error);
        }
      }
    });
  }, [onObjectTransformUpdate]);

  const play = useCallback(() => {
    if (!isInitialized) return;
    
    if (physicsState === 'stopped') {
      storeInitialTransforms();
    }
    setPhysicsState('playing');
  }, [physicsState, storeInitialTransforms, isInitialized, setPhysicsState]);

  const pause = useCallback(() => {
    if (!isInitialized) return;
    setPhysicsState('paused');
  }, [isInitialized, setPhysicsState]);

  const resume = useCallback(() => {
    if (!isInitialized) return;
    setPhysicsState('playing');
  }, [isInitialized, setPhysicsState]);

  const stop = useCallback(() => {
    if (!isInitialized) return;
    setPhysicsState('stopped');
    restoreInitialTransforms();
  }, [restoreInitialTransforms, isInitialized, setPhysicsState]);

  const registerRigidBody = useCallback((objectId: string, rigidBody: RapierRigidBody) => {
    rigidBodiesRef.current.set(objectId, rigidBody);
  }, []);

  const unregisterRigidBody = useCallback((objectId: string) => {
    rigidBodiesRef.current.delete(objectId);
  }, []);

  const updateTransformFromPhysics = useCallback((objectId: string, position: Vector3, rotation: Vector3) => {
    if (physicsState === 'playing') {
      // Only update position and rotation from physics, preserve existing scale
      onObjectTransformUpdate(objectId, { position, rotation });
    }
  }, [physicsState, onObjectTransformUpdate]);

  const contextValue: PhysicsContextType = {
    physicsState,
    world,
    rapier,
    play,
    pause,
    stop,
    resume,
    registerRigidBody,
    unregisterRigidBody,
    updateTransformFromPhysics,
    isInitialized: !!isInitialized,
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