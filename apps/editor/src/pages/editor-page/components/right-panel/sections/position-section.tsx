import React from 'react';
import { DragInput } from '@/components/ui/drag-input';

interface PositionSectionProps {
  position: [number, number, number];
  onChange: (position: [number, number, number]) => void;
}

export function PositionSection({ position, onChange }: PositionSectionProps) {
  const handleAxisChange = (axis: 0 | 1 | 2, value: number) => {
    const newPosition = [...position] as [number, number, number];
    newPosition[axis] = value;
    onChange(newPosition);
  };

  return (
    <div>
      <label className="text-xs text-gray-400 mb-2 block">Position</label>
      <div className="grid grid-cols-3 gap-2">
        <DragInput
          label="X"
          value={position[0]}
          onChange={(value) => handleAxisChange(0, value)}
          step={0.1}
          precision={2}
          className="text-xs"
        />
        <DragInput
          label="Y"
          value={position[1]}
          onChange={(value) => handleAxisChange(1, value)}
          step={0.1}
          precision={2}
          className="text-xs"
        />
        <DragInput
          label="Z"
          value={position[2]}
          onChange={(value) => handleAxisChange(2, value)}
          step={0.1}
          precision={2}
          className="text-xs"
        />
      </div>
    </div>
  );
} 