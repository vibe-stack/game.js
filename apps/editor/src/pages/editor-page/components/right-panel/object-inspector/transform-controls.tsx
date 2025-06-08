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
    onUpdate({ rotation });
  };

  const handleScaleChange = (scale: Vector3) => {
    onUpdate({ scale });
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-muted pb-0">
        <h4 className="text-sm font-medium text-muted-foreground">Transform</h4>
      </div>

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
          value={transform.rotation}
          onChange={handleRotationChange}
          step={0.01}
          precision={3}
          suffix="rad"
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
    </div>
  );
} 