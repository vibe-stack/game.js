import React from "react";
import { DragInput } from "@/components/ui/drag-input";

interface Vector3ControlsProps {
  label: string;
  value: Vector3;
  onChange: (value: Vector3) => void;
  step?: number;
  precision?: number;
  min?: number;
  max?: number;
  suffix?: string;
}

export default function Vector3Controls({
  label,
  value,
  onChange,
  step = 0.01,
  precision = 2,
  min,
  max,
  suffix
}: Vector3ControlsProps) {
  const handleXChange = (x: number) => {
    onChange({ ...value, x });
  };

  const handleYChange = (y: number) => {
    onChange({ ...value, y });
  };

  const handleZChange = (z: number) => {
    onChange({ ...value, z });
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        <DragInput
          label="X"
          value={value.x}
          onChange={handleXChange}
          step={step}
          precision={precision}
          min={min}
          max={max}
          suffix={suffix}
        />
        <DragInput
          label="Y"
          value={value.y}
          onChange={handleYChange}
          step={step}
          precision={precision}
          min={min}
          max={max}
          suffix={suffix}
        />
        <DragInput
          label="Z"
          value={value.z}
          onChange={handleZChange}
          step={step}
          precision={precision}
          min={min}
          max={max}
          suffix={suffix}
        />
      </div>
    </div>
  );
} 