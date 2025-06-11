import React, { Suspense, useEffect, useRef } from "react";
import { Canvas, extend, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  LinearToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  NoToneMapping,
} from "three";
import SceneObject from "./scene-object";
import { PhysicsProvider, usePhysics } from "./physics/physics-context";
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

function CameraController({ scene }: { scene: GameScene }) {
  const { camera, controls, scene: threeScene } = useThree();
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
      // During physics, get live transforms from the Three.js scene graph
      // During non-physics, use GameObject transforms
      if (physicsState === 'playing') {
        // Find the camera object in the Three.js scene by traversing the scene graph
        const findCameraInThreeScene = (object: THREE.Object3D, targetId: string): THREE.Object3D | null => {
          // Check if this object has the target ID (stored in userData)
          if (object.userData?.objectId === targetId) {
            return object;
          }
          
          // Search children
          for (const child of object.children) {
            const found = findCameraInThreeScene(child, targetId);
            if (found) return found;
          }
          
          return null;
        };
        
        const cameraObject = findCameraInThreeScene(threeScene, scene.activeCamera);
        if (cameraObject) {
          // Get the world matrix from the live Three.js object
          cameraObject.updateMatrixWorld(true);
          const worldMatrix = cameraObject.matrixWorld;
          
          // Extract world position and rotation
          const worldPosition = new THREE.Vector3();
          const worldRotation = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          worldMatrix.decompose(worldPosition, worldRotation, worldScale);
          
          // Apply to the viewport camera
          camera.position.copy(worldPosition);
          camera.quaternion.copy(worldRotation);
          camera.updateMatrixWorld();
        }
      } else {
        // During non-physics, use the GameObject transforms (existing logic)
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
        if (result) {
          const { worldMatrix } = result;
          
          // Extract world position and rotation from the world matrix
          const worldPosition = new THREE.Vector3();
          const worldRotation = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          worldMatrix.decompose(worldPosition, worldRotation, worldScale);
          
          // Apply to the viewport camera
          camera.position.copy(worldPosition);
          camera.quaternion.copy(worldRotation);
          camera.updateMatrixWorld();
        }
      }
    }
  });
  
  return null;
}

export default function Viewport({
  scene,
  selectedObjects,
  onSelectObject,
  onPhysicsCallbacks,
}: ViewportProps) {
  const { updateObjectTransform, physicsState, importAssetFromData, createMeshFromGLB, setPhysicsState, viewportMode } = useEditorStore();
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousSceneIdRef = useRef<string | null>(null);

  // Only stop physics when scene ID actually changes, not on every render
  useEffect(() => {
    const currentSceneId = scene?.id || null;
    const previousSceneId = previousSceneIdRef.current;
    
    // Only stop physics if the scene ID has actually changed
    if (previousSceneId !== null && currentSceneId !== previousSceneId && physicsState === 'playing') {
      setPhysicsState('stopped');
    }
    
    previousSceneIdRef.current = currentSceneId;
  }, [scene?.id, setPhysicsState, physicsState]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    
    const files = event.dataTransfer.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const fileName = file.name.toLowerCase();
      
      // Only handle GLB files for direct mesh creation
      if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
        try {
          // Read file data
          const fileData = await file.arrayBuffer();
          
          // Import the asset first
          const assetReference = await importAssetFromData(file.name, fileData);
          
          // Calculate drop position (simplified - drop at center for now)
          // In a more advanced implementation, you could calculate the 3D position
          // based on the mouse position and camera view
          const position = { x: 0, y: 0, z: 0 };
          
          // Create mesh from GLB
          createMeshFromGLB(assetReference, position);
        } catch (error) {
          console.error('Failed to create mesh from dropped GLB:', error);
        }
      }
    }
  };

  if (!scene) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <p className="text-muted-foreground">No scene loaded</p>
      </div>
    );
  }

  const getShadowType = (shadowType: string) => {
    switch (shadowType) {
      case "pcf":
        return "percentage";
      case "pcfsoft":
        return "soft";
      case "vsm":
        return "variance";
      default:
        return "basic";
    }
  };

  const getToneMapping = (toneMapping: string) => {
    switch (toneMapping) {
      case "linear":
        return LinearToneMapping;
      case "reinhard":
        return ReinhardToneMapping;
      case "cineon":
        return CineonToneMapping;
      case "aces":
        return ACESFilmicToneMapping;
      default:
        return NoToneMapping;
    }
  };

  const shadowConfig = scene.runtimeConfig.shadowsEnabled
    ? getShadowType(scene.runtimeConfig.shadowType)
    : false;

  // Hide helpers when physics is playing
  const shouldShowHelpers = physicsState !== "playing";

  return (
    <div
      ref={viewportRef}
      className="h-screen"
      style={{ backgroundColor: scene.editorConfig.backgroundColor }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Canvas
        key={scene.id} // Force complete Canvas remount when scene changes
        camera={{ position: [0, 25, 80], fov: 75 }}
        shadows={shadowConfig}
        // gl={{
        //   antialias: scene.runtimeConfig.antialias,
        //   toneMapping: getToneMapping(scene.runtimeConfig.toneMapping),
        //   toneMappingExposure: scene.runtimeConfig.exposure,
        // }}
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer({
            ...(props as any),
            antialias: scene.runtimeConfig.antialias,
            toneMapping: getToneMapping(scene.runtimeConfig.toneMapping),
            toneMappingExposure: scene.runtimeConfig.exposure,
          })
          await renderer.init()
          
          // WebGPU-specific shadow configuration
          if (renderer.shadowMap) {
            renderer.shadowMap.enabled = scene.runtimeConfig.shadowsEnabled;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better for WebGPU
          }
          
          return renderer
        }}
      >
        <Suspense>
          <PhysicsProvider
            key={scene.id}
            scene={scene}
            onObjectTransformUpdate={updateObjectTransform}
            debugEnabled={
              shouldShowHelpers && scene.physicsWorld?.debugRender?.enabled
            }
          >
            <PhysicsCallbackProvider onPhysicsCallbacks={onPhysicsCallbacks} />
            <SceneEffects scene={scene} />
            <CameraController scene={scene} />

            {/* Fog */}
            {scene.editorConfig.enableFog && (
              <fog
                attach="fog"
                args={[
                  scene.editorConfig.fogColor,
                  scene.editorConfig.fogNear,
                  scene.editorConfig.fogFar,
                ]}
              />
            )}

            {/* Environment */}
            {scene.runtimeConfig.environment !== "none" && (
              <Environment preset={scene.runtimeConfig.environment as any} />
            )}

            {/* Scene Objects */}
            <group>
              {scene.objects.map((obj) => (
                <SceneObject
                  key={obj.id}
                  obj={obj}
                  selectedObjects={selectedObjects}
                  onSelect={onSelectObject}
                  renderType={scene.editorConfig.renderType}
                />
              ))}
            </group>

            {/* Grid */}
            {shouldShowHelpers && scene.editorConfig.showHelperGrid && (
              <Grid2
                args={[scene.editorConfig.gridSize * 20, scene.editorConfig.gridSize * 20]}
                cellColor="#666666"
                sectionColor="#111111"
                fadeDistance={500}
                fadeStrength={0.6}
              />
            )}

            {viewportMode === 'orbit' && (
              <OrbitControls enablePan enableZoom enableRotate makeDefault />
            )}
          </PhysicsProvider>
        </Suspense>
      </Canvas>
    </div>
  );
}
