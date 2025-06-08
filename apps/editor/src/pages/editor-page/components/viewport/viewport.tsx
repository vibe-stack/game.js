import React, { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { ACESFilmicToneMapping, LinearToneMapping, ReinhardToneMapping, CineonToneMapping, NoToneMapping } from "three";
import SceneObject from "./scene-object";
import { PhysicsProvider, usePhysics } from "./physics/physics-context";
import useEditorStore from "@/stores/editor-store";

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
    if (gl && 'physicallyCorrectLights' in gl) {
      // gl.physicallyCorrectLights = scene.runtimeConfig.physicallyCorrectLights;
    }
  }, [gl, scene.runtimeConfig.physicallyCorrectLights]);
  
  return null;
}

function PhysicsCallbackProvider({ onPhysicsCallbacks }: { onPhysicsCallbacks?: ViewportProps['onPhysicsCallbacks'] }) {
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
  const { updateObjectTransform } = useEditorStore();

  if (!scene) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <p className="text-muted-foreground">No scene loaded</p>
      </div>
    );
  }

  const getShadowType = (shadowType: string) => {
    switch (shadowType) {
      case 'pcf': return 'percentage';
      case 'pcfsoft': return 'soft';
      case 'vsm': return 'variance';
      default: return 'basic';
    }
  };

  const getToneMapping = (toneMapping: string) => {
    switch (toneMapping) {
      case 'linear': return LinearToneMapping;
      case 'reinhard': return ReinhardToneMapping;
      case 'cineon': return CineonToneMapping;
      case 'aces': return ACESFilmicToneMapping;
      default: return NoToneMapping;
    }
  };

  const shadowConfig = scene.runtimeConfig.shadowsEnabled 
    ? getShadowType(scene.runtimeConfig.shadowType)
    : false;

  const renderLightHelpers = () => {
    if (!scene.editorConfig.showLights) return null;
    
    return scene.objects
      .filter(obj => obj.components.some(comp => comp.type.includes('Light')))
      .map(light => {
        const lightComponent = light.components.find(comp => comp.type.includes('Light'));
        if (!lightComponent) return null;

        const position = [light.transform.position.x, light.transform.position.y, light.transform.position.z] as [number, number, number];
        
        switch (lightComponent.type) {
          case 'DirectionalLight':
            return (
              <mesh key={`${light.id}-helper`} position={position}>
                <coneGeometry args={[0.2, 0.5, 8]} />
                <meshBasicMaterial color="#ffff00" wireframe />
              </mesh>
            );
          case 'PointLight':
            return (
              <mesh key={`${light.id}-helper`} position={position}>
                <sphereGeometry args={[0.2, 8, 6]} />
                <meshBasicMaterial color="#ffff00" wireframe />
              </mesh>
            );
          case 'SpotLight':
            return (
              <mesh key={`${light.id}-helper`} position={position}>
                <coneGeometry args={[0.3, 0.6, 8]} />
                <meshBasicMaterial color="#ffff00" wireframe />
              </mesh>
            );
          default:
            return null;
        }
      });
  };

  const renderCameraHelpers = () => {
    if (!scene.editorConfig.showCameras) return null;
    
    return scene.objects
      .filter(obj => obj.components.some(comp => comp.type.includes('Camera')))
      .map(camera => (
        <mesh 
          key={`${camera.id}-helper`}
          position={[
            camera.transform.position.x,
            camera.transform.position.y,
            camera.transform.position.z
          ]}
        >
          <boxGeometry args={[0.5, 0.3, 0.8]} />
          <meshBasicMaterial color="#00ffff" wireframe />
        </mesh>
      ));
  };

  return (
    <div
      className="h-screen"
      style={{ backgroundColor: scene.editorConfig.backgroundColor }}
    >
      <Canvas 
        camera={{ position: [0, 5, 10], fov: 75 }}
        shadows={shadowConfig}
        gl={{
          antialias: scene.runtimeConfig.antialias,
          toneMapping: getToneMapping(scene.runtimeConfig.toneMapping),
          toneMappingExposure: scene.runtimeConfig.exposure,
        }}
      >
        <PhysicsProvider scene={scene} onObjectTransformUpdate={updateObjectTransform}>
          <PhysicsCallbackProvider onPhysicsCallbacks={onPhysicsCallbacks} />
          <SceneEffects scene={scene} />
          
          {/* Fog */}
          {scene.editorConfig.enableFog && (
            <fog
              attach="fog"
              args={[scene.editorConfig.fogColor, scene.editorConfig.fogNear, scene.editorConfig.fogFar]}
            />
          )}

          {/* Environment */}
          {scene.runtimeConfig.environment !== 'none' && (
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

          {/* Light Helpers */}
          {renderLightHelpers()}

          {/* Camera Helpers */}
          {renderCameraHelpers()}

          {/* Grid */}
          {scene.editorConfig.showHelperGrid && (
            <Grid
              args={[
                scene.editorConfig.gridSize * 20,
                scene.editorConfig.gridSize * 20,
              ]}
              cellSize={scene.editorConfig.gridSize}
              cellColor="#666666"
              sectionColor="#999999"
              fadeDistance={100}
              fadeStrength={1}
            />
          )}

          <OrbitControls enablePan enableZoom enableRotate makeDefault />
        </PhysicsProvider>
      </Canvas>
    </div>
  );
}
