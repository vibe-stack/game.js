import React from "react";
import { DragInput } from "@/components/ui/drag-input";

interface Vector2ControlsProps {
  label: string;
  value: Vector2;
  onChange: (value: Vector2) => void;
  step?: number;
  precision?: number;
  min?: number;
  max?: number;
  suffix?: string;
}

export default function Vector2Controls({
  label,
  value,
  onChange,
  step = 0.01,
  precision = 2,
  min,
  max,
  suffix
}: Vector2ControlsProps) {
  const handleXChange = (x: number) => {
    onChange({ ...value, x });
  };

  const handleYChange = (y: number) => {
    onChange({ ...value, y });
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <DragInput
          label="X"
          value={value.x}
          onChange={handleXChange}
          step={step}
          precision={precision}
          min={min}
          max={max}
          suffix={suffix}
          compact
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
          compact
        />
      </div>
    </div>
  );
} 