import React from 'react';
import { DragInput } from '@/components/ui/drag-input';

interface RotationSectionProps {
  rotation: [number, number, number]; // in radians
  onChange: (rotation: [number, number, number]) => void;
}

export function RotationSection({ rotation, onChange }: RotationSectionProps) {
  const handleAxisChange = (axis: 0 | 1 | 2, value: number) => {
    const newRotation = [...rotation] as [number, number, number];
    newRotation[axis] = value;
    onChange(newRotation);
  };

  // Convert radians to degrees for display
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  return (
    <div>
      <label className="text-xs text-gray-400 mb-2 block">Rotation (degrees)</label>
      <div className="grid grid-cols-3 gap-2">
        <DragInput
          label="X"
          value={toDegrees(rotation[0])}
          onChange={(value) => handleAxisChange(0, toRadians(value))}
          step={1}
          precision={1}
          className="text-xs"
        />
        <DragInput
          label="Y"
          value={toDegrees(rotation[1])}
          onChange={(value) => handleAxisChange(1, toRadians(value))}
          step={1}
          precision={1}
          className="text-xs"
        />
        <DragInput
          label="Z"
          value={toDegrees(rotation[2])}
          onChange={(value) => handleAxisChange(2, toRadians(value))}
          step={1}
          precision={1}
          className="text-xs"
        />
      </div>
    </div>
  );
} 