import React, { createContext, useContext, useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { Physics, useRapier, RapierRigidBody } from '@react-three/rapier';

type PhysicsState = 'stopped' | 'playing' | 'paused';

interface PhysicsContextType {
  physicsState: PhysicsState;
  world: any;
  rapier: any;
  play: () => void;
  pause: () => void;
  stop: () => void;
  resetKey: number;
  resume: () => void;
  registerRigidBody: (objectId: string, rigidBody: RapierRigidBody) => void;
  unregisterRigidBody: (objectId: string) => void;
  isInitialized: boolean;
}

const PhysicsContext = createContext<PhysicsContextType | null>(null);

interface PhysicsProviderProps {
  children: React.ReactNode;
  scene: GameScene;
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

export function PhysicsProvider({ children, scene, debugEnabled }: PhysicsProviderProps) {
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
  setPhysicsState
}: PhysicsProviderProps & { 
  physicsState: PhysicsState; 
  setPhysicsState: React.Dispatch<React.SetStateAction<PhysicsState>>; 
}) {
  const { world, rapier } = useRapier();
  const [resetKey, setResetKey] = useState(0);
  const rigidBodiesRef = useRef<Map<string, RapierRigidBody>>(new Map());
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
    };
  }, []);

  // Clean up when scene changes
  useEffect(() => {
    // Clear rigid bodies for new scene
    rigidBodiesRef.current.clear();
    
    // Reset scene stability
    setIsSceneStable(false);
    const stabilizeTimer = setTimeout(() => {
      setIsSceneStable(true);
    }, 100);
    
    return () => clearTimeout(stabilizeTimer);
  }, [scene.id]);

  const play = useCallback(() => {
    if (!isInitialized || cleanupInProgressRef.current) return;
    setPhysicsState('playing');
  }, [isInitialized, setPhysicsState]);

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
    setResetKey(prev => prev + 1);
  }, [isInitialized, setPhysicsState]);

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
    resetKey,
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