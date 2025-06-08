import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import SceneObject from "./scene-object";
import useEditorStore from "@/stores/editor-store";
import GizmoOverlay from "./gizmo-overlay";

interface ViewportProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (id: string) => void;
}

export default function Viewport({
  scene,
  selectedObjects,
  onSelectObject,
}: ViewportProps) {
  const { editorMode } = useEditorStore();

  // Find the selected object in the scene
  const selectedObject = useMemo(() => {
    if (!scene || selectedObjects.length === 0) return null;

    const findObjectById = (
      objects: GameObject[],
      id: string,
    ): GameObject | null => {
      for (const obj of objects) {
        if (obj.id === id) return obj;
        const found = findObjectById(obj.children, id);
        if (found) return found;
      }
      return null;
    };

    return findObjectById(scene.objects, selectedObjects[0]);
  }, [scene, selectedObjects]);

  if (!scene) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
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

        {/* Gizmo for selected object */}
        {selectedObject && editorMode !== "select" && (
          <GizmoOverlay
            selectedObject={selectedObject}
            editorMode={editorMode}
          />
        )}
      </Canvas>
    </div>
  );
}
