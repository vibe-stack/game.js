import React, { Suspense, useEffect, useRef } from "react";
import { Canvas, extend, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  LinearToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  NoToneMapping,
} from "three";
import { PhysicsProvider } from "./physics/physics-context";
import { GameWorldProvider } from "@/services/game-world-context";
import { gameWorld } from "@/services/game-world";
import useEditorStore from "@/stores/editor-store";
// import WebGPUGrid from "./components/webgpu-grid";
import * as THREE from "three/webgpu";
import { GameWorldUpdater } from "./components/game-world-updater";
import { PhysicsCallbackProvider } from "./components/physics-callback-provider";
import { CameraController } from "./components/camera-controller";
import { SceneRenderer } from "./components/scene-renderer";
import { SceneCapturer } from "./components/scene-capturer";

extend(THREE as any);

export interface ViewportProps {
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

export default function Viewport({
  scene,
  selectedObjects,
  onSelectObject,
  onPhysicsCallbacks,
}: ViewportProps) {
  const { viewportCamera, setSelectedObjects } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load scene into GameWorld when scene changes, but only if NOT updating from GameWorld
  useEffect(() => {
    if (scene) {
      gameWorld.loadScene(scene);

      // CRITICAL FIX: Create a scene snapshot on initial load
      // This ensures proper state synchronization like the play/stop cycle does
      // Without this, there can be flashing on initial load due to uninitialized state
      gameWorld.createSceneSnapshot();
    }
  }, [scene]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();

    const files = Array.from(event.dataTransfer.files);

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          await useEditorStore
            .getState()
            .importAssetFromData(file.name, arrayBuffer);
        } catch (error) {
          console.error("Failed to import texture:", error);
        }
      } else if (file.name.endsWith(".glb") || file.name.endsWith(".gltf")) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const assetReference = await useEditorStore
            .getState()
            .importAssetFromData(file.name, arrayBuffer);

          // Calculate drop position in 3D space
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Simple projection to ground plane
            const dropPosition = { x: x * 5, y: 0, z: y * 5 };
            useEditorStore
              .getState()
              .createMeshFromGLB(assetReference, dropPosition);
          }
        } catch (error) {
          console.error("Failed to import model:", error);
        }
      }
    }
  };

  if (!scene) {
    return (
      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
        No scene loaded
      </div>
    );
  }

  const getShadowType = (shadowType: string) => {
    switch (shadowType) {
      case "basic":
        return THREE.BasicShadowMap;
      case "pcf":
        return THREE.PCFShadowMap;
      case "pcfsoft":
        return THREE.PCFSoftShadowMap;
      case "vsm":
        return THREE.VSMShadowMap;
      default:
        return THREE.PCFShadowMap;
    }
  };

  const getToneMapping = (toneMapping: string) => {
    switch (toneMapping) {
      case "none":
        return NoToneMapping;
      case "linear":
        return LinearToneMapping;
      case "reinhard":
        return ReinhardToneMapping;
      case "cineon":
        return CineonToneMapping;
      case "aces":
        return ACESFilmicToneMapping;
      default:
        return ACESFilmicToneMapping;
    }
  };

  return (
    <div
      className="relative h-full w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Canvas
        ref={canvasRef}
        shadows
        camera={{
          position: [
            viewportCamera.position.x,
            viewportCamera.position.y,
            viewportCamera.position.z,
          ],
          rotation: [
            viewportCamera.rotation.x,
            viewportCamera.rotation.y,
            viewportCamera.rotation.z,
          ],
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
            <SceneCapturer />
            <PhysicsProvider
              scene={scene}
              // onObjectTransformUpdate={(objectId, transform) => {
              //   // Update via GameWorld instead of directly to store
              //   gameWorld.updateObjectTransform(objectId, transform);
              // }}
              debugEnabled={scene.physicsWorld.debugRender.enabled}
            >
              <GameWorldUpdater />
              <PhysicsCallbackProvider
                onPhysicsCallbacks={onPhysicsCallbacks}
              />
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
                makeDefault
              />
              <group
                onPointerMissed={() => {
                  setSelectedObjects([]);
                }}
              >
                <SceneRenderer
                  scene={scene}
                  selectedObjects={selectedObjects}
                  onSelectObject={onSelectObject}
                />
              </group>
            </PhysicsProvider>
          </Suspense>
        </GameWorldProvider>
      </Canvas>
    </div>
  );
}
