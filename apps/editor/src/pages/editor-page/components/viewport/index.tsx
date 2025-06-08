import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";

interface SceneObjectProps {
  obj: GameObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SceneObject({ obj, isSelected, onSelect }: SceneObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pos = obj.transform.position;
  const rot = obj.transform.rotation;
  const scale = obj.transform.scale;

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(pos.x, pos.y, pos.z);
      meshRef.current.rotation.set(rot.x, rot.y, rot.z);
      meshRef.current.scale.set(scale.x, scale.y, scale.z);
    }
  });

  return (
    <mesh
      ref={meshRef}
      onClick={() => onSelect(obj.id)}
      position={[pos.x, pos.y, pos.z]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={isSelected ? "yellow" : "orange"} 
        wireframe={isSelected}
      />
    </mesh>
  );
}

interface ViewportProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (id: string) => void;
}

export default function Viewport({ scene, selectedObjects, onSelectObject }: ViewportProps) {
  if (!scene) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <p className="text-muted-foreground">No scene loaded</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Canvas camera={{ position: [0, 5, 10], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        
        {scene.objects.map((obj) => (
          <SceneObject
            key={obj.id}
            obj={obj}
            isSelected={selectedObjects.includes(obj.id)}
            onSelect={onSelectObject}
          />
        ))}
        
        {scene.editorConfig.showHelperGrid && (
          <Grid 
            args={[20, 20]}
            cellSize={scene.editorConfig.gridSize}
            cellColor="gray"
            sectionColor="darkgray"
          />
        )}
        
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
} 