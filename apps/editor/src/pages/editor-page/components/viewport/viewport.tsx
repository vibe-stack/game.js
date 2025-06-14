import React, { Suspense, useEffect, useRef } from "react";
import { Canvas, extend, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  LinearToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  NoToneMapping,
} from "three";
import SceneObject from "./scene-object-new";
import { PhysicsProvider, usePhysics } from "./physics/physics-context";
import { GameWorldProvider } from "@/services/game-world-context";
import { gameWorld } from "@/services/game-world";
import useEditorStore from "@/stores/editor-store";
import Grid2 from "./components/grid2";
// import WebGPUGrid from "./components/webgpu-grid";
import * as THREE from "three/webgpu";

extend(THREE as any)

interface ViewportProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (id: string, event?: React.MouseEvent) => void;
  onPhysicsCallbacks?: (callbacks: {
    play?: () => void;
    pause?: () => void;
    stop?: () => void;
    resume?: () => void;
  }) => void;
}

function SceneEffects({ scene }: { scene: GameScene }) {
  const { gl } = useThree();

  useEffect(() => {
    if (gl && "physicallyCorrectLights" in gl) {
      // gl.physicallyCorrectLights = scene.runtimeConfig.physicallyCorrectLights;
    }
  }, [gl, scene.runtimeConfig.physicallyCorrectLights]);

  return null;
}

function PhysicsCallbackProvider({
  onPhysicsCallbacks,
}: {
  onPhysicsCallbacks?: ViewportProps["onPhysicsCallbacks"];
}) {
  const { play, pause, stop, resume } = usePhysics();

  useEffect(() => {
    if (onPhysicsCallbacks) {
      onPhysicsCallbacks({ play, pause, stop, resume });
    }
  }, [play, pause, stop, resume, onPhysicsCallbacks]);

  return null;
}

function GameWorldUpdater() {
  const { setGameWorld } = useEditorStore();
  
  useEffect(() => {
    // Initialize GameWorld integration
    setGameWorld(gameWorld);
    
    return () => {
      gameWorld.dispose();
    };
  }, [setGameWorld]);

  // High-frequency game loop
  useFrame((state) => {
    gameWorld.update(state.clock.elapsedTime * 1000);
  });

  return null;
}

function CameraController({ scene }: { scene: GameScene }) {
  const { camera, controls } = useThree();
  const { viewportMode, physicsState } = useEditorStore();
  const prevActiveCameraRef = useRef<string | undefined>(scene.activeCamera);
  const cameraFollowRef = useRef<{ camera: GameObject; worldMatrix: THREE.Matrix4 } | null>(null);
  
  useEffect(() => {
    if (!scene.activeCamera) return;
    
    // Find the active camera object and calculate its world transform
    const findCameraWithWorldTransform = (objects: GameObject[], id: string, parentTransform?: THREE.Matrix4): { camera: GameObject; worldMatrix: THREE.Matrix4 } | null => {
      for (const obj of objects) {
        // Calculate this object's world matrix
        const localMatrix = new THREE.Matrix4();
        const { position, rotation, scale } = obj.transform;
        localMatrix.makeTranslation(position.x, position.y, position.z);
        
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));
        localMatrix.multiply(rotationMatrix);
        
        const scaleMatrix = new THREE.Matrix4();
        scaleMatrix.makeScale(scale.x, scale.y, scale.z);
        localMatrix.multiply(scaleMatrix);
        
        // Combine with parent transform if it exists
        const worldMatrix = parentTransform ? new THREE.Matrix4().multiplyMatrices(parentTransform, localMatrix) : localMatrix;
        
        if (obj.id === id) {
          const hasCameraComponent = obj.components.some(
            comp => comp.type === 'PerspectiveCamera' || comp.type === 'OrthographicCamera'
          );
          if (hasCameraComponent) return { camera: obj, worldMatrix };
        }
        
        // Search children with this object's world transform as parent
        const found = findCameraWithWorldTransform(obj.children, id, worldMatrix);
        if (found) return found;
      }
      return null;
    };
    
    const result = findCameraWithWorldTransform(scene.objects, scene.activeCamera);
    cameraFollowRef.current = result;
    
    // Handle camera switching logic
    if (viewportMode === 'orbit' && controls && scene.activeCamera !== prevActiveCameraRef.current) {
      if (!result) return;
      
      const { worldMatrix } = result;
      
      // Extract world position from the world matrix
      const worldPosition = new THREE.Vector3();
      const worldRotation = new THREE.Quaternion();
      worldMatrix.decompose(worldPosition, worldRotation, new THREE.Vector3());
      
      // If OrbitControls is available, use it for smooth transition
      if (controls && 'object' in controls) {
        const orbitControls = controls as any;
        
        // Set the target position for smooth animation using world coordinates
        orbitControls.object.position.copy(worldPosition);
        orbitControls.target.set(0, 0, 0); // Look at center for now
        orbitControls.update();
      }
    }
    
    prevActiveCameraRef.current = scene.activeCamera;
  }, [scene.activeCamera, scene.objects, camera, controls, viewportMode]);
  
  // Update camera transform in camera follow mode
  useFrame(() => {
    if (viewportMode === 'camera' && scene.activeCamera && camera) {
      // During physics, get live transforms from the GameWorld
      // During non-physics, use GameObject transforms
      if (physicsState === 'playing') {
        // Get live transform from GameWorld
        const liveTransform = gameWorld.getLiveTransform(scene.activeCamera);
        if (liveTransform) {
          // Extract world position and rotation from the live transform
          const worldPosition = new THREE.Vector3();
          const worldRotation = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          liveTransform.decompose(worldPosition, worldRotation, worldScale);
          
          // Apply to the viewport camera
          camera.position.copy(worldPosition);
          camera.quaternion.copy(worldRotation);
          camera.updateMatrixWorld();
        }
      } else {
        // During non-physics, use the GameObject transforms via GameWorld
        const cameraObj = gameWorld.getObject(scene.activeCamera);
        if (cameraObj) {
          const transform = cameraObj.transform;
          camera.position.set(transform.position.x, transform.position.y, transform.position.z);
          camera.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
          camera.updateMatrixWorld();
        }
      }
    }
  });

  return null;
}

function SceneRenderer({ scene, selectedObjects, onSelectObject }: {
  scene: GameScene;
  selectedObjects: string[];
  onSelectObject: (id: string, event?: React.MouseEvent) => void;
}) {
  const { editorConfig } = scene;

  return (
    <>
      {editorConfig.showHelperGrid && (
        <Grid2 args={[editorConfig.gridSize || 10, editorConfig.gridSize || 10]} />
      )}
      
      {scene.objects.map((obj) => (
        <SceneObject
          key={obj.id}
          objectId={obj.id}
          selectedObjects={selectedObjects}
          onSelect={onSelectObject}
          renderType={editorConfig.renderType}
        />
      ))}
    </>
  );
}

export default function Viewport({
  scene,
  selectedObjects,
  onSelectObject,
  onPhysicsCallbacks,
}: ViewportProps) {
  const { viewportCamera } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load scene into GameWorld when scene changes
  useEffect(() => {
    if (scene) {
      gameWorld.loadScene(scene);
    }
  }, [scene]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    
    const files = Array.from(event.dataTransfer.files);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          await useEditorStore.getState().importAssetFromData(file.name, arrayBuffer);
        } catch (error) {
          console.error('Failed to import texture:', error);
        }
      } else if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const assetReference = await useEditorStore.getState().importAssetFromData(file.name, arrayBuffer);
          
          // Calculate drop position in 3D space
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Simple projection to ground plane
            const dropPosition = { x: x * 5, y: 0, z: y * 5 };
            useEditorStore.getState().createMeshFromGLB(assetReference, dropPosition);
          }
        } catch (error) {
          console.error('Failed to import model:', error);
        }
      }
    }
  };

  if (!scene) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No scene loaded
      </div>
    );
  }

  const getShadowType = (shadowType: string) => {
    switch (shadowType) {
      case 'basic': return THREE.BasicShadowMap;
      case 'pcf': return THREE.PCFShadowMap;
      case 'pcfsoft': return THREE.PCFSoftShadowMap;
      case 'vsm': return THREE.VSMShadowMap;
      default: return THREE.PCFShadowMap;
    }
  };

  const getToneMapping = (toneMapping: string) => {
    switch (toneMapping) {
      case 'none': return NoToneMapping;
      case 'linear': return LinearToneMapping;
      case 'reinhard': return ReinhardToneMapping;
      case 'cineon': return CineonToneMapping;
      case 'aces': return ACESFilmicToneMapping;
      default: return ACESFilmicToneMapping;
    }
  };

  return (
    <div 
      className="w-full h-full relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Canvas
        ref={canvasRef}
        shadows
        camera={{
          position: [viewportCamera.position.x, viewportCamera.position.y, viewportCamera.position.z],
          rotation: [viewportCamera.rotation.x, viewportCamera.rotation.y, viewportCamera.rotation.z],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: scene.runtimeConfig.antialias,
          shadowMapEnabled: scene.runtimeConfig.shadowsEnabled,
          shadowMapType: getShadowType(scene.runtimeConfig.shadowType),
          toneMapping: getToneMapping(scene.runtimeConfig.toneMapping),
          toneMappingExposure: scene.runtimeConfig.exposure,
        }}
        style={{ background: scene.editorConfig.backgroundColor }}
      >
        <GameWorldProvider gameWorld={gameWorld}>
          <Suspense fallback={null}>
            <PhysicsProvider 
              scene={scene} 
              onObjectTransformUpdate={(objectId, transform) => {
                // Update via GameWorld instead of directly to store
                gameWorld.updateObjectTransform(objectId, transform);
              }}
              debugEnabled={scene.physicsWorld.debugRender.enabled}
            >
              <GameWorldUpdater />
              <PhysicsCallbackProvider onPhysicsCallbacks={onPhysicsCallbacks} />
              <CameraController scene={scene} />
              <SceneEffects scene={scene} />
              
              {/* {scene.runtimeConfig.environment && (
                <Environment files={scene.runtimeConfig.environment} />
              )} */}
              
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                target={[0, 0, 0]}
              />
              
              <SceneRenderer
                scene={scene}
                selectedObjects={selectedObjects}
                onSelectObject={onSelectObject}
              />
            </PhysicsProvider>
          </Suspense>
        </GameWorldProvider>
      </Canvas>
    </div>
  );
}
