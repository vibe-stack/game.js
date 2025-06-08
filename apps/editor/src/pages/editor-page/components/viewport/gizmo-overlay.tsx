import React from "react";
import { TransformControls } from "@react-three/drei";

interface GizmoOverlayProps {
  selectedObject: GameObject;
  editorMode: string;
}

export default function GizmoOverlay({ selectedObject, editorMode }: GizmoOverlayProps) {
  const getMode = () => {
    switch (editorMode) {
      case "move":
        return "translate";
      case "rotate":
        return "rotate";
      case "scale":
        return "scale";
      default:
        return "translate";
    }
  };

  const { position, rotation, scale } = selectedObject.transform;

  return (
    <TransformControls
      mode={getMode() as any}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={[scale.x, scale.y, scale.z]}
      size={0.8}
      showX={true}
      showY={true}
      showZ={true}
      space="world"
    />
  );
} 