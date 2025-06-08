import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import SceneObject from "./scene-object";

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
    <div 
      className="h-screen" 
      style={{ backgroundColor: scene.editorConfig.backgroundColor }}
    >
      <Canvas camera={{ position: [0, 5, 10], fov: 75 }}>
        {scene.objects.map((obj) => (
          <SceneObject
            key={obj.id}
            obj={obj}
            selectedObjects={selectedObjects}
            onSelect={onSelectObject}
          />
        ))}
        
        {scene.editorConfig.showHelperGrid && (
          <Grid 
            args={[scene.editorConfig.gridSize * 20, scene.editorConfig.gridSize * 20]}
            cellSize={scene.editorConfig.gridSize}
            cellColor="#666666"
            sectionColor="#999999"
            fadeDistance={100}
            fadeStrength={1}
          />
        )}
        
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
} 