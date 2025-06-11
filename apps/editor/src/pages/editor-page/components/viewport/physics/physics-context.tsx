import React, { createContext, useContext, useCallback, useRef, useState, useMemo, useEffect } from 'react';
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
  isInitialized: boolean;
}

const PhysicsContext = createContext<PhysicsContextType | null>(null);

interface PhysicsProviderProps {
  children: React.ReactNode;
  scene: GameScene;
  onObjectTransformUpdate: (objectId: string, transform: Partial<Transform>) => void;
  debugEnabled?: boolean;
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

// Physics Error Boundary
class PhysicsErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Physics error caught:', error, errorInfo);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <group>
          {/* Render children without physics when error occurs */}
          {this.props.children}
        </group>
      );
    }

    return this.props.children;
  }
}

export function PhysicsProvider({ children, scene, onObjectTransformUpdate, debugEnabled }: PhysicsProviderProps) {
  const [physicsState, setPhysicsState] = useState<PhysicsState>('stopped');
  
  // Memoize physics world config validation to prevent infinite re-renders
  const physicsWorldConfig = useMemo(() => {
    return validatePhysicsWorldConfig(scene.physicsWorld);
  }, [scene.physicsWorld]);

  // Remove physics pausing - physics will always run for debug helpers
  // Movement will be controlled by individual rigid bodies instead

  // Use debugEnabled prop if provided, otherwise fall back to scene config
  const shouldShowDebug = debugEnabled !== undefined ? debugEnabled : physicsWorldConfig.debugRender.enabled;

  return (
    <PhysicsErrorBoundary onError={() => setPhysicsState('stopped')}>
      <Physics
        gravity={[physicsWorldConfig.gravity.x, physicsWorldConfig.gravity.y, physicsWorldConfig.gravity.z]}
        timeStep={physicsWorldConfig.integrationParameters.dt}
        debug={shouldShowDebug}
        updateLoop="follow"
        interpolate={true}
        colliders={false}
      >
        <PhysicsInnerProvider 
          scene={scene} 
          physicsState={physicsState}
          setPhysicsState={setPhysicsState}
          onObjectTransformUpdate={onObjectTransformUpdate}
        >
          {children}
        </PhysicsInnerProvider>
      </Physics>
    </PhysicsErrorBoundary>
  );
}

// Inner provider that has access to useRapier
function PhysicsInnerProvider({ 
  children, 
  scene, 
  physicsState, 
  setPhysicsState,
  onObjectTransformUpdate
}: PhysicsProviderProps & { 
  physicsState: PhysicsState; 
  setPhysicsState: React.Dispatch<React.SetStateAction<PhysicsState>>; 
}) {
  const { world, rapier } = useRapier();
  const rigidBodiesRef = useRef<Map<string, RapierRigidBody>>(new Map());
  const initialTransformsRef = useRef<Map<string, Transform>>(new Map());
  const isInitialized = world && rapier;
  const cleanupInProgressRef = useRef(false);
  const lastSceneObjectsRef = useRef<GameObject[]>([]);
  const [isSceneStable, setIsSceneStable] = useState(true);

  // Detect scene changes and stabilize physics operations
  useEffect(() => {
    const currentObjects = scene.objects;
    const lastObjects = lastSceneObjectsRef.current;
    
    // Check if scene objects have changed
    const hasSceneChanged = currentObjects.length !== lastObjects.length ||
      currentObjects.some((obj, index) => obj.id !== lastObjects[index]?.id);
    
    if (hasSceneChanged) {
      // Stop physics when scene changes to prevent operations on stale objects
      if (physicsState === 'playing') {
        setPhysicsState('stopped');
      }
      
      // Temporarily pause physics operations during scene changes
      setIsSceneStable(false);
      
      // Stabilize after a short delay to allow React to finish updates
      const stabilizeTimer = setTimeout(() => {
        setIsSceneStable(true);
      }, 100);
      
      lastSceneObjectsRef.current = currentObjects;
      return () => clearTimeout(stabilizeTimer);
    }
    
    lastSceneObjectsRef.current = currentObjects;
  }, [scene.objects, physicsState, setPhysicsState]);

  // Clean up all rigid bodies when component unmounts or physics world changes
  useEffect(() => {
    return () => {
      cleanupInProgressRef.current = true;
      // Clear the rigid bodies map to prevent further access
      rigidBodiesRef.current.clear();
      initialTransformsRef.current.clear();
    };
  }, []);

  // Clean up when scene changes
  useEffect(() => {
    // Clear rigid bodies and transforms for new scene
    rigidBodiesRef.current.clear();
    initialTransformsRef.current.clear();
    
    // Reset scene stability
    setIsSceneStable(false);
    const stabilizeTimer = setTimeout(() => {
      setIsSceneStable(true);
    }, 100);
    
    return () => clearTimeout(stabilizeTimer);
  }, [scene.id]);

  // Store initial transforms when simulation starts
  const storeInitialTransforms = useCallback(() => {
    if (cleanupInProgressRef.current) return;
    
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
    if (cleanupInProgressRef.current) return;
    
    initialTransformsRef.current.forEach((transform, objectId) => {
      // Update the store to reset GameObject.transform to initial state
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
    if (!isInitialized || cleanupInProgressRef.current) return;
    
    if (physicsState === 'stopped') {
      storeInitialTransforms();
    }
    setPhysicsState('playing');
  }, [physicsState, storeInitialTransforms, isInitialized, setPhysicsState]);

  const pause = useCallback(() => {
    if (!isInitialized || cleanupInProgressRef.current) return;
    setPhysicsState('paused');
  }, [isInitialized, setPhysicsState]);

  const resume = useCallback(() => {
    if (!isInitialized || cleanupInProgressRef.current) return;
    setPhysicsState('playing');
  }, [isInitialized, setPhysicsState]);

  const stop = useCallback(() => {
    if (!isInitialized || cleanupInProgressRef.current) return;
    setPhysicsState('stopped');
    restoreInitialTransforms();
  }, [restoreInitialTransforms, isInitialized, setPhysicsState]);

  const registerRigidBody = useCallback((objectId: string, rigidBody: RapierRigidBody) => {
    if (cleanupInProgressRef.current || !isSceneStable) return;
    rigidBodiesRef.current.set(objectId, rigidBody);
  }, [isSceneStable]);

  const unregisterRigidBody = useCallback((objectId: string) => {
    if (cleanupInProgressRef.current) return;
    rigidBodiesRef.current.delete(objectId);
  }, []);

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
    isInitialized: !!isInitialized && !cleanupInProgressRef.current && isSceneStable,
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