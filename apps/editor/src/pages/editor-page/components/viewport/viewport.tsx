import React, { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
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
// import WebGPUGrid from "./components/webgpu-grid";
// import * as THREE from "three/webgpu";

// extend(THREE as any)
interface ViewportProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (id: string) => void;
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

export default function Viewport({
  scene,
  selectedObjects,
  onSelectObject,
  onPhysicsCallbacks,
}: ViewportProps) {
  const { updateObjectTransform, physicsState } = useEditorStore();

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
      className="h-screen"
      style={{ backgroundColor: scene.editorConfig.backgroundColor }}
    >
      <Canvas
        camera={{ position: [0, 25, 80], fov: 75 }}
        shadows={shadowConfig}
        gl={{
          antialias: scene.runtimeConfig.antialias,
          toneMapping: getToneMapping(scene.runtimeConfig.toneMapping),
          toneMappingExposure: scene.runtimeConfig.exposure,
        }}
        // gl={async (props) => {
        //   const renderer = new THREE.WebGPURenderer({
        //     ...(props as any),
        //     antialias: scene.runtimeConfig.antialias,
        //     toneMapping: getToneMapping(scene.runtimeConfig.toneMapping),
        //     toneMappingExposure: scene.runtimeConfig.exposure,
        //   })
        //   await renderer.init()
        //   return renderer
        // }}
      >
        <Suspense>
          <PhysicsProvider
            scene={scene}
            onObjectTransformUpdate={updateObjectTransform}
            debugEnabled={
              shouldShowHelpers && scene.physicsWorld?.debugRender?.enabled
            }
          >
            <PhysicsCallbackProvider onPhysicsCallbacks={onPhysicsCallbacks} />
            <SceneEffects scene={scene} />

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
              <Grid
                // cellSize={scene.editorConfig.gridSize * 20}
                // sectionSize={scene.editorConfig.gridSize * 20}
                args={[scene.editorConfig.gridSize * 20, scene.editorConfig.gridSize * 20]}
                cellColor="#666666"
                sectionColor="#111111"
                fadeDistance={500}
                fadeStrength={0.6}
              />
            )}

            <OrbitControls enablePan enableZoom enableRotate makeDefault />
          </PhysicsProvider>
        </Suspense>
      </Canvas>
    </div>
  );
}
