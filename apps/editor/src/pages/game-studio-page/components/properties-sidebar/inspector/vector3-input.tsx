import React from "react";
import { Label } from "@/components/ui/label";
import { DragInput } from "@/components/ui/drag-input";

interface Vector3InputProps {
  label: string;
  value: { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
  step?: number;
  precision?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
}

export function Vector3Input({
  label,
  value,
  onChange,
  step = 0.1,
  precision = 2,
  min,
  max,
  suffix,
  disabled = false,
}: Vector3InputProps) {
  const handleAxisChange = (axis: 'x' | 'y' | 'z', newValue: number) => {
    onChange({
      ...value,
      [axis]: newValue,
    });
  };

  return (
    <div className="space-y-2">
      <Label className="text-gray-300 text-xs">{label}</Label>
      <div className="space-y-1 flex flex-row gap-1">
        <DragInput
          label="X"
          value={value.x}
          onChange={(newValue) => handleAxisChange('x', newValue)}
          step={step}
          precision={precision}
          min={min}
          max={max}
          suffix={suffix}
          disabled={disabled}
          compact
          className="text-xs"
        />
        <DragInput
          label="Y"
          value={value.y}
          onChange={(newValue) => handleAxisChange('y', newValue)}
          step={step}
          precision={precision}
          min={min}
          max={max}
          suffix={suffix}
          disabled={disabled}
          compact
          className="text-xs"
        />
        <DragInput
          label="Z"
          value={value.z}
          onChange={(newValue) => handleAxisChange('z', newValue)}
          step={step}
          precision={precision}
          min={min}
          max={max}
          suffix={suffix}
          disabled={disabled}
          compact
          className="text-xs"
        />
      </div>
    </div>
  );
} 