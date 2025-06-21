import React from "react";
import { Vector3Input } from "./vector3-input";

interface TransformSectionProps {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  onPositionChange: (position: { x: number; y: number; z: number }) => void;
  onRotationChange: (rotation: { x: number; y: number; z: number }) => void;
  onScaleChange: (scale: { x: number; y: number; z: number }) => void;
}

export function TransformSection({
  position,
  rotation,
  scale,
  onPositionChange,
  onRotationChange,
  onScaleChange,
}: TransformSectionProps) {
  // Convert radians to degrees for rotation display
  const rotationInDegrees = {
    x: rotation.x * (180 / Math.PI),
    y: rotation.y * (180 / Math.PI),
    z: rotation.z * (180 / Math.PI),
  };

  const handleRotationChange = (degrees: { x: number; y: number; z: number }) => {
    // Convert degrees back to radians
    const radians = {
      x: degrees.x * (Math.PI / 180),
      y: degrees.y * (Math.PI / 180),
      z: degrees.z * (Math.PI / 180),
    };
    onRotationChange(radians);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">Transform</h3>
      <div className="space-y-4">
        <Vector3Input
          label="Position"
          value={position}
          onChange={onPositionChange}
          step={0.1}
          precision={2}
        />
        
        <Vector3Input
          label="Rotation"
          value={rotationInDegrees}
          onChange={handleRotationChange}
          step={1}
          precision={1}
          suffix="°"
        />
        
        <Vector3Input
          label="Scale"
          value={scale}
          onChange={onScaleChange}
          step={0.1}
          precision={2}
          min={0.01}
        />
      </div>
    </div>
  );
} 