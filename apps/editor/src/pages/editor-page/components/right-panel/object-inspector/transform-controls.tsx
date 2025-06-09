import React from "react";
import Vector3Controls from "./vector3-controls";

interface TransformControlsProps {
  transform: Transform;
  onUpdate: (transform: Partial<Transform>) => void;
}

export default function TransformControls({ transform, onUpdate }: TransformControlsProps) {
  const handlePositionChange = (position: Vector3) => {
    onUpdate({ position });
  };

  const handleRotationChange = (rotation: Vector3) => {
    onUpdate({ rotation: {
      x: d2r(rotation.x),
      y: d2r(rotation.y),
      z: d2r(rotation.z),
    } });
  };

  const handleScaleChange = (scale: Vector3) => {
    onUpdate({ scale });
  };

  return (
    <div className="space-y-3">
      <Vector3Controls
        label="Position"
        value={transform.position}
        onChange={handlePositionChange}
        step={0.1}
        precision={2}
      />

      <Vector3Controls
        label="Rotation"
        value={{
          x: r2d(transform.rotation.x),
          y: r2d(transform.rotation.y),
          z: r2d(transform.rotation.z),
        }}
        onChange={handleRotationChange}
        step={1}
        precision={0}
        suffix="°"
      />

      <Vector3Controls
        label="Scale"
        value={transform.scale}
        onChange={handleScaleChange}
        step={0.01}
        precision={2}
        min={0.001}
      />
    </div>
  );
} 

const r2d = (deg: number) => {
  return (deg * 180) / Math.PI;
}

const d2r = (rad: number) => {
  return (rad * Math.PI) / 180;
}