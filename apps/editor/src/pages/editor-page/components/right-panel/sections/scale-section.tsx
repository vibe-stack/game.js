import React from 'react';
import { DragInput } from '@/components/ui/drag-input';

interface ScaleSectionProps {
  scale: [number, number, number];
  onChange: (scale: [number, number, number]) => void;
}

export function ScaleSection({ scale, onChange }: ScaleSectionProps) {
  const handleAxisChange = (axis: 0 | 1 | 2, value: number) => {
    const newScale = [...scale] as [number, number, number];
    newScale[axis] = value;
    onChange(newScale);
  };

  return (
    <div>
      <label className="text-xs text-gray-400 mb-2 block">Scale</label>
      <div className="grid grid-cols-3 gap-2">
        <DragInput
          label="X"
          value={scale[0]}
          onChange={(value) => handleAxisChange(0, value)}
          step={0.1}
          precision={2}
          min={0.01}
          className="text-xs"
        />
        <DragInput
          label="Y"
          value={scale[1]}
          onChange={(value) => handleAxisChange(1, value)}
          step={0.1}
          precision={2}
          min={0.01}
          className="text-xs"
        />
        <DragInput
          label="Z"
          value={scale[2]}
          onChange={(value) => handleAxisChange(2, value)}
          step={0.1}
          precision={2}
          min={0.01}
          className="text-xs"
        />
      </div>
    </div>
  );
} 